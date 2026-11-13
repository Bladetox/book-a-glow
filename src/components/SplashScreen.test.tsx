import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SplashScreen from "./SplashScreen";

const config = {
  name: "Lumière Skin Studio",
  abbreviation: "LS",
  logoUrl: null as string | null,
  splashWelcomeLabel: "Welcome to",
  splashTagline1: "Skin · Lashes · Nails",
  splashTagline2: "Cape Town",
  splashCtaLabel: "Select a Service",
  referralOptions: ["TikTok", "Instagram", "Referral"],
  brandFontUrl: null as string | null,
  brandNameColor: null as string | null,
};

vi.mock("@/hooks/usePublicBusinessConfig", () => ({
  usePublicBusinessConfig: () => config,
}));
vi.mock("@/contexts/BusinessThemeProvider", () => ({
  useBusinessTheme: () => ({ loading: false }),
}));
vi.mock("@/hooks/useBrandFont", () => ({ useBrandFont: () => null }));

/** The lead source is controlled by the parent, as it is in Book.tsx. */
const renderSplash = (referralSource = "") => {
  const onComplete = vi.fn();
  const onReferralChange = vi.fn();
  const utils = render(
    <SplashScreen
      onComplete={onComplete}
      referralSource={referralSource}
      onReferralChange={onReferralChange}
    />,
  );
  return { onComplete, onReferralChange, ...utils };
};

describe("SplashScreen lead-source capture", () => {
  beforeEach(() => {
    config.referralOptions = ["TikTok", "Instagram", "Referral"];
  });

  it("offers every option the tenant configured", () => {
    renderSplash();
    for (const option of config.referralOptions) {
      expect(screen.getByRole("button", { name: option })).toBeTruthy();
    }
  });

  it("does not let the guest continue until a source is chosen", () => {
    const { onComplete } = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: "Select a Service" }));

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Please select an option to continue");
  });

  it("reports the chosen source to the parent", () => {
    const { onReferralChange } = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: "Instagram" }));

    expect(onReferralChange).toHaveBeenCalledWith("Instagram");
  });

  it("clears the source when the selected option is tapped again", () => {
    const { onReferralChange } = renderSplash("Instagram");

    const selected = screen.getByRole("button", { name: "Instagram" });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(selected);

    expect(onReferralChange).toHaveBeenCalledWith("");
  });

  it("continues once a source is selected", () => {
    const { onComplete } = renderSplash("Referral");

    fireEvent.click(screen.getByRole("button", { name: "Select a Service" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("drops the error as soon as the guest picks an option", () => {
    const { onReferralChange } = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: "Select a Service" }));
    expect(screen.getByRole("alert")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "TikTok" }));

    expect(onReferralChange).toHaveBeenCalledWith("TikTok");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("treats a whitespace-only source as nothing selected", () => {
    const { onComplete } = renderSplash("   ");

    fireEvent.click(screen.getByRole("button", { name: "Select a Service" }));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("has no arrow icon on its action button", () => {
    renderSplash("Referral");
    const cta = screen.getByRole("button", { name: "Select a Service" });
    expect(cta.querySelector("svg")).toBeNull();
  });
});
