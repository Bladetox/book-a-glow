import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "@/pages/About";
import CaseStudy from "@/pages/CaseStudy";
import Resources from "@/pages/Resources";
import Demo from "@/pages/Demo";
import BookingAppPreview from "@/components/site/BookingAppPreview";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
}));

const wrap = (ui: React.ReactElement, path = "/") => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe("marketing pages render", () => {
  it.each([["About", <About />], ["CaseStudy", <CaseStudy />], ["Resources", <Resources />], ["Demo", <Demo />]])("%s has exactly one h1", (_n, el) => {
    const { container } = wrap(el as React.ReactElement);
    expect(container.querySelectorAll("h1").length).toBe(1);
  });
  it("About has no /contact link", () => {
    const { container } = wrap(<About />);
    expect([...container.querySelectorAll("a")].some(a => a.getAttribute("href") === "/contact")).toBe(false);
  });
});

describe("booking preview mirrors live flow", () => {
  it("requires a referral, steps through to confirmation", () => {
    wrap(<BookingAppPreview />);
    fireEvent.click(screen.getByText(/Book Your Appointment/i));
    expect(screen.getByText(/Please select an option/i)).toBeTruthy();
    fireEvent.click(screen.getByText("Instagram"));
    fireEvent.click(screen.getByText(/Book Your Appointment/i));
    expect(screen.getByText("Select a service")).toBeTruthy();
    const next = screen.getByText("Next") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Add one Bridal Glam"));
    fireEvent.click(screen.getByLabelText("Add one Bridal Glam"));
    expect(screen.getByText("2 selected")).toBeTruthy();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Choose date/i)).toBeTruthy();
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

import DemoAdminEmbed from "@/pages/DemoAdminEmbed";

describe("demo admin embed uses the real dashboard", () => {
  it("renders the real shell and dashboard sections from sample data", async () => {
    const { container } = wrap(<DemoAdminEmbed />);
    expect(screen.getAllByText("Studio M").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Revenue This Month");
    expect(container.textContent).toContain("Today's Appointments");
    expect(container.textContent).toContain("Signature Facial");
    // no hook-backed widgets in demo mode
    expect(container.textContent).not.toContain("Loading…");
  });
});
