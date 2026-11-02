import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  normaliseWhatsAppTone,
  waLink,
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
