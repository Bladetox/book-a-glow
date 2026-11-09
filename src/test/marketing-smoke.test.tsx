import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "@/pages/About";
import CaseStudy from "@/pages/CaseStudy";
import Resources from "@/pages/Resources";
import OnlineBookingSoftware from "@/pages/OnlineBookingSoftware";
import SiteHeader from "@/components/site/SiteHeader";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
}));

const wrap = (ui: React.ReactElement, path = "/") => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe("marketing pages render", () => {
  it.each([["About", <About />], ["CaseStudy", <CaseStudy />], ["Resources", <Resources />], ["OnlineBookingSoftware", <OnlineBookingSoftware />]])("%s has exactly one h1", (_n, el) => {
    const { container } = wrap(el as React.ReactElement);
    expect(container.querySelectorAll("h1").length).toBe(1);
  });
  it("About has no /contact link", () => {
    const { container } = wrap(<About />);
    expect([...container.querySelectorAll("a")].some(a => a.getAttribute("href") === "/contact")).toBe(false);
  });
});

describe("retired demo route is absent from marketing navigation", () => {
  it("does not expose /demo in desktop or mobile navigation", () => {
    const { container } = wrap(<SiteHeader />);
    expect(container.querySelector('a[href="/demo"]')).toBeNull();
  });
});

describe("SEO landing page CTA", () => {
  it("offers pricing instead of a demo walkthrough", () => {
    const { container } = wrap(<OnlineBookingSoftware />);
    expect(container.querySelector('a[href="/demo"]')).toBeNull();
    expect([...container.querySelectorAll("a")].some(a => a.getAttribute("href") === "/pricing" && a.textContent?.includes("View pricing"))).toBe(true);
  });
});

describe("mobile About + nav + hero CTA", () => {
  it("About approach grid collapses to one column on mobile", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    const { container } = wrap(<About />);
    const grids = [...container.querySelectorAll<HTMLElement>("div")].filter(d => d.style.gridTemplateColumns.includes("340px"));
    expect(grids.length).toBe(0);
  });
});

describe("marketing shell is scoped to marketing pages", () => {
  it("sets page colour + theme-color while mounted and restores on unmount", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = "#ffffff";
    document.head.appendChild(meta);
    const { unmount } = wrap(<About />);
    expect(document.documentElement.classList.contains("marketing-page")).toBe(true);
    expect(meta.content.toLowerCase()).toBe("#f5f0e7");
    unmount();
    expect(document.documentElement.classList.contains("marketing-page")).toBe(false);
    expect(meta.content).toBe("#ffffff");
    meta.remove();
  });
  it("headings contain no italic text", () => {
    const { container } = wrap(<About />);
    container.querySelectorAll("h1, h2, h3").forEach(h => {
      expect((h as HTMLElement).outerHTML).not.toMatch(/italic/);
    });
  });
});
