import {
  Scissors,
  Sparkles,
  Palette,
  Pen,
  Eye,
  Hand,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SuggestedService {
  name: string;
  price: string;
  duration: string;
}

export interface OnboardingTheme {
  icon: LucideIcon;
  label: string;
  desc: string;
  vibe: string;
  suggestedServices: SuggestedService[];
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
    gradientHero: string;
    gradientCard: string;
    gradientSurface: string;
  };
}

export const businessThemes: OnboardingTheme[] = [
  {
    icon: Palette,
    label: "Makeup Artist",
    desc: "Bridal, editorial, events",
    vibe: "Professional, Focused",
    suggestedServices: [
      { name: "Full Glam", price: "800", duration: "120" },
      { name: "Natural Look", price: "500", duration: "60" },
      { name: "Touch-Up", price: "250", duration: "30" },
    ],
    colors: {
      background: "30 45% 88%",
      foreground: "0 0% 7%",
      card: "30 38% 84%",
      cardForeground: "0 0% 7%",
      primary: "0 0% 7%",
      primaryForeground: "30 45% 95%",
      secondary: "30 32% 82%",
      secondaryForeground: "0 0% 7%",
      muted: "30 28% 83%",
      mutedForeground: "0 0% 35%",
      accent: "38 55% 60%",
      accentForeground: "0 0% 7%",
      border: "30 30% 75%",
      input: "30 30% 77%",
      ring: "338 60% 55%",
      gradientHero: "linear-gradient(180deg, hsl(30 45% 88%) 0%, hsl(30 38% 84%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(30 42% 86%) 0%, hsl(30 35% 83%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(30 42% 87%) 0%, hsl(30 32% 84%) 100%)",
    },
  },
  {
    icon: Sparkles,
    label: "Beautician",
    desc: "Facials, skincare, waxing",
    vibe: "Relaxing, Calm",
    suggestedServices: [
      { name: "Full Facial", price: "450", duration: "60" },
      { name: "Back Treatment", price: "380", duration: "45" },
      { name: "Wax — Full Legs", price: "300", duration: "45" },
    ],
    colors: {
      background: "80 25% 92%",
      foreground: "150 15% 12%",
      card: "80 20% 88%",
      cardForeground: "150 15% 12%",
      primary: "150 20% 28%",
      primaryForeground: "80 25% 96%",
      secondary: "80 18% 86%",
      secondaryForeground: "150 15% 12%",
      muted: "80 15% 87%",
      mutedForeground: "150 8% 42%",
      accent: "160 25% 65%",
      accentForeground: "150 15% 12%",
      border: "80 15% 80%",
      input: "80 15% 82%",
      ring: "150 20% 28%",
      gradientHero: "linear-gradient(180deg, hsl(80 25% 92%) 0%, hsl(80 20% 88%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(80 22% 90%) 0%, hsl(80 18% 87%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(80 22% 91%) 0%, hsl(80 16% 88%) 100%)",
    },
  },
  {
    icon: Pen,
    label: "Tattoo Artist",
    desc: "Custom ink, cover-ups, flash",
    vibe: "Bold, Edgy, Artistic",
    suggestedServices: [
      { name: "Small Tattoo", price: "600", duration: "60" },
      { name: "Medium Tattoo", price: "1200", duration: "120" },
      { name: "Consultation", price: "0", duration: "30" },
    ],
    colors: {
      background: "0 5% 5%",
      foreground: "0 0% 92%",
      card: "0 8% 10%",
      cardForeground: "0 0% 92%",
      primary: "0 80% 48%",
      primaryForeground: "0 0% 100%",
      secondary: "0 5% 13%",
      secondaryForeground: "0 0% 92%",
      muted: "0 5% 13%",
      mutedForeground: "0 0% 55%",
      accent: "0 80% 48%",
      accentForeground: "0 0% 100%",
      border: "0 8% 18%",
      input: "0 8% 18%",
      ring: "0 80% 48%",
      gradientHero: "linear-gradient(180deg, hsl(0 5% 5%) 0%, hsl(0 8% 3%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)",
    },
  },
  {
    icon: Eye,
    label: "Lash Tech",
    desc: "Extensions, lifts, tinting",
    vibe: "Feminine, Cozy",
    suggestedServices: [
      { name: "Classic Full Set", price: "550", duration: "90" },
      { name: "Lash Lift & Tint", price: "400", duration: "60" },
      { name: "Infill", price: "300", duration: "45" },
    ],
    colors: {
      background: "340 45% 86%",
      foreground: "340 20% 10%",
      card: "340 38% 82%",
      cardForeground: "340 20% 10%",
      primary: "340 35% 22%",
      primaryForeground: "340 45% 95%",
      secondary: "340 32% 80%",
      secondaryForeground: "340 20% 10%",
      muted: "340 28% 81%",
      mutedForeground: "340 12% 38%",
      accent: "270 40% 65%",
      accentForeground: "340 20% 10%",
      border: "340 28% 74%",
      input: "340 28% 76%",
      ring: "38 40% 65%",
      gradientHero: "linear-gradient(180deg, hsl(340 45% 86%) 0%, hsl(340 38% 82%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(340 42% 84%) 0%, hsl(340 35% 81%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(340 42% 85%) 0%, hsl(340 35% 82%) 100%)",
    },
  },
  {
    icon: Scissors,
    label: "Barber",
    desc: "Haircuts, fades, beard trims",
    vibe: "Classic, Masculine",
    suggestedServices: [
      { name: "Fade Cut", price: "150", duration: "30" },
      { name: "Beard Trim", price: "80", duration: "20" },
      { name: "Cut & Beard", price: "200", duration: "45" },
    ],
    colors: {
      background: "210 15% 15%",
      foreground: "210 10% 92%",
      card: "210 12% 20%",
      cardForeground: "210 10% 92%",
      primary: "0 65% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "210 12% 22%",
      secondaryForeground: "210 10% 92%",
      muted: "210 10% 22%",
      mutedForeground: "210 8% 58%",
      accent: "25 40% 40%",
      accentForeground: "0 0% 100%",
      border: "210 10% 26%",
      input: "210 10% 26%",
      ring: "0 65% 50%",
      gradientHero: "linear-gradient(180deg, hsl(210 15% 15%) 0%, hsl(210 12% 12%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(210 14% 18%) 0%, hsl(210 10% 15%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(210 14% 17%) 0%, hsl(210 10% 14%) 100%)",
    },
  },
  {
    icon: Hand,
    label: "Nail Tech",
    desc: "Manicures, gel, nail art",
    vibe: "Clean, Trendy",
    suggestedServices: [
      { name: "Gel Manicure", price: "280", duration: "60" },
      { name: "Acrylic Full Set", price: "450", duration: "90" },
      { name: "Nail Art Add-on", price: "150", duration: "30" },
    ],
    colors: {
      background: "330 38% 87%",
      foreground: "330 15% 8%",
      card: "330 32% 83%",
      cardForeground: "330 15% 8%",
      primary: "330 15% 8%",
      primaryForeground: "330 38% 95%",
      secondary: "330 28% 81%",
      secondaryForeground: "330 15% 8%",
      muted: "330 24% 82%",
      mutedForeground: "330 8% 38%",
      accent: "330 75% 55%",
      accentForeground: "0 0% 100%",
      border: "330 25% 75%",
      input: "330 25% 77%",
      ring: "38 50% 60%",
      gradientHero: "linear-gradient(180deg, hsl(330 38% 87%) 0%, hsl(330 32% 83%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(330 35% 85%) 0%, hsl(330 28% 82%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(330 35% 86%) 0%, hsl(330 28% 83%) 100%)",
    },
  },
  {
    icon: Briefcase,
    label: "Standard",
    desc: "Any appointment-based service",
    vibe: "Minimal, Zen, Unisex",
    suggestedServices: [
      { name: "Consultation", price: "0", duration: "30" },
      { name: "30-Min Session", price: "300", duration: "30" },
      { name: "1-Hour Session", price: "500", duration: "60" },
    ],
    colors: {
      background: "0 0% 100%",
      foreground: "0 0% 7%",
      card: "0 0% 96%",
      cardForeground: "0 0% 7%",
      primary: "0 0% 7%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 96%",
      secondaryForeground: "0 0% 7%",
      muted: "0 0% 96%",
      mutedForeground: "0 0% 45%",
      accent: "0 0% 85%",
      accentForeground: "0 0% 7%",
      border: "0 0% 90%",
      input: "0 0% 90%",
      ring: "0 0% 7%",
      gradientHero: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
    },
  },
];

export function getThemeCssVars(theme: OnboardingTheme): Record<string, string> {
  const c = theme.colors;
  return {
    "--background": c.background,
    "--foreground": c.foreground,
    "--card": c.card,
    "--card-foreground": c.cardForeground,
    "--popover": c.background,
    "--popover-foreground": c.foreground,
    "--primary": c.primary,
    "--primary-foreground": c.primaryForeground,
    "--secondary": c.secondary,
    "--secondary-foreground": c.secondaryForeground,
    "--muted": c.muted,
    "--muted-foreground": c.mutedForeground,
    "--accent": c.accent,
    "--accent-foreground": c.accentForeground,
    "--border": c.border,
    "--input": c.input,
    "--ring": c.ring,
    "--gradient-hero": c.gradientHero,
    "--gradient-card": c.gradientCard,
    "--gradient-surface": c.gradientSurface,
  };
}
