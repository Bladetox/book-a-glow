import { describe, expect, it } from "vitest";
import { parseSplashBackground, serializeSplashBackground } from "./splash-background";

describe("parseSplashBackground", () => {
  it("returns nothing for an empty value", () => {
    expect(parseSplashBackground(null)).toEqual({ url: null, top: null });
    expect(parseSplashBackground("  ")).toEqual({ url: null, top: null });
  });

  it("reads a plain URL from older settings", () => {
    expect(parseSplashBackground("/splash/a.jpg")).toEqual({ url: "/splash/a.jpg", top: null });
  });

  it("reads the URL and top colour from JSON", () => {
    expect(parseSplashBackground('{"url":"/splash/a.jpg","top":"#f2c1ba"}')).toEqual({
      url: "/splash/a.jpg",
      top: "#F2C1BA",
    });
  });

  it("ignores an invalid top colour", () => {
    expect(parseSplashBackground('{"url":"/splash/a.jpg","top":"pink"}')).toEqual({
      url: "/splash/a.jpg",
      top: null,
    });
  });

  it("returns nothing for broken JSON", () => {
    expect(parseSplashBackground("{not json")).toEqual({ url: null, top: null });
  });

  it("round-trips a serialised value", () => {
    const stored = serializeSplashBackground("https://x/y.jpg", "#101010");
    expect(parseSplashBackground(stored)).toEqual({ url: "https://x/y.jpg", top: "#101010" });
  });
});
