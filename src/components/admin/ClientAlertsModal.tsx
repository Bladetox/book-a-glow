import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarCheck, AlertTriangle, MessageCircle, Cake, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { OverdueLoyaltyClient, InactiveClient } from "@/hooks/useClientAlerts";
import {
  LEGACY_TEMPLATE_SETTING_KEYS,
  TEMPLATE_SETTING_KEYS,
  getTemplateValue,
  resolveMessageTemplate,
  buildWhatsAppUrl,
  type MessageTemplateType,
} from "@/lib/messaging/whatsapp";

// ─── Types ───
export interface BirthdayClient {
  id: string;
  client_name: string;
  phone: string | null;
  occasion_date: string;
  type: string;
  label: string | null;
}

// Same spring as the Business Health metric cards (BusinessHealthSection.SPRING):
// capped so it settles in <400 ms.
const SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  restSpeed: 0.5,
  restDelta: 0.5,
};

/** layoutId shared between the card that opens the modal and the modal panel. */
export const alertCardLayoutId = (type: string) => `client-alert-${type}`;

// ─── WA helpers ───
const SETTING_KEYS = Array.from(new Set([
  ...Object.values(TEMPLATE_SETTING_KEYS),
  ...Object.values(LEGACY_TEMPLATE_SETTING_KEYS).filter((key): key is string => Boolean(key)),
  "business_name",
  "loyalty_service_label",
  "loyalty_business_name",
]));

function buildMsg(
  name: string,
  templateType: MessageTemplateType,
  settingsRows: any[],
  businessName: string,
  serviceLabel: string,
): string {
  const template = getTemplateValue(settingsRows, templateType);
  return resolveMessageTemplate(template, {
    name,
    business: businessName || "us",
    service: serviceLabel || "appointment",
    bookingUrl: typeof window !== "undefined" ? `${window.location.origin}/book` : "",
  });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return format(new Date(dateStr), "dd MMM yyyy"); }
  catch { return dateStr; }
}

function formatOccasionDate(dateStr: string): string {
  try { return format(new Date(dateStr + "T00:00:00"), "dd MMM"); }
  catch { return dateStr; }
}

function daysUntilOccasion(dateStr: string): number {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
    return Math.round((thisYear.getTime() - today.getTime()) / 86400000);
  } catch { return 0; }
}

// ─── WaButton ───
const WaButton = ({ phone, msg }: { phone: string; msg: string }) => {
  const href = buildWhatsAppUrl(phone, msg);
  if (!href) return null;

  return (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 transition-opacity hover:opacity-80"
    style={{ background: "rgba(37,211,102,0.13)", color: "#25D366" }}
  >
    <MessageCircle className="w-3 h-3" /> WA
  </a>
  );
};

// ─── EmptyState ───
const EmptyState = ({ icon: Icon, iconColor, message }: {
  icon: React.ElementType;
  iconColor: string;
  message: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="py-12 flex flex-col items-center gap-3 text-center"
  >
    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
      <Icon className={`w-5 h-5 ${iconColor} opacity-30`} />
    </div>
    <p className="text-sm font-medium text-white/40">{message}</p>
    <p className="text-xs text-white/20">All clear here. Nothing to action right now.</p>
  </motion.div>
);

// ─── Props ───
interface ClientAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertType: "overdue_loyalty" | "inactive_90_days" | "birthday" | null;
  overdueClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
  birthdayClients?: BirthdayClient[];
}

