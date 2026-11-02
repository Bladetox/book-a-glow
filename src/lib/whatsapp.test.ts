import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  normaliseWhatsAppTone,
  waLink,
  getWhatsAppTemplateDefault,
  parseWhatsAppTemplates,
  validateWhatsAppTemplate,
} from "./whatsapp";

describe("WhatsApp message generation", () => {
  it("defaults unknown or missing tones to warm", () => {
    expect(normaliseWhatsAppTone()).toBe("warm");
    expect(normaliseWhatsAppTone("legacy-value")).toBe("warm");
  });

  it("fills appointment details in the selected tone", () => {
    const data = {
      clientName: "Sarah",
      businessName: "PhenomeBeauty",
      date: "Wednesday, 4 November",
      time: "14:00",
      reference: "PB-1042",
    };
    const message = buildWhatsAppMessage("appointment_reminder", data, "professional");
    expect(message).toContain("Sarah");
    expect(message).toContain("PhenomeBeauty");
    expect(message).toContain("Wednesday, 4 November");
    expect(message).toContain("14:00");
    expect(message).toContain("PB-1042");
    expect(message).toContain("Hello Sarah");
  });

  it("formats South African PayShap numbers in local format", () => {
    const message = buildWhatsAppMessage("balance_payshap", {
      clientName: "Sarah",
      businessName: "PhenomeBeauty",
      serviceName: "Deluxe Facial",
      amount: 450,
      tenantPhone: "+27 82 123 4567",
    });
    expect(message).toContain("0821234567");
    expect(message).toContain("R450.00");
  });

  it("creates a generic WhatsApp share link when no recipient is supplied", () => {
    expect(waLink("", "Book here")).toBe("https://wa.me/?text=Book%20here");
  });

  it("creates a recipient link using international digits", () => {
    expect(waLink("+27 82 123 4567", "Hello")).toBe("https://wa.me/27821234567?text=Hello");
  });
});


describe("editable WhatsApp templates", () => {
  it("renders supported placeholders with real message data", () => {
    const message = buildWhatsAppMessage(
      "appointment_reminder",
      { clientName: "Amina", businessName: "Studio One", date: "Friday", time: "10:30", reference: "NS-22" },
      "warm",
      { appointment_reminder: "Hi {{client_name}}, see you at {{business_name}} on {{date}} at {{time}}. Ref {{reference}}." },
    );
    expect(message).toBe("Hi Amina, see you at Studio One on Friday at 10:30. Ref NS-22.");
  });

  it("uses tone-specific suggestions with supported placeholders", () => {
    const suggestion = getWhatsAppTemplateDefault("booking_link", "professional");
    expect(suggestion).toContain("{{business_name}}");
    expect(suggestion).toContain("{{booking_url}}");
    expect(suggestion).not.toContain("Your business");
  });

  it("parses only known string templates and safely handles invalid JSON", () => {
    expect(parseWhatsAppTemplates(JSON.stringify({ birthday: "Hello {{client_name}}", unknown: "ignored", anniversary: 42 }))).toEqual({ birthday: "Hello {{client_name}}" });
    expect(parseWhatsAppTemplates("{invalid")).toEqual({});
  });

  it("rejects placeholders unavailable to the selected message", () => {
    expect(validateWhatsAppTemplate("birthday", "Hello {{client_name}}")).toBeNull();
    expect(validateWhatsAppTemplate("birthday", "Pay {{payment_url}}")).toContain("unsupported placeholder");
    expect(validateWhatsAppTemplate("booking_link", "Book here {{booking_url")).toContain("incomplete");
  });
});


it("renders the PayShap number placeholder with a safe fallback", () => {
  const message = buildWhatsAppMessage(
    "balance_payshap",
    { clientName: "Amina", businessName: "Studio One", serviceName: "Facial", amount: 450, tenantPhone: "+27 82 123 4567" },
    "professional",
    { balance_payshap: "{{client_name}} owes {{amount}}. PayShap: {{payshap_number}}" },
  );
  expect(message).toContain("Amina owes R450.00");
  expect(message).toContain("PayShap: 0821234567");
});
