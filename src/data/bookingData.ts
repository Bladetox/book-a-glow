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

export const categories: Category[] = [
  { id: "waxing-intimate", label: "Waxing Intimate" },
  { id: "waxing-body", label: "Waxing Body" },
  { id: "waxing-face", label: "Waxing Face" },
  { id: "manicure-pedicure", label: "Manicure & Pedicure" },
  { id: "just-gel", label: "Just Gel" },
  { id: "extensions", label: "Extensions" },
  { id: "extras", label: "Extras" },
  { id: "tinting", label: "Tinting" },
  { id: "threading", label: "Threading" },
];

export const treatments: Treatment[] = [
  // Waxing Intimate
  { id: "hollywood", name: "Hollywood", description: "Full intimate waxing for those who love a smooth poonani", price: 400, duration: 60, category: "waxing-intimate" },
  { id: "brazilian", name: "Brazilian", description: "Brazilian waxing", price: 320, duration: 50, category: "waxing-intimate" },
  { id: "bikini-sides-top", name: "Bikini Sides & Top", description: "Bikini waxing", price: 280, duration: 40, category: "waxing-intimate" },
  { id: "areola", name: "Areola", description: "Areola waxing", price: 100, duration: 15, category: "waxing-intimate" },
  { id: "garden-path", name: "Garden Path", description: "Garden Path waxing", price: 90, duration: 15, category: "waxing-intimate" },
  { id: "underarm", name: "Underarm", description: "Underarm waxing", price: 90, duration: 15, category: "waxing-intimate" },

  // Waxing Body
  { id: "full-leg", name: "Full Leg", description: "Full leg waxing", price: 350, duration: 45, category: "waxing-body" },
  { id: "half-leg", name: "Half Leg", description: "Half leg waxing", price: 200, duration: 30, category: "waxing-body" },
  { id: "full-arm", name: "Full Arm", description: "Full arm waxing", price: 200, duration: 30, category: "waxing-body" },
  { id: "half-arm", name: "Half Arm", description: "Half arm waxing", price: 150, duration: 20, category: "waxing-body" },
  { id: "stomach", name: "Stomach", description: "Stomach waxing", price: 120, duration: 20, category: "waxing-body" },
  { id: "back", name: "Back", description: "Back waxing", price: 200, duration: 30, category: "waxing-body" },

  // Waxing Face
  { id: "lip", name: "Upper Lip", description: "Upper lip waxing", price: 60, duration: 10, category: "waxing-face" },
  { id: "chin", name: "Chin", description: "Chin waxing", price: 60, duration: 10, category: "waxing-face" },
  { id: "sides", name: "Sides of Face", description: "Sides of face waxing", price: 80, duration: 15, category: "waxing-face" },
  { id: "full-face-wax", name: "Full Face", description: "Full face waxing", price: 150, duration: 25, category: "waxing-face" },

  // Manicure & Pedicure
  { id: "gel-mani", name: "Gel Manicure", description: "Gel overlay manicure", price: 280, duration: 60, category: "manicure-pedicure" },
  { id: "gel-pedi", name: "Gel Pedicure", description: "Gel overlay pedicure", price: 300, duration: 60, category: "manicure-pedicure" },
  { id: "mani-pedi-combo", name: "Mani & Pedi Combo", description: "Combined gel manicure and pedicure", price: 500, duration: 105, category: "manicure-pedicure" },

  // Just Gel
  { id: "gel-overlay", name: "Gel Overlay", description: "Gel overlay on natural nails", price: 200, duration: 45, category: "just-gel" },
  { id: "gel-removal", name: "Gel Removal", description: "Safe gel removal", price: 80, duration: 20, category: "just-gel" },

  // Extensions
  { id: "full-set", name: "Full Set", description: "Full set nail extensions", price: 450, duration: 90, category: "extensions" },
  { id: "infills", name: "Infills", description: "Extension infills", price: 350, duration: 75, category: "extensions" },

  // Extras
  { id: "nail-art", name: "Nail Art", description: "Custom nail art per nail", price: 30, duration: 10, category: "extras" },
  { id: "nail-repair", name: "Nail Repair", description: "Single nail repair", price: 50, duration: 15, category: "extras" },

  // Tinting
  { id: "brow-tint", name: "Brow Tint", description: "Eyebrow tinting", price: 80, duration: 15, category: "tinting" },
  { id: "lash-tint", name: "Lash Tint", description: "Eyelash tinting", price: 100, duration: 20, category: "tinting" },
  { id: "brow-lash-tint", name: "Brow & Lash Tint", description: "Combined brow and lash tinting", price: 160, duration: 30, category: "tinting" },

  // Threading
  { id: "brow-thread", name: "Eyebrow Threading", description: "Eyebrow threading", price: 80, duration: 15, category: "threading" },
  { id: "lip-thread", name: "Upper Lip Threading", description: "Upper lip threading", price: 50, duration: 10, category: "threading" },
  { id: "full-face-thread", name: "Full Face Threading", description: "Full face threading", price: 150, duration: 30, category: "threading" },
];

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

export const availableTimes = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00",
];
