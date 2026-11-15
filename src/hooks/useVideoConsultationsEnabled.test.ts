import { describe, expect, it } from "vitest";
import { parseVideoFlagValue } from "./useVideoConsultationsEnabled";
import { TENANT_ONLY_FLAGS, GLOBAL_FLAG_KEYS, FLAG_KEYS } from "@/lib/featureFlags/registry";

describe("parseVideoFlagValue", () => {
  it("is on only for the stored JSON true", () => {
    expect(parseVideoFlagValue("true")).toBe(true);
  });
  it("is off for false, missing and malformed values", () => {
    expect(parseVideoFlagValue("false")).toBe(false);
    expect(parseVideoFlagValue(null)).toBe(false);
    expect(parseVideoFlagValue(undefined)).toBe(false);
    expect(parseVideoFlagValue("yes")).toBe(false);
  });
});

describe("video flag scope", () => {
  it("is tenant-only, so it never takes global defaults", () => {
    expect(TENANT_ONLY_FLAGS.has("video_consultations")).toBe(true);
    expect(GLOBAL_FLAG_KEYS).not.toContain("video_consultations");
    expect(FLAG_KEYS).toContain("video_consultations");
  });
});
