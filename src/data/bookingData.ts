export type Treatment = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  category: string;
};

export type Category = {
  id: string;
  label: string;
};

export type BookingState = {
  selectedTreatments: string[];
  selectedDate: Date | null;
  selectedTime: string | null;
  isExistingClient: boolean | null;
  fullName: string;
  phone: string;
  phoneCode: string;
  email: string;
  address: string;
  referralSource: string;
  safetyAnswers: Record<number, boolean | null>;
  additionalNotes: string;
  existingClientNotes: string;
};

export const initialBookingState: BookingState = {
  selectedTreatments: [],
  selectedDate: null,
  selectedTime: null,
  isExistingClient: null,
  fullName: "",
  phone: "",
  phoneCode: "+27",
  email: "",
  address: "",
  referralSource: "",
  safetyAnswers: {},
  additionalNotes: "",
  existingClientNotes: "",
};

export const safetyQuestions = [
  { id: 1, question: "Any skin conditions in the treatment area?", detail: "Rashes, cuts, sunburn, eczema, acne, etc." },
  { id: 2, question: "Any medications or recent skin treatments?", detail: "Retinoids, blood thinners, chemical peels, laser, etc." },
  { id: 3, question: "Any known allergies to wax or beauty products?", detail: "Resins, latex, fragrances, oils, creams, etc." },
  { id: 4, question: "Are you currently pregnant?", detail: "" },
  { id: 5, question: "Any health conditions affecting skin, healing, or safety?", detail: "Diabetes, varicose veins, immune conditions, recent surgery, etc." },
  { id: 6, question: "Significant environmental exposure?", detail: "Sun, heat, chemicals, frequent water or sweat contact in the area." },
  { id: 7, question: "Frequent pressure or friction on areas to be waxed?", detail: "Due to work, sport, tight clothing, etc." },
  { id: 8, question: "At least 2 weeks of uninterrupted hair growth?", detail: "This is required for effective waxing results." },
];
