import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

const filters = ["All", "New", "Existing"];

const AdminConsultations = () => {
  const { tenantId } = useTenant();
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ["consultations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          *,
          booking:bookings!consultations_booking_id_fkey(
            booking_date, start_time, guest_name, guest_email, guest_phone,
            client:profiles!bookings_client_id_fkey(full_name, email, phone),
            items:booking_items(service_name, price, sort_order)
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = consultations.filter((c: any) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "New") return c.client_type === "new";
    return c.client_type === "existing";
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
              ${activeFilter === f ? "bg-white/[0.12] text-white border border-white/[0.15]" : "text-white/35 border border-white/[0.06] hover:text-white/60"}`}>
            {f}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"}`}>
              {activeFilter === f ? filtered.length : consultations.filter((c: any) => f === "All" ? true : f === "New" ? c.client_type === "new" : c.client_type === "existing").length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">No consultation forms yet.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c: any) => {
            const isExpanded = expandedId === c.id;
            const booking = c.booking;
            const client = booking?.client;

            const displayName  = client?.full_name  || booking?.guest_name  || "Unknown";
            const displayEmail = client?.email       || booking?.guest_email || null;
            const displayPhone = client?.phone       || booking?.guest_phone || null;

            const services: { service_name: string; price: number; sort_order: number }[] =
              (booking?.items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{displayName}</p>
                    <p className="text-[11px] text-white/40">{booking?.booking_date} • {c.client_type === "new" ? "New Client" : "Existing"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.client_type === "new" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {c.client_type}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                </div>

                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-white/[0.06]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">

                      {/* Contact */}
                      {displayEmail && (
                        <div>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-0.5">Email</p>
                          <p className="text-xs text-white/70">{displayEmail}</p>
                        </div>
                      )}
                      {displayPhone && (
                        <div>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-0.5">Phone</p>
                          <p className="text-xs text-white/70">{displayPhone}</p>
                        </div>
                      )}

                      {/* Services booked — full width */}
                      {services.length > 0 && (
                        <div className="col-span-1 sm:col-span-2">
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1">Services Booked</p>
                          <div className="flex flex-col gap-0.5">
                            {services.map((s) => (
                              <div key={s.sort_order} className="flex justify-between items-baseline">
                                <p className="text-xs text-white/70">{s.service_name}</p>
                                <p className="text-xs text-white/40 ml-4">R{s.price}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Consultation fields — no lead_source, no call_out_address */}
                      {[
                        { label: "Skin Conditions",   value: c.skin_conditions },
                        { label: "Medications",        value: c.medications },
                        { label: "Allergies",           value: c.allergies },
                        { label: "Health Conditions",  value: c.health_conditions },
                        { label: "Pregnancy",           value: c.pregnancy },
                        { label: "Environmental",       value: c.environmental_exposure },
                        { label: "Physical Factors",    value: c.physical_factors },
                        { label: "Hair Length OK",      value: c.hair_length_ok },
                        { label: "Additional Notes",   value: c.additional_notes },
                      ].filter(f => f.value && f.value !== "On File" && f.value !== "None reported").map(f => (
                        <div key={f.label}>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-0.5">{f.label}</p>
                          <p className="text-xs text-white/70">{f.value}</p>
                        </div>
                      ))}

                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminConsultations;
