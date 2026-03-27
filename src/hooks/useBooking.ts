import { useState } from "react";
import { BookingState, initialBookingState } from "@/data/bookingData";

export function useBooking() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingState>(initialBookingState);

  const updateBooking = (updates: Partial<BookingState>) => {
    setBooking((prev) => ({ ...prev, ...updates }));
  };

  /** Add one occurrence of a service id (duplicates allowed). */
  const addTreatment = (id: string) => {
    setBooking((prev) => ({
      ...prev,
      selectedTreatments: [...prev.selectedTreatments, id],
    }));
  };

  /** Remove the last occurrence of a service id. */
  const removeTreatment = (id: string) => {
    setBooking((prev) => {
      const arr = [...prev.selectedTreatments];
      const lastIdx = arr.lastIndexOf(id);
      if (lastIdx !== -1) arr.splice(lastIdx, 1);
      return { ...prev, selectedTreatments: arr };
    });
  };

  /** Count how many times a service id appears in the selection. */
  const getTreatmentQty = (id: string) =>
    booking.selectedTreatments.filter((t) => t === id).length;

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return {
    step,
    setStep,
    booking,
    updateBooking,
    addTreatment,
    removeTreatment,
    getTreatmentQty,
    nextStep,
    prevStep,
  };
}
