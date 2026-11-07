import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, ChevronDown, ChevronUp, Search, Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getLeadSourceConfig } from "@/components/admin/leadSourceConfig";

const filters = ["All", "Form on file", "No form yet"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTime(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatAnswer(item: any): string {
  const a = item?.answer;
  let text = "";
  if (a === true) text = "Yes";
  else if (a === false) text = "No";
  else if (Array.isArray(a)) text = a.join(", ");
  else if (a !== null && a !== undefined) text = String(a);
  if (item?.detail) text = text ? `${text} - ${item.detail}` : String(item.detail);
  return text;
}

function answeredItems(c: any): any[] {
  const items = c?.answers?.items;
  return Array.isArray(items) ? items.filter((i) => formatAnswer(i) !== "") : [];
}

function changeEntries(c: any): any[] {
  return Array.isArray(c?.change_log) ? c.change_log : [];
}

function exportCSV(rows: any[]) {
  const headers = [
    "Name", "Email", "Phone", "Last Visit", "Time", "Form", "Acquisition Channel", "Services",
    "Skin Conditions", "Medications", "Allergies", "Health Conditions",
    "Pregnancy", "Environmental Exposure", "Physical Factors",
    "Hair Length OK", "Additional Notes", "Consultation Answers", "Change Notes", "Last Updated",
  ];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((c) => {
      const booking = c.booking;
      const client  = booking?.client;
      const name    = c.guest_name || client?.full_name || booking?.guest_name || "";
      const email   = client?.email       || booking?.guest_email || "";
      const phone   = client?.phone       || booking?.guest_phone || "";
      const services = (booking?.items ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => `${s.service_name} (R${s.price})`)
        .join("; ");
      return [
        name, email, phone,
        booking?.booking_date ?? "",
        fmtTime(booking?.start_time) ?? "",
        c.has_form ? "Form on file" : "No form yet",
        c.firstBooking?.lead_source ?? "",   // original acquisition channel from first booking
        services,
        c.skin_conditions ?? "", c.medications ?? "", c.allergies ?? "",
        c.health_conditions ?? "", c.pregnancy ?? "",
        c.environmental_exposure ?? "", c.physical_factors ?? "",
        c.hair_length_ok ?? "", c.additional_notes ?? "",
        answeredItems(c).map((i) => `${i.label}: ${formatAnswer(i)}`).join("; "),
        changeEntries(c).map((e) => `${e.date ?? ""}: ${e.note ?? ""}`).join("; "),
        c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "",
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

// ─── component ───────────────────────────────────────────────────────────────

const AdminConsultations = () => {
  const { tenantId } = useTenant();
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [search, setSearch]             = useState("");

  const { data: consultations = [], isLoading } = useQuery({
    queryKey: ["consultations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_consultations")
        .select(`
          *,
          booking:bookings!guest_consultations_last_booking_id_fkey(
            booking_date, start_time,
            guest_name, guest_email, guest_phone,
            client:profiles!bookings_client_id_fkey(full_name, email, phone),
            items:booking_items(service_name, price, sort_order)
          ),
          firstBooking:bookings!guest_consultations_first_booking_id_fkey(
            lead_source
          )
        `)
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filterCount = (f: string) =>
    consultations.filter((c) =>
      f === "All" ? true : f === "Form on file" ? c.has_form : !c.has_form
    ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultations.filter((c) => {
      const booking = c.booking;
      const client  = booking?.client;
      const name    = (c.guest_name || client?.full_name || booking?.guest_name || "").toLowerCase();
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Form on file" && c.has_form) ||
        (activeFilter === "No form yet"  && !c.has_form);
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
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-1 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                aria-pressed={activeFilter === f}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all
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
              className="flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 border border-white/[0.07] hover:text-white/80 hover:border-white/20 transition-all whitespace-nowrap"
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
            id="consultations-search"
            name="consultations-search"
            type="text"
            placeholder="Search by client name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[44px] w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
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
          className="rounded-2xl nexty-card p-8 text-center"
        >
          <p className="text-sm text-white/30">
            {search ? "No consultations match your search." : "No consultation forms yet."}
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const isExpanded   = expandedId === c.id;
            const booking      = c.booking;
            const client       = booking?.client;
            const displayName  = c.guest_name || client?.full_name || booking?.guest_name || "Unknown";
            const contactIsPhone = typeof c.contact_key === "string" && c.contact_key.startsWith("ph:");
            const displayEmail = client?.email       || booking?.guest_email || (!contactIsPhone ? c.contact_key : null) || null;
            const displayPhone = client?.phone       || booking?.guest_phone || (contactIsPhone ? c.contact_key.slice(3) : null) || null;
            const answerItems  = answeredItems(c);
            const changes      = changeEntries(c);

            const services: { service_name: string; price: number; sort_order: number }[] =
              (booking?.items ?? []).sort((a, b) => a.sort_order - b.sort_order);

            const timeLabel    = fmtTime(booking?.start_time);
            const submittedAgo = c.updated_at
              ? formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })
              : null;

            // Acquisition is attributed to the first booking, not the latest return visit.
            // Never substitute a later booking's source when the original source is unknown.
            const acquisitionSource = c.firstBooking?.lead_source ?? null;
            const leadCfg = getLeadSourceConfig(acquisitionSource);
            const hasLeadSource = !!acquisitionSource?.trim();

            // health fields
            const healthFields = [
              { label: "Allergies",         value: c.allergies },
              { label: "Skin Conditions",   value: c.skin_conditions },
              { label: "Health Conditions", value: c.health_conditions },
              { label: "Medications",       value: c.medications },
              { label: "Pregnancy",         value: c.pregnancy },
            ].filter((f) => f.value);

            const lifestyleFields = [
              { label: "Physical Factors",       value: c.physical_factors },
              { label: "Environmental Exposure", value: c.environmental_exposure },
              { label: "Hair Length OK",         value: c.hair_length_ok },
            ].filter((f) => f.value);

            const hasConsultationData =
              healthFields.length > 0 ||
              lifestyleFields.length > 0 ||
              answerItems.length > 0 ||
              c.additional_notes;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl nexty-card overflow-hidden"
              >
                {/* ── row header ── */}
                <div
                  className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{displayName}</p>
                    <p className="text-[11px] text-white/40">
                      {booking?.booking_date && <>Last visit {booking.booking_date}</>}
                      {timeLabel && <> · {timeLabel}</>}
                      {" · "}
                      {c.has_form ? "Consultation on file" : "No consultation form yet"}
                    </p>
                  </div>

                  {/* badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.has_form
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {c.has_form ? "form on file" : "no form"}
                    </span>

                    {/* channel pill — only shown when data exists, hidden on mobile */}
                    {hasLeadSource && (
                      <span
                        className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${leadCfg.className}`}
                        title="Acquisition channel"
                      >
                        {leadCfg.icon}
                        {leadCfg.label}
                      </span>
                    )}
                  </div>

                  {isExpanded
                    ? <ChevronUp   className="w-4 h-4 text-white/20 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-white/20 shrink-0" />
                  }
                </div>

                {/* ── expanded detail ── */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-6 pt-2 border-t border-white/[0.07] flex flex-col gap-4">

                    {submittedAgo && (
                      <p className="text-[11px] text-white/30">Record updated {submittedAgo}</p>
                    )}

                    {/* Contact + Acquisition Channel */}
                    <div className="nexty-inset rounded-xl p-4">
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Contact</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayEmail && (
                          <div>
                            <p className="text-[10px] text-white/35 mb-1">Email</p>
                            <p className="text-sm text-white/80">{displayEmail}</p>
                          </div>
                        )}
                        {displayPhone && (
                          <div>
                            <p className="text-[10px] text-white/35 mb-1">Phone</p>
                            <p className="text-sm text-white/80">{displayPhone}</p>
                          </div>
                        )}

                        {/* Acquisition Channel — always shown in expanded view */}
                        <div>
                          <p className="text-[10px] text-white/35 mb-1">Acquisition Channel</p>
                          {hasLeadSource ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${leadCfg.className}`}
                            >
                              {leadCfg.icon}
                              {leadCfg.label}
                            </span>
                          ) : (
                            <p className="text-sm text-white/30 italic">Not recorded</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Services booked */}
                    {services.length > 0 && (
                      <div className="nexty-inset rounded-xl p-4">
                        <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Services Booked</p>
                        <div className="flex flex-col divide-y divide-white/[0.06]">
                          {services.map((s) => (
                            <div key={s.sort_order} className="flex justify-between items-baseline py-2 first:pt-0 last:pb-0">
                              <p className="text-sm text-white/80">{s.service_name}</p>
                              <p className="text-sm text-white/45 ml-4 tabular-nums">R{s.price}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consultation form data */}
                    {hasConsultationData && (
                      <>
                        {healthFields.length > 0 && (
                          <div className="nexty-inset rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Health</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {healthFields.map((f) => (
                                <div key={f.label}>
                                  <p className="text-[10px] text-white/35 mb-1">{f.label}</p>
                                  <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {lifestyleFields.length > 0 && (
                          <div className="nexty-inset rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Lifestyle</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {lifestyleFields.map((f) => (
                                <div key={f.label}>
                                  <p className="text-[10px] text-white/35 mb-1">{f.label}</p>
                                  <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{f.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {answerItems.length > 0 && (
                          <div className="nexty-inset rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Consultation Answers</p>
                            <div className="flex flex-col divide-y divide-white/[0.06]">
                              {answerItems.map((i) => (
                                <div key={i.key} className="py-3 first:pt-0 last:pb-0">
                                  <p className="text-[12px] text-white/45 mb-1 leading-snug">{i.label}</p>
                                  <p className="text-sm text-white/85 whitespace-pre-line leading-relaxed font-medium">{formatAnswer(i)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {c.additional_notes && (
                          <div className="nexty-inset rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-2">Additional Notes</p>
                            <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{c.additional_notes}</p>
                          </div>
                        )}
                      </>
                    )}

                    {!hasConsultationData && (
                      <p className="text-sm text-white/30 italic">No consultation form on file yet.</p>
                    )}

                    {changes.length > 0 && (
                      <div className="nexty-inset rounded-xl p-4">
                        <p className="text-[10px] font-semibold tracking-wider uppercase text-white/35 mb-3">Changes Reported at Later Visits</p>
                        <div className="flex flex-col divide-y divide-white/[0.06]">
                          {changes.map((e, idx: number) => (
                            <div key={`${e.booking_id ?? idx}-${idx}`} className="py-2.5 first:pt-0 last:pb-0">
                              <p className="text-[11px] text-white/35 mb-1">{e.date ?? ""}</p>
                              <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{e.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
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
