import { useSyncExternalStore } from "react";
import { Treatment, Category, treatments as defaultTreatments, categories as defaultCategories } from "./bookingData";

const TREATMENTS_KEY = "pb_treatments";
const CATEGORIES_KEY = "pb_categories";

let treatmentsCache: Treatment[] | null = null;
let categoriesCache: Category[] | null = null;
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function getTreatments(): Treatment[] {
  if (treatmentsCache) return treatmentsCache;
  try {
    const raw = localStorage.getItem(TREATMENTS_KEY);
    treatmentsCache = raw ? JSON.parse(raw) : [...defaultTreatments];
  } catch {
    treatmentsCache = [...defaultTreatments];
  }
  return treatmentsCache!;
}

export function getCategories(): Category[] {
  if (categoriesCache) return categoriesCache;
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    categoriesCache = raw ? JSON.parse(raw) : [...defaultCategories];
  } catch {
    categoriesCache = [...defaultCategories];
  }
  return categoriesCache!;
}

export function saveTreatments(treatments: Treatment[]) {
  treatmentsCache = treatments;
  localStorage.setItem(TREATMENTS_KEY, JSON.stringify(treatments));
  notify();
}

export function saveCategories(categories: Category[]) {
  categoriesCache = categories;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  notify();
}

export function resetToDefaults() {
  treatmentsCache = [...defaultTreatments];
  categoriesCache = [...defaultCategories];
  localStorage.removeItem(TREATMENTS_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
  notify();
}

// React hooks
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTreatments(): Treatment[] {
  return useSyncExternalStore(subscribe, getTreatments, getTreatments);
}

export function useCategories(): Category[] {
  return useSyncExternalStore(subscribe, getCategories, getCategories);
}
