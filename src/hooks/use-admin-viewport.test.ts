import { describe, expect, it } from "vitest";
import { getAdminViewport } from "./use-admin-viewport";

describe("getAdminViewport", () => {
  it("uses compact below 768px", () => {
    expect(getAdminViewport(320)).toBe("compact");
    expect(getAdminViewport(767)).toBe("compact");
  });

  it("uses the tablet rail from 768px through 1023px", () => {
    expect(getAdminViewport(768)).toBe("tablet");
    expect(getAdminViewport(1023)).toBe("tablet");
  });

  it("uses the desktop shell from 1024px upward", () => {
    expect(getAdminViewport(1024)).toBe("desktop");
    expect(getAdminViewport(1440)).toBe("desktop");
  });
});