export default function ClientAlertsModal({
  isOpen, onClose, alertType,
  overdueClients, inactiveClients, birthdayClients = [],
}: ClientAlertsModalProps) {
  const { tenantId } = useTenant();
  const navigate = useNavigate();

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
      serviceLabel: map.loyalty_service_label || "appointment",
      businessName: map.business_name || map.loyalty_business_name || "",
    };
  }, [settingsRows]);

  // ─── Per-type config ───
  const config = {
    overdue_loyalty: {
      title:        "Overdue Loyalty Clients",
      Icon:         CalendarCheck,
      iconColor:    "text-red-400",
      accentBorder: "border-red-500/25",
      accentBg:     "bg-red-500/[0.04]",
      badgeColor:   "bg-red-500/10 text-red-400 border border-red-500/20",
      tipNote:      "Messaging → Messages",
      count:        overdueClients.length,
      ctaLabel:     "Go to Loyalty",
      ctaRoute:     null as string | null,
    },
    inactive_90_days: {
      title:        "Inactive 90+ days",
      Icon:         AlertTriangle,
      iconColor:    "text-amber-400",
      accentBorder: "border-amber-500/25",
      accentBg:     "bg-amber-500/[0.04]",
      badgeColor:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      tipNote:      "Messaging → Messages",
      count:        inactiveClients.length,
      ctaLabel:     null as string | null,
      ctaRoute:     null as string | null,
    },
    birthday: {
      title:        "Upcoming Birthdays & Occasions",
      Icon:         Cake,
      iconColor:    "text-pink-400",
      accentBorder: "border-pink-500/25",
      accentBg:     "bg-pink-500/[0.04]",
      badgeColor:   "bg-pink-500/10 text-pink-400 border border-pink-500/20",
      tipNote:      "Messaging → Messages",
      count:        birthdayClients.length,
      ctaLabel:     "View All Special Dates",
      ctaRoute:     null as string | null,
    },
  };

  const active = alertType ? config[alertType] : null;
  const {
    Icon, iconColor, accentBorder, accentBg, badgeColor,
    tipNote, count, ctaLabel, ctaRoute,
  } = active ?? {
    Icon: CalendarCheck, iconColor: "", accentBorder: "", accentBg: "",
    badgeColor: "", tipNote: "", count: 0, ctaLabel: null, ctaRoute: null,
  };

  const handleCta = () => {
    onClose();
    if (ctaRoute) navigate(ctaRoute);
  };

  if (typeof document === "undefined") return null;

  // Portalled to <body>: the admin content area is its own stacking layer, so
  // rendering inline let the header and bottom nav paint over the panel.
  return createPortal(
    <AnimatePresence>
      {isOpen && alertType && (
        <>
          {/* Backdrop */}
          <motion.div
            key="alerts-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — morphs out of the card that opened it (shared layoutId) */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              key={alertType}
              layoutId={alertCardLayoutId(alertType)}
              layout
              transition={SPRING}
              role="dialog"
              aria-modal="true"
              aria-label={active?.title}
              className="pointer-events-auto relative w-full max-w-sm sm:max-w-lg rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              style={{ willChange: "transform", maxHeight: "80dvh" }}
            >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <p className="text-sm font-semibold text-white/85">{active?.title}</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ─── WA tip ─── */}
            <div className="mx-5 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 flex items-start gap-2 shrink-0">
              <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#25D366" }} />
              <p className="text-[11px] text-white/40 leading-relaxed">
                Tap <span className="font-semibold" style={{ color: "#25D366" }}>WA</span> on any client to open a pre-filled WhatsApp message. Edit templates in{" "}
                <span className="text-white/55 font-medium">{tipNote}</span>.
              </p>
            </div>

            {/* ─── List ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 flex flex-col gap-2">
              {count === 0 ? (
                <EmptyState
                  icon={Icon}
                  iconColor={iconColor}
                  message={
                    alertType === "overdue_loyalty" ? "No overdue loyalty clients."
                    : alertType === "inactive_90_days" ? "No inactive clients right now."
                    : "No upcoming birthdays this week."
                  }
                />
              ) : alertType === "overdue_loyalty" ? (
                overdueClients.map(client => {
                  const phone = client.phone ?? "";
                  const msg   = buildMsg(client.client_name, "overdue", settingsRows as any[], settings.businessName, settings.serviceLabel);
                  return (
                    <div key={client.id} className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                        <p className="text-[11px] text-white/35 truncate">{phone || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {client.days_overdue}d overdue
                        </span>
                        <span className="text-[10px] text-white/30">Due {formatDate(client.next_due_date)}</span>
                        {phone && <WaButton phone={phone} msg={msg} />}
                      </div>
                    </div>
                  );
                })
              ) : alertType === "inactive_90_days" ? (
                inactiveClients.map(client => {
                  const phone = client.client_phone ?? "";
                  const msg   = buildMsg(client.client_name, "long_overdue", settingsRows as any[], settings.businessName, settings.serviceLabel);
                  return (
                    <div key={client.client_id} className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                        <p className="text-[11px] text-white/35 truncate">{phone || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {client.days_since_booking}d ago
                        </span>
                        <span className="text-[10px] text-white/30">Last {formatDate(client.last_booking_date)}</span>
                        {phone && <WaButton phone={phone} msg={msg} />}
                      </div>
                    </div>
                  );
                })
              ) : alertType === "birthday" ? (
                birthdayClients.map(client => {
                  const phone    = client.phone ?? "";
                  const msg      = buildMsg(client.client_name, "birthday", settingsRows as any[], settings.businessName, settings.serviceLabel);
                  const daysLeft = daysUntilOccasion(client.occasion_date);
                  const isToday  = daysLeft === 0;
                  return (
                    <div key={client.id} className={`rounded-xl border ${accentBorder} ${accentBg} px-4 py-3 flex items-center justify-between gap-3`}>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white/85 truncate">{client.client_name}</p>
                        <p className="text-[11px] text-white/35 truncate">{phone || "—"}</p>
                        {client.label && (
                          <p className="text-[10px] text-white/25 italic">{client.label}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {isToday ? "🎂 Today!" : `in ${daysLeft}d`}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {formatOccasionDate(client.occasion_date)}
                        </span>
                        {phone && <WaButton phone={phone} msg={msg} />}
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>

            {/* ─── Footer ─── */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
              <p className="text-[10px] tracking-[0.12em] uppercase text-white/25">
                {count} client{count !== 1 ? "s" : ""}
              </p>
              {ctaLabel && count > 0 && (
                <button
                  onClick={handleCta}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors"
                >
                  {ctaLabel}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
