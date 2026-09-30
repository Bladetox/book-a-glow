import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientAlertsModal, { alertCardLayoutId } from "./ClientAlertsModal";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }) }) },
}));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenantId: "t1" }) }));

const birthdayClients = [
  { id: "1", client_name: "Kaylinn Manuel", phone: "0821234567", occasion_date: "2026-10-02", type: "birthday", label: null },
  { id: "2", client_name: "Second Client", phone: "0827654321", occasion_date: "2026-10-03", type: "birthday", label: null },
];

const renderModal = (props: Partial<React.ComponentProps<typeof ClientAlertsModal>> = {}) => {
  const onClose = vi.fn();
  const utils = render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <div data-testid="admin-content-layer" style={{ position: "relative", zIndex: 10, overflow: "auto" }}>
          <ClientAlertsModal
            isOpen alertType="birthday" onClose={onClose}
            overdueClients={[]} inactiveClients={[]} birthdayClients={birthdayClients} {...props}
          />
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { onClose, ...utils };
};

describe("ClientAlertsModal", () => {
  it("renders every client in a centred dialog, portalled outside the admin content layer", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText("Kaylinn Manuel")).toBeTruthy();
    expect(screen.getByText("Second Client")).toBeTruthy();
    // portalled to <body>, NOT inside the z-10 content layer that used to clip it
    expect(screen.getByTestId("admin-content-layer").contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    // centred modal, not a bottom sheet
    expect(dialog.parentElement?.className).toMatch(/items-center/);
    expect(dialog.parentElement?.className).not.toMatch(/items-end/);
    // list scrolls inside a height-capped panel
    expect(dialog.className).toMatch(/max-h-\[80vh\]/);
    expect(dialog.querySelector(".overflow-y-auto")).toBeTruthy();
  });

  it("uses the Business Health backdrop and closes on backdrop tap and X", () => {
    const { onClose } = renderModal();
    const backdrop = document.querySelector('[aria-hidden="true"].backdrop-blur-sm') as HTMLElement;
    expect(backdrop.className).toMatch(/bg-black\/60/);
    fireEvent.click(backdrop);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when tapping inside the panel", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByText("Kaylinn Manuel"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("exposes a stable shared layoutId per alert type", () => {
    expect(alertCardLayoutId("birthday")).toBe("client-alert-birthday");
  });
});
