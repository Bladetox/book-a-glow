import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarCheck, AlertTriangle, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { OverdueLoyaltyClient, InactiveClient } from "@/hooks/useClientAlerts";

// ─── WA helpers (same logic as AdminLoyalty) ───
const DEFAULT_TPL_OVERDUE  = "Hi {name}! ✨ We miss you at {business}. You're overdue for your {service} — let's get you booked in! Reply to grab a slot.";
const DEFAULT_TPL_INACTIVE = "Hi {name}! 👋 It's been a while since we've seen you at {business}. We'd love to welcome you back — reply to book your next {service}!";

const SETTING_KEYS = [
  "loyalty_tpl_overdue",
  "loyalty_tpl_timebook",
  "loyalty_tpl_ontrack",
  "loyalty_service_label",
  "loyalty_business_name",
] as const;

function buildMsg(
  name: string,
  template: string,
  businessName: string,
  serviceLabel: string,
): string {
  return template
    .replace(/\{name\}/g, name)
    .replace(/\{business\}/g, businessName || "us")
    .replace(/\{service\}/g, serviceLabel || "appointment");
}

function waLink(phone: string, msg: string): string {
  const c = phone.replace(/\D/g, "");
  const num = c.startsWith("27") && c.length >= 11 ? c : "27" + c.replace(/^0/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "dd MMM yyyy"); }
  catch { return dateStr; }
}

// ─── WaButton ───
const WaButton = ({ phone, msg }: { phone: string; msg: string }) => (
  <a
    href={waLink(phone, msg)}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 transition-opacity hover:opacity-80"
    style={{ background: "rgba(37,211,102,0.13)", color: "#25D366" }}
  >
    <MessageCircle className="w-3 h-3" /> WA
  </a>
);

interface ClientAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertType: "overdue_loyalty" | "inactive_90_days" | null;
  overdueClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
}

export default function ClientAlertsModal({
  isOpen,
  onClose,
  alertType,
  overdueClients,
  inactiveClients,
}: ClientAlertsModalProps) {
  const { tenantId } = useTenant();

  // ─── Load WA templates + labels from app_settings ───
  const { data: settingsRows = [] } = useQuery({
    queryKey: ["loyalty-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", SETTING_KEYS);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });

  const settings = useMemo(() => {
    const map: Record<string, string> = {};
    settingsRows.forEach((r: any) => { map[r.key] = r.value; });
    return {
      overdueTemplate:  map.loyalty_tpl_overdue   || DEFAULT_TPL_OVERDUE,
      inactiveTemplate: map.loyalty_tpl_timebook  || DEFAULT_TPL_INACTIVE,
      serviceLabel:     map.loyalty_service_label || "appointment",
      businessName:     map.loyalty_business_name || "",
    };
  }, [settingsRows]);

  const isOverdue   = alertType === "overdue_loyalty";
  const clients     = isOverdue ? overdueClients : inactiveClients;
  const title       = isOverdue ? "Overdue Loyalty Clients" : "Inactive 90+ Days";
  const Icon        = isOverdue ? CalendarCheck : AlertTriangle;
  const iconColor   = isOverdue ? "text-red-400" : "text-amber-400";
  const accentBorder = isOverdue ? "border-red-500/25"       : "border-amber-500/25";
  const accentBg    = isOverdue ? "bg-red-500/[0.04]"        : "bg-amber-500/[0.04]";
  const badgeColor  = isOverdue
    ? "bg-red-500/10 text-red-400 border border-red-500/20"
    : "bg-amber-500/10 text-amber-400 border border-amber-500/20";

  return (
    <AnimatePresence>
      {isOpen && alertType && (
        <motion.div
          key="alerts-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="alerts-modal-panel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0f0f0f] flex flex-col max-h-[85vh] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <p className="text-sm font-semibold text-white/85">{title}</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* WA tip banner */}
            <div className="mx-5 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 flex items-start gap-2">
              <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#25D366" }} />
              <p className="text-[11px] text-white/40 leading-relaxed">
                Tap <span className="font-semibold" style={{ color: "#25D366" }}>WA</span> on any client to open a pre-filled WhatsApp message. Templates can be edited in{" "}
                <span className="text-white/55 font-medium">Loyalty → Settings</span>.
              </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-2">
              {clients.length === 0 ? (
                <div className="py-10 text-center text-xs text-white/30">No clients found</div>
              ) : isOverdue ? (
                overdueClients.map(client => {
                  const phone = client.phone ?? "";
                  const msg   = buildMsg(client.client_name, settings.overdueTemplate, settings.businessName, settings.serviceLabel);
                  return (
                    <div
                      key={client.id}
                      className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                        <p className="text-[11px] text-white/35 truncate">{phone || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {client.days_overdue}d overdue
                        </span>
                        <span className="text-[10px] text-white/30">
                          Due {formatDate(client.next_due_date)}
                        </span>
                        {phone && <WaButton phone={phone} msg={msg} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                inactiveClients.map(client => {
                  const phone = client.client_phone ?? "";
                  const msg   = buildMsg(client.client_name, settings.inactiveTemplate, settings.businessName, settings.serviceLabel);
                  return (
                    <div
                      key={client.client_id}
                      className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                        <p className="text-[11px] text-white/35 truncate">{phone || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {client.days_since_booking}d ago
                        </span>
                        <span className="text-[10px] text-white/30">
                          Last {formatDate(client.last_booking_date)}
                        </span>
                        {phone && <WaButton phone={phone} msg={msg} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06]">
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/25 text-center">
                {clients.length} client{clients.length !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
