export type MessageTemplateType =
  | "birthday"
  | "time_to_book"
  | "overdue"
  | "long_overdue"
  | "promo"
  | "review_ask";

export type MessageTemplateValues = {
  name?: string;
  business?: string;
  service?: string;
  bookingUrl?: string;
  lastService?: string;
  lastVisit?: string;
  googleReviewLink?: string;
};

export const TEMPLATE_SETTING_KEYS: Record<MessageTemplateType, string> = {
  birthday: "loyalty.wa_template_birthday",
  time_to_book: "loyalty.wa_template_time_to_book",
  overdue: "loyalty.wa_template_overdue",
  long_overdue: "loyalty.wa_template_long_overdue",
  promo: "loyalty.wa_template_promo",
  review_ask: "loyalty.wa_template_review_ask",
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
  long_overdue: "loyalty_tpl_long_overdue",
};

export const TEMPLATE_LABELS: Record<MessageTemplateType, string> = {
  birthday: "Birthday",
  time_to_book: "Due to Book",
  overdue: "Overdue",
  long_overdue: "Not seen in a while",
  promo: "Promo",
  review_ask: "Review ask",
};

export const TEMPLATE_TOKENS: Record<MessageTemplateType, string[]> = {
  birthday: ["[Client name]", "[Business name]"],
  time_to_book: [
    "[Client name]",
    "[Business name]",
    "[Service]",
    "[Booking link]",
    "[Last service]",
    "[Last visit]",
  ],
  overdue: [
    "[Client name]",
    "[Business name]",
    "[Service]",
    "[Booking link]",
    "[Last service]",
    "[Last visit]",
  ],
  long_overdue: [
    "[Client name]",
    "[Business name]",
    "[Service]",
    "[Booking link]",
    "[Last service]",
    "[Last visit]",
  ],
  promo: [
    "[Client name]",
    "[Business name]",
    "[Service]",
    "[Booking link]",
  ],
  review_ask: [
    "[Client name]",
    "[Business name]",
    "[Booking link]",
    "[Google review link]",
  ],
};

const FRIENDLY_TO_STORED: Record<string, string> = {
  "[Client name]": "{name}",
  "[Business name]": "{business}",
  "[Service]": "{service}",
  "[Booking link]": "{bookingUrl}",
  "[Last service]": "{lastService}",
  "[Last visit]": "{lastVisit}",
  "[Google review link]": "{googleReviewLink}",
};

const STORED_TO_FRIENDLY: Record<string, string> = Object.fromEntries(
  Object.entries(FRIENDLY_TO_STORED).map(([friendly, stored]) => [stored, friendly]),
);

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

export function toFriendlyTemplate(template: string) {
  return Object.entries(STORED_TO_FRIENDLY).reduce(
    (value, [stored, friendly]) => value.replaceAll(stored, friendly),
    template,
  );
}

export function toStoredTemplate(template: string) {
  return Object.entries(FRIENDLY_TO_STORED).reduce(
    (value, [friendly, stored]) => value.replaceAll(friendly, stored),
    template,
  );
}

export function resolveMessageTemplate(
  template: string,
  values: MessageTemplateValues,
) {
  const resolved: Record<string, string> = {
    "{name}": values.name ?? "",
    "{business}": values.business ?? "",
    "{service}": values.service ?? values.lastService ?? "appointment",
    "{bookingUrl}": values.bookingUrl ?? "",
    "{lastService}": values.lastService ?? values.service ?? "",
    "{lastVisit}": values.lastVisit ?? "",
    "{googleReviewLink}": values.googleReviewLink ?? "",
  };

  return Object.entries(resolved).reduce(
    (message, [token, value]) => message.replaceAll(token, value),
    template,
  );
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
