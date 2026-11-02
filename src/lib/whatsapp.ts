export type WhatsAppTone = "warm" | "professional" | "concise";
export type WhatsAppMessageType =
  | "appointment_reminder" | "booking_support" | "balance_payshap" | "balance_payment_link"
  | "loyalty_overdue" | "loyalty_long_overdue" | "loyalty_time_to_book" | "loyalty_on_track"
  | "birthday" | "anniversary" | "booking_link" | "review_request";
export const WHATSAPP_TONE_KEY = "communications.whatsapp_tone";
export const WHATSAPP_TEMPLATES_KEY = "communications.whatsapp_templates";
export const DEFAULT_WHATSAPP_TONE: WhatsAppTone = "warm";

export const WHATSAPP_TONES: { value: WhatsAppTone; label: string; description: string }[] = [
  { value: "warm", label: "Warm and friendly", description: "Personal, welcoming and conversational." },
  { value: "professional", label: "Professional", description: "Polished, respectful and clear." },
  { value: "concise", label: "Short and simple", description: "Straight to the point, without unnecessary wording." },
];

export function normaliseWhatsAppTone(value?: string | null): WhatsAppTone {
  return value === "professional" || value === "concise" || value === "warm" ? value : DEFAULT_WHATSAPP_TONE;
}

type MessageData = {
  clientName?: string;
  businessName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  reference?: string;
  amount?: number;
  paymentUrl?: string;
  tenantPhone?: string;
  bookingUrl?: string;
  reviewUrl?: string;
};

