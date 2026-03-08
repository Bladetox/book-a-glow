import { useState } from "react";
import { BookingState, initialBookingState } from "@/data/bookingData";

export function useBooking() {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingState>(initialBookingState);

  const updateBooking = (updates: Partial<BookingState>) => {
    setBooking((prev) => ({ ...prev, ...updates }));
  };

  const toggleTreatment = (id: string) => {
    setBooking((prev) => ({
      ...prev,
      selectedTreatments: prev.selectedTreatments.includes(id)
        ? prev.selectedTreatments.filter((t) => t !== id)
        : [...prev.selectedTreatments, id],
    }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return { step, setStep, booking, updateBooking, toggleTreatment, nextStep, prevStep };
}
