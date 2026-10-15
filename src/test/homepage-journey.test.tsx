import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomeJourneyNav } from "@/components/home/HomeJourneyNav";
import { HomePricingPreview } from "@/components/home/HomePricingPreview";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
  });
  globalThis.IntersectionObserver = class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
    constructor(_callback: IntersectionObserverCallback) {}
  } as unknown as typeof IntersectionObserver;
});

describe("homepage journey index", () => {
  it("is not rendered before the journey starts", () => {
    const { container } = render(<HomeJourneyNav enabled={false} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("offers all five agreed destinations", () => {
    render(<HomeJourneyNav enabled />);
    screen.getByRole("link", { name: /Who it's for/i }).getAttribute("href")).toBe("#who-its-for");
    screen.getByRole("link", { name: /How it works/i }).getAttribute("href")).toBe("#how-nextslot-works");
    screen.getByRole("link", { name: /Results/i }).getAttribute("href")).toBe("#results");
    screen.getByRole("link", { name: /Pricing/i }).getAttribute("href")).toBe("#pricing-preview");
    screen.getByRole("link", { name: /Get started/i }).getAttribute("href")).toBe("#get-started");
  });

  it("updates the URL and scrolls to the selected answer", () => {
    document.body.innerHTML = '<section id="who-its-for"></section>';
    const target = document.getElementById("who-its-for")!;
    const scroll = vi.spyOn(target, "scrollIntoView");
    render(<HomeJourneyNav enabled />);
    fireEvent.click(screen.getByRole("link", { name: /Who it's for/i }));
    expect(window.location.hash).toBe("#who-its-for");
    expect(scroll).toHaveBeenCalled();
  });
});

describe("homepage pricing preview", () => {
  it("shows Studio as coming soon, without advertising a trial", () => {
    render(<MemoryRouter><HomePricingPreview /></MemoryRouter>);
    const studio = screen.getByText("Studio").closest("article");
    expect(studio?.textContent).toContain("R1,299");
    expect(studio?.textContent).toContain("Coming soon");
    expect(studio?.textContent).not.toContain("30-day free trial");
    expect(studio?.textContent).toContain("3 staff included");
    expect(studio?.textContent).toContain("R89 per additional staff member");
  });
});
