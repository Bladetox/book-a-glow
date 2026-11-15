import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StepIndicator from "./StepIndicator";

describe("StepIndicator", () => {
  it("marks the current step", () => {
    render(<StepIndicator currentStep={1} />);
    expect(screen.getByRole("button", { name: /Schedule, current step/ }).getAttribute("aria-current")).toBe("step");
  });

  it("lets the guest jump back to a completed step", () => {
    const onStepSelect = vi.fn();
    render(<StepIndicator currentStep={2} onStepSelect={onStepSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Services, completed/ }));

    expect(onStepSelect).toHaveBeenCalledWith(0);
  });

  it("never navigates forward or to the current step", () => {
    const onStepSelect = vi.fn();
    render(<StepIndicator currentStep={1} onStepSelect={onStepSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Schedule, current step/ }));
    fireEvent.click(screen.getByRole("button", { name: /Details, not started/ }));
    fireEvent.click(screen.getByRole("button", { name: /Review, not started/ }));

    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it("blocks navigation while locked, e.g. during payment", () => {
    const onStepSelect = vi.fn();
    render(<StepIndicator currentStep={3} onStepSelect={onStepSelect} locked />);

    const services = screen.getByRole("button", { name: /Services, completed/ });
    expect((services as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(services);

    expect(onStepSelect).not.toHaveBeenCalled();
  });
});
