import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BookingSheet from "./BookingSheet";

const renderSheet = (props: Partial<React.ComponentProps<typeof BookingSheet>> = {}) => {
  const onClose = vi.fn();
  const utils = render(
    <div data-testid="step-layer" style={{ transform: "translateX(0)", overflow: "hidden" }}>
      <BookingSheet open onClose={onClose} labelledBy="sheet-title" {...props}>
        <h2 id="sheet-title">Pair it with</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </BookingSheet>
    </div>,
  );
  return { onClose, ...utils };
};

describe("BookingSheet", () => {
  it("renders outside the step layer, inside the booking style scope", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog", { name: "Pair it with" });
    // Portalled to <body>: the animated, clipped step layer must not contain it...
    expect(screen.getByTestId("step-layer").contains(dialog)).toBe(false);
    // ...and it carries the scope class itself, or its buttons would be unstyled.
    expect(dialog.classList.contains("booking-app")).toBe(true);
  });

  it("closes on Escape and on a backdrop tap", () => {
    const { onClose } = renderSheet();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(document.querySelector(".bk-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("cannot be dismissed when it has no close handler", () => {
    render(
      <BookingSheet open variant="center" labelledBy="must-answer">
        <h2 id="must-answer">Needs an answer</h2>
        <button type="button">Keep</button>
      </BookingSheet>,
    );

    // Nothing to assert on a handler that does not exist: the dialog must simply stay.
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(document.querySelector(".bk-backdrop")!);
    expect(screen.getByRole("dialog", { name: "Needs an answer" })).toBeTruthy();
  });

  it("takes focus when opened and wraps Tab within itself", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("renders nothing while closed", () => {
    renderSheet({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