const money = (amount = 0) => `R${amount.toFixed(2)}`;
const clean = (value?: string, fallback = "") => (value ?? "").trim() || fallback;
const toLocalSaPhone = (raw?: string) => {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0027")) digits = digits.slice(4);
  else if (digits.startsWith("27") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0")) return digits;
  return digits ? `0${digits}` : "";
};

function buildDefaultWhatsAppMessage(
  type: WhatsAppMessageType,
  data: MessageData,
  selectedTone: WhatsAppTone = DEFAULT_WHATSAPP_TONE,
): string {
  const tone = normaliseWhatsAppTone(selectedTone);
  const name = clean(data.clientName, "there");
  const business = clean(data.businessName, "us");
  const service = clean(data.serviceName, "your appointment");
  const date = clean(data.date);
  const time = clean(data.time);
  const ref = clean(data.reference);
  const amount = money(data.amount);
  const paymentUrl = clean(data.paymentUrl);
  const bookingUrl = clean(data.bookingUrl);
  const reviewUrl = clean(data.reviewUrl);
  const greeting = tone === "professional" ? `Hello ${name},` : tone === "concise" ? `Hi ${name}!` : `Hi ${name} 👋`;

  switch (type) {
    case "appointment_reminder":
      if (tone === "professional") return `Hello ${name}, this is a reminder of your appointment at ${business} on ${date} at ${time}.${ref ? ` Reference: ${ref}.` : ""} We look forward to welcoming you.`;
      if (tone === "concise") return `Hi ${name}! Reminder: your ${business} appointment is ${date} at ${time}.${ref ? ` Ref: ${ref}.` : ""} See you then!`;
      return `Hi ${name} 👋 Just a friendly reminder of your appointment at ${business} on ${date} at ${time}.${ref ? ` (Ref: ${ref})` : ""} We look forward to seeing you! 💛`;
    case "booking_support":
      if (tone === "professional") return `Hello ${name}, we noticed your booking for ${service} at ${business} was not completed. Please let us know if you experienced any difficulty. We would be happy to assist.`;
      if (tone === "concise") return `Hi ${name}, it looks like your booking for ${service} at ${business} wasn't completed. Need a hand? We're happy to help.`;
      return `Hi ${name} 👋 We noticed your booking for ${service} at ${business} wasn't completed. Did you experience any challenges? Let us know and we'll gladly help! 😊`;
    case "balance_payshap":
      return tone === "professional"
        ? `Hello ${name}, thank you for choosing ${business}. Your outstanding balance for ${service} is ${amount}.\n\nTo pay via PayShap, send ${amount} to ${toLocalSaPhone(data.tenantPhone) || "the business PayShap number"} using your full name as the reference. Please contact us if you need assistance.`
        : tone === "concise"
        ? `Hi ${name}, your remaining balance for ${service} at ${business} is ${amount}. Pay via PayShap to ${toLocalSaPhone(data.tenantPhone) || "our business number"} using your full name as reference. Thank you!`
        : `Hi ${name} 👋\n\nThank you for choosing ${business} It was a pleasure having you. Your remaining balance of *${amount}* for ${service} is now due.\n\nTo pay via PayShap:\n1️⃣ Copy this number: ${toLocalSaPhone(data.tenantPhone) || "our PayShap number"}\n2️⃣ Open your banking app → PayShap\n3️⃣ Send *${amount}* using your full name as the reference.\n\nAny questions? Reply here 😊`;
    case "balance_payment_link":
      if (tone === "professional") return `Hello ${name}, thank you for choosing ${business}. Your remaining balance of ${amount} for ${service} is due. You can settle it securely using this link: ${paymentUrl} Please contact us if you need any assistance.`;
      if (tone === "concise") return `Hi ${name}, your remaining balance of ${amount} for ${service} at ${business} is due. Pay securely here: ${paymentUrl}`;
      return `Hi ${name} 💛\n\nThank you for choosing ${business}, it was a pleasure having you! Your remaining balance of *${amount}* for ${service} is ready to settle.\n\nPay securely here:\n${paymentUrl}\n\nFeel free to reach out if you have any questions! 🌸`;
    case "loyalty_overdue":
      if (tone === "professional") return `Hello ${name}, it may be time to book your next ${service} at ${business}. We would be pleased to welcome you back.`;
      if (tone === "concise") return `Hi ${name}, you're due for your next ${service} at ${business}. Book when you're ready!`;
      return `Hi ${name}! ✨ We've missed you at ${business}. You're due for your ${service}, and we'd love to welcome you back. Reply when you're ready! 💛`;
    case "loyalty_long_overdue":
      if (tone === "professional") return `Hello ${name}, it has been some time since your last visit to ${business}. We would love the opportunity to welcome you back for ${service}.`;
      if (tone === "concise") return `Hi ${name}, it's been a while! We'd love to see you again at ${business} for ${service}.`;
      return `Hey ${name}! 💕 It's been a little while since we've seen you at ${business}. We'd love to have you back for ${service}, whenever you're ready.`;
    case "loyalty_time_to_book":
      if (tone === "professional") return `Hello ${name}, your next ${service} at ${business} may be due soon. You can get in touch when you are ready to arrange your next appointment.`;
      if (tone === "concise") return `Hi ${name}, it's nearly time for your next ${service} at ${business}. Ready to book?`;
      return `Hi ${name}! 📅 It's almost time for your next ${service} at ${business}. We'd love to help you find a time that suits you!`;
    case "loyalty_on_track":
      if (tone === "professional") return `Hello ${name}, thank you for choosing ${business}. We look forward to seeing you at your next ${service}.`;
      if (tone === "concise") return `Hi ${name}! Thanks for choosing ${business}. See you at your next ${service}!`;
      return `Hi ${name}! Just checking in from ${business}. You're all on track 🌟 See you at your next ${service}!`;
    case "birthday":
      if (tone === "professional") return `Hello ${name}, wishing you a very happy birthday. Warm wishes from everyone at ${business}. We hope you have a wonderful day.`;
      if (tone === "concise") return `Happy Birthday, ${name}! 🎂 Best wishes from all of us at ${business}!`;
      return `Happy Birthday ${name}! 🎂 Wishing you a beautiful day, with warm wishes from everyone at ${business}. Enjoy your special day! 💕`;
    case "anniversary":
      if (tone === "professional") return `Hello ${name}, congratulations on your anniversary. Thank you for being a valued client of ${business}. We truly appreciate your support.`;
      if (tone === "concise") return `Happy anniversary, ${name}! 💛 Thank you for being part of ${business}.`;
      return `Hi ${name}! 💖 Wishing you a wonderful anniversary. Thank you for being a valued client at ${business}. We appreciate you! 🌸`;
    case "booking_link":
      if (tone === "professional") return `Hello! You can book your next appointment with ${business} using this link: ${bookingUrl}`;
      if (tone === "concise") return `Book with ${business}: ${bookingUrl}`;
      return `Hi! 👋 Ready to book with ${business}? You can find a time that suits you here: ${bookingUrl} 💛`;
    case "review_request":
      if (tone === "professional") return `Hello ${name}, thank you for choosing ${business}. If you were happy with your experience, we would appreciate your feedback: ${reviewUrl}`;
      if (tone === "concise") return `Hi ${name}! Enjoyed your visit to ${business}? We'd appreciate your review: ${reviewUrl}`;
      return `Hi ${name}! Thank you for choosing ${business}. If you enjoyed your experience, we'd really appreciate your review: ${reviewUrl} 💛`;
    default:
      return greeting;
  }
}


export type WhatsAppTemplates = Partial<Record<WhatsAppMessageType, string>>;

export const WHATSAPP_TEMPLATE_DEFINITIONS: { type: WhatsAppMessageType; label: string; description: string; usedIn: string; active: boolean }[] = [
  { type: "appointment_reminder", label: "Appointment reminder", description: "A reminder with the client's appointment date, time and reference.", usedIn: "Bookings · appointment WhatsApp action", active: true },
  { type: "booking_support", label: "Booking support", description: "A helpful message when a booking needs follow-up.", usedIn: "Bookings · support WhatsApp action", active: true },
  { type: "balance_payshap", label: "PayShap balance instructions", description: "Instructions for settling an outstanding balance using PayShap.", usedIn: "Bookings · balance action when PayShap is enabled", active: true },
  { type: "balance_payment_link", label: "Balance payment link", description: "A message containing the secure payment link for an outstanding balance.", usedIn: "Bookings · Yoco balance payment action", active: true },
  { type: "loyalty_overdue", label: "Loyalty · overdue", description: "A rebooking nudge for a client whose next visit is overdue.", usedIn: "Loyalty · overdue client actions and alerts", active: true },
  { type: "loyalty_long_overdue", label: "Loyalty · long overdue", description: "A gentle re-engagement message for a client who has been away for a while.", usedIn: "Loyalty · long-overdue and inactive client actions", active: true },
  { type: "loyalty_time_to_book", label: "Loyalty · time to book", description: "A reminder that a client's next visit is approaching.", usedIn: "Loyalty · time-to-book client actions", active: true },
  { type: "loyalty_on_track", label: "Loyalty · on track", description: "A simple thank-you or check-in for clients who are on track.", usedIn: "Loyalty · on-track client actions", active: true },
  { type: "birthday", label: "Birthday wishes", description: "A birthday greeting for a client.", usedIn: "Special occasions and client birthday alerts", active: true },
  { type: "anniversary", label: "Anniversary wishes", description: "A thank-you message for a client anniversary.", usedIn: "Special occasions · anniversary actions", active: true },
  { type: "booking_link", label: "Booking link", description: "A shareable message with the business's public booking link.", usedIn: "Setup checklist · share booking link", active: true },
  { type: "review_request", label: "Review request", description: "A request for feedback with the business's review link.", usedIn: "Not currently connected to a WhatsApp action", active: false },
];

export const WHATSAPP_TEMPLATE_VARIABLES: Record<WhatsAppMessageType, string[]> = {
  appointment_reminder: ["client_name", "business_name", "date", "time", "reference"],
  booking_support: ["client_name", "business_name", "service_name"],
  balance_payshap: ["client_name", "business_name", "service_name", "amount", "payshap_number"],
  balance_payment_link: ["client_name", "business_name", "service_name", "amount", "payment_url"],
  loyalty_overdue: ["client_name", "business_name", "service_name"],
  loyalty_long_overdue: ["client_name", "business_name", "service_name"],
  loyalty_time_to_book: ["client_name", "business_name", "service_name"],
  loyalty_on_track: ["client_name", "business_name", "service_name"],
  birthday: ["client_name", "business_name"],
  anniversary: ["client_name", "business_name"],
  booking_link: ["business_name", "booking_url"],
  review_request: ["client_name", "business_name", "review_url"],
};

export const WHATSAPP_TEMPLATE_VARIABLE_LABELS: Record<string, string> = {
  client_name: "Client name", business_name: "Business name", service_name: "Service name",
  date: "Appointment date", time: "Appointment time", reference: "Booking reference",
  amount: "Amount due", payshap_number: "PayShap number", payment_url: "Payment link",
  booking_url: "Booking link", review_url: "Review link",
};

const TEMPLATE_SAMPLE_DATA: MessageData = {
  clientName: "Sarah", businessName: "Your business", serviceName: "Deluxe Facial",
  date: "Wednesday, 4 November", time: "14:00", reference: "NS-1042", amount: 123.45,
  paymentUrl: "https://example.com/pay", tenantPhone: "0821234567",
  bookingUrl: "https://example.com/book", reviewUrl: "https://example.com/review",
};

export function getWhatsAppTemplateDefault(type: WhatsAppMessageType, tone: WhatsAppTone = DEFAULT_WHATSAPP_TONE): string {
  let message = buildDefaultWhatsAppMessage(type, TEMPLATE_SAMPLE_DATA, tone);
  const replacements: [string, string][] = [
    ["Wednesday, 4 November", "{{date}}"], ["https://example.com/pay", "{{payment_url}}"],
    ["https://example.com/book", "{{booking_url}}"], ["https://example.com/review", "{{review_url}}"],
    ["0821234567", "{{payshap_number}}"], ["R123.45", "{{amount}}"],
    ["Deluxe Facial", "{{service_name}}"], ["Your business", "{{business_name}}"],
    ["NS-1042", "{{reference}}"], ["Sarah", "{{client_name}}"], ["14:00", "{{time}}"],
  ];
  for (const [value, token] of replacements) message = message.split(value).join(token);
  return message;
}

export function parseWhatsAppTemplates(value?: string | null): WhatsAppTemplates {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: WhatsAppTemplates = {};
    for (const definition of WHATSAPP_TEMPLATE_DEFINITIONS) {
      const candidate = parsed?.[definition.type];
      if (typeof candidate === "string" && candidate.trim()) result[definition.type] = candidate;
    }
    return result;
  } catch { return {}; }
}

