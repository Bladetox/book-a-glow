import { describe, expect, it } from "vitest";
import { hslStringToHex, isLightHex } from "./color";

describe("hslStringToHex", () => {
  it("converts white and black", () => {
    expect(hslStringToHex("0 0% 100%")).toBe("#FFFFFF");
    expect(hslStringToHex("0 0% 0%")).toBe("#000000");
  });

  it("converts a near-black surface", () => {
    expect(hslStringToHex("0 0% 8%")).toBe("#141414");
  });

  it("converts a warm light tint", () => {
    expect(hslStringToHex("35 45% 92%")).toBe("#F4ECE1");
  });
});

describe("isLightHex", () => {
  it("treats pale colours as light", () => {
    expect(isLightHex("#F2C1BB")).toBe(true);
    expect(isLightHex("#FFFFFF")).toBe(true);
  });

  it("treats dark colours as dark", () => {
    expect(isLightHex("#101010")).toBe(false);
    expect(isLightHex("#000000")).toBe(false);
  });

  it("treats an invalid value as dark", () => {
    expect(isLightHex("pink")).toBe(false);
  });
});
