import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2, ChevronDown, ChevronUp, Search, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const filters = ["All", "New", "Existing"];

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function exportCSV(rows: any[]) {
  const headers = [
    "Name", "Email", "Phone", "Date", "Time", "Type", "Services",
    "Skin Conditions", "Medications", "Allergies", "Health Conditions",
    "Pregnancy", "Environmental Exposure", "Physical Factors",
    "Hair Length OK", "Additional Notes", "Form Submitted",
  ];
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((c: any) => {
      const booking = c.booking;
      const client = booking?.client;
      const name  = client?.full_name  || booking?.guest_name  || "";
      const email = client?.email       || booking?.guest_email || "";
      const phone = client?.phone       || booking?.guest_phone || "";
      const services = (booking?.items ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((s: any) => `${s.service_name} (R${s.price})`)
        .join("; ");
      return [
        name, email, phone,
        booking?.booking_date ?? "",
        fmtTime(booking?.start_time) ?? "",
        c.client_type ?? "",
        services,
        c.skin_conditions ?? "", c.medications ?? "", c.allergies ?? "",
        c.health_conditions ?? "", c.pregnancy ?? "",
        c.environmental_exposure ?? "", c.physical_factors ?? "",
        c.hair_length_ok ?? "", c.additional_notes ?? "",
        c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
      ].map(escape).join(",");
    }),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `consultations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── component ──────────────────────────────────────────────────────────────

const AdminConsultations = () => {
  const { tenantId } = useTenant();
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [search, setSearch]             = useState("");

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

  const filterCount = (f: string) =>
    consultations.filter((c: any) =>
      f === "All" ? true : f === "New" ? c.client_type === "new" : c.client_type === "existing"
    ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultations.filter((c: any) => {
      const booking = c.booking;
      const client  = booking?.client;
      const name    = (client?.full_name || booking?.guest_name || "").toLowerCase();
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "New"      && c.client_type === "new") ||
        (activeFilter === "Existing" && c.client_type === "existing");
      const matchesSearch = !q || name.includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [consultations, activeFilter, search]);

  return (
    <div className="flex flex-col gap-4">

      {/* ── top bar: filters + search + export ── */}
      <div className="flex flex-col gap-3">
        {/* filters row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
                  ${activeFilter === f
                    ? "bg-white/[0.12] text-white border border-white/[0.15]"
                    : "text-white/35 border border-white/[0.06] hover:text-white/60"
                  }`}
              >
                {f}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === f ? "bg-white/10" : "bg-white/[0.04]"}`}>
                  {filterCount(f)}
                </span>
              </button>
            ))}
          </div>

          {/* export */}
          {filtered.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 border border-white/[0.07] hover:text-white/80 hover:border-white/20 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        {/* search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by client name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-xs text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* ── list ── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center"
        >
          <p className="text-sm text-white/30">
            {search ? "No consultations match your search." : "No consultation forms yet."}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c: any) => {
            const isExpanded   = expandedId === c.id;
            const booking      = c.booking;
            const client       = booking?.client;
            const displayName  = client?.full_name  || booking?.guest_name  || "Unknown";
            const displayEmail = client?.email       || booking?.guest_email || null;
            const displayPhone = client?.phone       || booking?.guest_phone || null;

            const services: { service_name: string; price: number; sort_order: number }[] =
              (booking?.items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

            const timeLabel = fmtTime(booking?.start_time);

            const submittedAgo = c.created_at
              ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true })
              : null;

            // health fields — only render if non-null / non-empty
            const healthFields = [
              { label: "Allergies",             value: c.allergies },
              { label: "Skin Conditions",       value: c.skin_conditions },
              { label: "Health Conditions",     value: c.health_conditions },
              { label: "Medications",           value: c.medications },
              { label: "Pregnancy",             value: c.pregnancy },
            ].filter((f) => f.value);

            const lifestyleFields = [
              { label: "Physical Factors",      value: c.physical_factors },
              { label: "Environmental Exposure",value: c.environmental_exposure },
              { label: "Hair Length OK",        value: c.hair_length_ok },
            ].filter((f) => f.value);

            const hasConsultationData =
              healthFields.length > 0 ||
              lifestyleFields.length > 0 ||
              c.additional_notes;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
              >
                {/* ── row header ── */}
                <div
                  className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{displayName}</p>
                    <p className="text-[11px] text-white/40">
                      {booking?.booking_date}
                      {timeLabel && <> · {timeLabel}</>}
                      {" · "}
                      {c.client_type === "new" ? "New Client" : "Existing"}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.client_type === "new" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {c.client_type}
                  </span>
                  {isExpanded
                    ? <ChevronUp   className="w-4 h-4 text-white/20" />
                    : <ChevronDown className="w-4 h-4 text-white/20" />
                  }
                </div>

                {/* ── expanded detail ── */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-5 pt-1 border-t border-white/[0.06] flex flex-col gap-5">

                    {/* form submitted timestamp */}
                    {submittedAgo && (
                      <p className="text-[10px] text-white/25 mt-2">Form submitted {submittedAgo}</p>
                    )}

                    {/* Contact */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-2">Contact</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {displayEmail && (
                          <div>
                            <p className="text-[10px] text-white/30 mb-0.5">Email</p>
                            <p className="text-xs text-white/70">{displayEmail}</p>
                          </div>
                        )}
                        {displayPhone && (
                          <div>
                            <p className="text-[10px] text-white/30 mb-0.5">Phone</p>
                            <p className="text-xs text-white/70">{displayPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Services booked */}
                    {services.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-2">Services Booked</p>
                        <div className="flex flex-col gap-1">
                          {services.map((s) => (
                            <div key={s.sort_order} className="flex justify-between items-baseline">
                              <p className="text-xs text-white/70">{s.service_name}</p>
                              <p className="text-xs text-white/40 ml-4">R{s.price}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consultation form data */}
                    {hasConsultationData && (
                      <>
                        {/* Health */}
                        {healthFields.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-2">Health</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {healthFields.map((f) => (
                                <div key={f.label}>
                                  <p className="text-[10px] text-white/30 mb-0.5">{f.label}</p>
                                  <p className="text-xs text-white/70 whitespace-pre-line">{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lifestyle */}
                        {lifestyleFields.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-2">Lifestyle</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {lifestyleFields.map((f) => (
                                <div key={f.label}>
                                  <p className="text-[10px] text-white/30 mb-0.5">{f.label}</p>
                                  <p className="text-xs text-white/70 whitespace-pre-line">{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional notes */}
                        {c.additional_notes && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1">Additional Notes</p>
                            <p className="text-xs text-white/70 whitespace-pre-line leading-relaxed">{c.additional_notes}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* No consultation data fallback */}
                    {!hasConsultationData && (
                      <p className="text-xs text-white/25 italic">No health or lifestyle information provided.</p>
                    )}

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
