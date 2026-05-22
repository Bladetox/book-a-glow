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

// consultationAnswers: keyed by question `key` (string).
// Value is string (text/textarea), boolean (yes_no), or string[] (checkbox).
export type ConsultationAnswerValue = string | boolean | string[];

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
  addressVerified: boolean; // true only when address was selected from Google Places
  distanceKm: number | null;
  referralSource: string;
  // ── Legacy waxing-specific safety form (used by ReviewStep → create_booking_with_consultation) ──
  safetyAnswers: Record<number, boolean | null>;
  safetyAnswerDetails: Record<number, string>;
  additionalNotes: string;
  existingClientNotes: string;
  // ── Dynamic consultation form (Stage 5+) ──
  // Keyed by ConsultationQuestionDefinition.key
  consultationAnswers: Record<string, ConsultationAnswerValue>;
  consultationAnswerDetails: Record<string, string>; // extra detail for yes_no "Yes" answers
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
  addressVerified: false,
  distanceKm: null,
  referralSource: "",
  safetyAnswers: {},
  safetyAnswerDetails: {},
  additionalNotes: "",
  existingClientNotes: "",
  consultationAnswers: {},
  consultationAnswerDetails: {},
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
