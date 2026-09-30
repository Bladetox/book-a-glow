export type MessageTemplateType = "birthday" | "time_to_book" | "overdue" | "long_overdue" | "on_track";

export const TEMPLATE_SETTING_KEYS: Record<MessageTemplateType, string> = {
  birthday: "loyalty.wa_template_birthday",
  time_to_book: "loyalty.wa_template_time_to_book",
  overdue: "loyalty.wa_template_overdue",
  long_overdue: "loyalty.wa_template_long_overdue",
  on_track: "loyalty.wa_template_on_track",
};

export const TEMPLATE_LABELS: Record<MessageTemplateType, string> = {
  birthday: "Birthday",
  time_to_book: "Due to Book",
  overdue: "Overdue",
  long_overdue: "Not Seen in a While",
  on_track: "On Track",
};

export const TEMPLATE_TOKENS = ["{name}", "{business}", "{service}", "{bookingUrl}"] as const;

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
