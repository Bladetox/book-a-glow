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

import {
  canAddToSelection,
  rowsForScheduleMode,
  scheduleTypeRpcArg,
  selectionScheduleMode,
} from "./videoConsultation";

describe("selectionScheduleMode", () => {
  it("is empty with nothing selected", () => {
    expect(selectionScheduleMode([])).toBe("empty");
  });
  it("is physical when no selected service is video", () => {
    expect(selectionScheduleMode([false, false])).toBe("physical");
  });
  it("is consultation when every selected service is video", () => {
    expect(selectionScheduleMode([true, true])).toBe("consultation");
  });
  it("is mixed when video and physical services are selected together", () => {
    expect(selectionScheduleMode([true, false])).toBe("mixed");
  });
});

describe("canAddToSelection", () => {
  it("allows any service into an empty selection", () => {
    expect(canAddToSelection([], true)).toBe(true);
    expect(canAddToSelection([], false)).toBe(true);
  });
  it("refuses a video service next to physical services", () => {
    expect(canAddToSelection([false], true)).toBe(false);
  });
  it("refuses a physical service next to video services", () => {
    expect(canAddToSelection([true], false)).toBe(false);
  });
  it("allows more video services with video, and more physical with physical", () => {
    expect(canAddToSelection([true], true)).toBe(true);
    expect(canAddToSelection([false], false)).toBe(true);
  });
});

describe("rowsForScheduleMode", () => {
  const rows = [
    { id: 1, schedule_type: "physical" },
    { id: 2, schedule_type: "consultation" },
    { id: 3 },
    { id: 4, schedule_type: null },
  ];
  it("keeps physical rows, including rows with no schedule_type yet", () => {
    expect(rowsForScheduleMode(rows, "physical").map((r) => r.id)).toEqual([1, 3, 4]);
  });
  it("keeps only consultation rows for consultation", () => {
    expect(rowsForScheduleMode(rows, "consultation").map((r) => r.id)).toEqual([2]);
  });
});

describe("scheduleTypeRpcArg", () => {
  it("sends nothing for physical so existing calls are unchanged", () => {
    expect(scheduleTypeRpcArg("physical")).toEqual({});
  });
  it("sends the schedule type for consultation", () => {
    expect(scheduleTypeRpcArg("consultation")).toEqual({ p_schedule_type: "consultation" });
  });
});