export function validateWhatsAppTemplate(type: WhatsAppMessageType, template: string): string | null {
  const tokens = Array.from(template.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g), match => match[1].trim());
  const allowed = WHATSAPP_TEMPLATE_VARIABLES[type];
  const invalid = tokens.find(token => !allowed.includes(token));
  if (invalid) return "This message uses an unsupported placeholder: " + invalid;
  const stripped = template.replace(/\{\{\s*[^{}]+\s*\}\}/g, "");
  if (stripped.includes("{{") || stripped.includes("}}")) return "One of the placeholders is incomplete.";
  return null;
}

export function buildWhatsAppMessage(
  type: WhatsAppMessageType,
  data: MessageData,
  selectedTone: WhatsAppTone = DEFAULT_WHATSAPP_TONE,
  templates?: WhatsAppTemplates,
): string {
  const custom = templates?.[type]?.trim();
  if (!custom) return buildDefaultWhatsAppMessage(type, data, selectedTone);
  const values: Record<string, string> = {
    client_name: clean(data.clientName, "there"), business_name: clean(data.businessName, "us"),
    service_name: clean(data.serviceName, "your appointment"), date: clean(data.date), time: clean(data.time),
    reference: clean(data.reference), amount: money(data.amount), payshap_number: toLocalSaPhone(data.tenantPhone),
    payment_url: clean(data.paymentUrl), booking_url: clean(data.bookingUrl), review_url: clean(data.reviewUrl),
  };
  return custom.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

export function waLink(phone: string, message: string): string {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const number = !digits
    ? ""
    : digits.startsWith("27")
      ? digits
      : digits.startsWith("0")
        ? `27${digits.slice(1)}`
        : digits.length === 9
          ? `27${digits}`
          : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
