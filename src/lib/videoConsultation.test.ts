import { describe, expect, it } from "vitest";
import {
  buildWhatsAppContactUrl,
  toWhatsAppDigits,
  videoServiceFields,
} from "./videoConsultation";

describe("toWhatsAppDigits", () => {
  it.each([
    ["082 123 4567", "27821234567"],
    ["0821234567", "27821234567"],
    ["+27 82 123 4567", "27821234567"],
    ["0027821234567", "27821234567"],
    ["27821234567", "27821234567"],
    ["+44 7700 900123", "447700900123"],
    ["0044 7700 900123", "447700900123"],
  ])("normalises %s to %s", (input, expected) => {
    expect(toWhatsAppDigits(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["   "],
    ["abc"],
    ["0123"],
    ["08212345678"], // 11 digits with a leading 0: not a valid SA local number
    ["+0821234567"], // "+" followed by a trunk 0 is not a country code
    ["+1234"], // too short to be a number
  ])("rejects %p", (input) => {
    expect(toWhatsAppDigits(input as string | null | undefined)).toBeNull();
  });
});

describe("buildWhatsAppContactUrl", () => {
  it("builds a wa.me link for a valid number", () => {
    expect(buildWhatsAppContactUrl("082 123 4567")).toBe("https://wa.me/27821234567");
  });

  it("returns null instead of a broken link when the number is missing or invalid", () => {
    expect(buildWhatsAppContactUrl(null)).toBeNull();
    expect(buildWhatsAppContactUrl("0123")).toBeNull();
  });
});

describe("videoServiceFields", () => {
  it("switches call-out off when video calls are enabled", () => {
    expect(videoServiceFields(true)).toEqual({
      is_video_consultation: true,
      is_call_out_available: false,
    });
  });

  it("only clears the video flag when disabled, leaving call-out untouched", () => {
    expect(videoServiceFields(false)).toEqual({ is_video_consultation: false });
    expect(videoServiceFields(false)).not.toHaveProperty("is_call_out_available");
  });
});
