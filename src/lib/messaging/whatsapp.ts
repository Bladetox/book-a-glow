export type MessageTemplateType = "birthday" | "time_to_book" | "overdue" | "long_overdue" | "on_track";

export const TEMPLATE_SETTING_KEYS: Record<MessageTemplateType, string> = {
  birthday: "loyalty.wa_template_birthday",
  time_to_book: "loyalty.wa_template_time_to_book",
  overdue: "loyalty.wa_template_overdue",
  long_overdue: "loyalty.wa_template_long_overdue",
  on_track: "loyalty.wa_template_on_track",
};

/**
 * Legacy settings are read only as a compatibility fallback.
 * New saves always use TEMPLATE_SETTING_KEYS, so there is one authoritative
 * template system going forward.
 */
export const LEGACY_TEMPLATE_SETTING_KEYS: Partial<Record<MessageTemplateType, string>> = {
  birthday: "loyalty_tpl_birthday",
  time_to_book: "loyalty_tpl_timebook",
  overdue: "loyalty_tpl_overdue",
  on_track: "loyalty_tpl_ontrack",
};

export function getTemplateValue(
  settings: Array<{ key: string; value?: string | null }>,
  type: MessageTemplateType,
) {
  const map = new Map(settings.map((row) => [row.key, row.value ?? ""]));
  const current = map.get(TEMPLATE_SETTING_KEYS[type])?.trim();
  if (current) return current;

  const legacyKey = LEGACY_TEMPLATE_SETTING_KEYS[type];
  const legacy = legacyKey ? map.get(legacyKey)?.trim() : "";
  return legacy || "";
}

export const TEMPLATE_LABELS: Record<MessageTemplateType, string> = {
  birthday: "Birthday",
  time_to_book: "Due to Book",
  overdue: "Overdue",
  long_overdue: "Not Seen in a While",
  on_track: "On Track",
};

export const FRIENDLY_TEMPLATE_LABELS = {
  "{name}": "Client name",
  "{business}": "Business name",
  "{service}": "Service",
  "{bookingUrl}": "Booking link",
} as const;

export function toFriendlyTemplate(template: string) {
  return template
    .replaceAll("{name}", "[Client name]")
    .replaceAll("{business}", "[Business name]")
    .replaceAll("{service}", "[Service]")
    .replaceAll("{bookingUrl}", "[Booking link]");
}

export function toStoredTemplate(template: string) {
  return template
    .replaceAll("[Client name]", "{name}")
    .replaceAll("[Business name]", "{business}")
    .replaceAll("[Service]", "{service}")
    .replaceAll("[Booking link]", "{bookingUrl}");
}

export function resolveMessageTemplate(
  template: string,
  values: { name?: string; business?: string; service?: string; bookingUrl?: string },
) {
  return template
    .replaceAll("{name}", values.name ?? "")
    .replaceAll("{business}", values.business ?? "")
    .replaceAll("{service}", values.service ?? "appointment")
    .replaceAll("{bookingUrl}", values.bookingUrl ?? "");
}

export function normaliseWhatsAppPhone(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  if (digits.startsWith("27")) return digits;
  return digits;
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
) {
  const normalised = normaliseWhatsAppPhone(phone);
  if (!normalised) return "";
  return `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;
}
