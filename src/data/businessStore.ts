import { useSyncExternalStore } from "react";

export interface BusinessConfig {
  // Branding
  name: string;
  abbreviation: string;        // e.g. ".pb" shown on splash
  tagline: string;              // e.g. "Mobile Beauty Studio"
  subtitle: string;             // e.g. "Premium At-Home Treatments"
  ctaLabel: string;             // e.g. "Select Your Treatments"
  signOff: string;              // e.g. "Toodles."

  // Contact
  email: string;
  phone: string;
  phoneCode: string;
  address: string;              // Origin address for call-out

  // Theme
  themeId: string;

  // Fees & Pricing
  currency: string;             // e.g. "R"
  depositPercent: number;       // 0–100
  ratePerKm: number;
  defaultDistanceKm: number;    // placeholder distance before Maps API

  // Booking rules
  minNoticeHours: number;
  maxAdvanceDays: number;
  bookingRefPrefix: string;

  // Confirmation page
  confirmationTitle: string;
  confirmationIntro: string;
  confirmationOutro: string;
}

export const defaultBusinessConfig: BusinessConfig = {
  name: "NextSlot",
  abbreviation: ".ns",
  tagline: "Booking Made Simple",
  subtitle: "Professional Services",
  ctaLabel: "Book Now",
  signOff: "Thank you.",

  email: "hello@nextslot.co.za",
  phone: "",
  phoneCode: "+27",
  address: "",

  themeId: "standard",

  currency: "R",
  depositPercent: 50,
  ratePerKm: 3.6,
  defaultDistanceKm: 15,

  minNoticeHours: 24,
  maxAdvanceDays: 60,
  bookingRefPrefix: "",

  confirmationTitle: "Your booking is confirmed",
  confirmationIntro: "Thank you for your booking. Your deposit has been received and your appointment is now confirmed.",
  confirmationOutro: "We look forward to seeing you.",
};

const STORAGE_KEY = "ns_business_config";

let cache: BusinessConfig | null = null;
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function getBusinessConfig(): BusinessConfig {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...defaultBusinessConfig, ...JSON.parse(raw) } : { ...defaultBusinessConfig };
  } catch {
    cache = { ...defaultBusinessConfig };
  }
  return cache!;
}

export function saveBusinessConfig(config: Partial<BusinessConfig>) {
  const current = getBusinessConfig();
  cache = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  notify();
}

export function resetBusinessConfig() {
  cache = { ...defaultBusinessConfig };
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

// React hook
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useBusinessConfig(): BusinessConfig {
  return useSyncExternalStore(subscribe, getBusinessConfig, getBusinessConfig);
}
