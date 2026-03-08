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
  name: "PhenomeBeauty",
  abbreviation: ".pb",
  tagline: "Mobile Beauty Studio",
  subtitle: "Premium At-Home Treatments",
  ctaLabel: "Select Your Treatments",
  signOff: "Toodles.",

  email: "phenomebeauty@gmail.co.za",
  phone: "74 511 5725",
  phoneCode: "+27",
  address: "14 Kunene Drive, Portlands, Cape Town",

  themeId: "standard",

  currency: "R",
  depositPercent: 50,
  ratePerKm: 3.6,
  defaultDistanceKm: 15,

  minNoticeHours: 24,
  maxAdvanceDays: 60,
  bookingRefPrefix: "",

  confirmationTitle: "A date with yourself",
  confirmationIntro: "I've received your deposit, and your space in my calendar is now officially held. This isn't just a booking; it's a promise you've made to yourself to pause, and I am so honored to be the one holding that space for you.",
  confirmationOutro: "Until then, keep choosing yourself in the small moments, too.",
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
