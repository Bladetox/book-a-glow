import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Minus, X,
  Scissors, Sparkles, HandMetal, PaintBucket, Eye, LayoutGrid, CalendarDays, Clock,
  MapPin, User, Phone, Mail, Palette, Star, ShieldCheck
} from "lucide-react";
import YocoImg from "@/assets/Yoco.svg";
import { businessThemes, getThemeCssVars, BusinessTheme } from "@/data/themes";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isToday, isSameDay
} from "date-fns";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type Service = { id: string; name: string; duration: number; price: number; category: string };
type Category = { id: string; label: string };
type TenantMeta = {
  name: string;
  tagline: string;
  splashWelcome: string;
  splashTagline1: string;
  splashTagline2: string;
  splashCta: string;
  location: string;
  Icon: React.ElementType;
  categories: Category[];
  services: Service[];
  referralOptions: string[];
};

/* ─────────────────────────────────────────────────────────────
   TENANT DATA — keyed by theme.id (7 real themes)
───────────────────────────────────────────────────────────── */
const TENANT_BY_ID: Record<string, TenantMeta> = {
  "makeup-artist": {
    name: "Brush & Veil",
    tagline: "Bridal & Editorial Makeup",
    splashWelcome: "Welcome to",
    splashTagline1: "Bridal · Editorial · Events",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book Your Appointment",
    location: "Cape Town, SA",
    Icon: Sparkles,
    categories: [
      { id: "bridal", label: "Bridal" },
      { id: "editorial", label: "Editorial" },
      { id: "event", label: "Events" },
    ],
    services: [
      { id: "1", name: "Bridal Glam",    duration: 90, price: 2800, category: "bridal" },
      { id: "2", name: "Trial Run",       duration: 60, price: 1500, category: "bridal" },
      { id: "3", name: "Editorial Look",  duration: 60, price: 1800, category: "editorial" },
      { id: "4", name: "Event Makeup",    duration: 45, price: 1200, category: "event" },
      { id: "5", name: "Natural Glow",    duration: 40, price:  900, category: "event" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "TikTok", "Walk-in"],
  },
  "beautician": {
    name: "Glow Studio",
    tagline: "Facials, Skincare & Waxing",
    splashWelcome: "Welcome to",
    splashTagline1: "Facials · Waxing · Skincare",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book Your Treatment",
    location: "Cape Town, SA",
    Icon: Sparkles,
    categories: [
      { id: "facials", label: "Facials" },
      { id: "waxing", label: "Waxing" },
      { id: "body", label: "Body" },
    ],
    services: [
      { id: "1", name: "Signature Facial",  duration: 60, price:  950, category: "facials" },
      { id: "2", name: "Microdermabrasion", duration: 50, price: 1100, category: "facials" },
      { id: "3", name: "Full Leg Wax",      duration: 40, price:  550, category: "waxing" },
      { id: "4", name: "Brazilian Wax",     duration: 30, price:  450, category: "waxing" },
      { id: "5", name: "Back Treatment",    duration: 45, price:  800, category: "body" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "Referral", "Walk-in"],
  },
  "tattoo-artist": {
    name: "Ink Vault Studio",
    tagline: "Custom Tattoo Artists",
    splashWelcome: "Welcome to",
    splashTagline1: "Custom · Flash · Touch-ups",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book a Session",
    location: "Cape Town, SA",
    Icon: HandMetal,
    categories: [
      { id: "custom", label: "Custom" },
      { id: "flash", label: "Flash" },
      { id: "other", label: "Other" },
    ],
    services: [
      { id: "1", name: "Custom Sleeve",   duration: 180, price: 3500, category: "custom" },
      { id: "2", name: "Custom Piece",    duration:  90, price: 1800, category: "custom" },
      { id: "3", name: "Flash Piece",     duration:  60, price: 1200, category: "flash" },
      { id: "4", name: "Touch-up",        duration:  45, price:  800, category: "other" },
      { id: "5", name: "Consultation",    duration:  30, price:  300, category: "other" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "TikTok", "Walk-in"],
  },
  "lash-tech": {
    name: "Luxe Lash Co.",
    tagline: "Lash Extensions, Lifts & Tinting",
    splashWelcome: "Welcome to",
    splashTagline1: "Extensions · Lifts · Tinting",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book Your Lash Appointment",
    location: "Cape Town, SA",
    Icon: Eye,
    categories: [
      { id: "extensions", label: "Extensions" },
      { id: "lifts", label: "Lifts" },
      { id: "maintenance", label: "Maintenance" },
    ],
    services: [
      { id: "1", name: "Classic Full Set",  duration: 90, price: 1400, category: "extensions" },
      { id: "2", name: "Volume Full Set",   duration: 120, price: 1800, category: "extensions" },
      { id: "3", name: "Lash Lift & Tint", duration: 60, price:  750, category: "lifts" },
      { id: "4", name: "Lash Infill",       duration: 60, price:  750, category: "maintenance" },
      { id: "5", name: "Lash Removal",      duration: 30, price:  350, category: "maintenance" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "Referral", "Walk-in"],
  },
  "barber": {
    name: "Blade & Co.",
    tagline: "Classic Barbershop",
    splashWelcome: "Welcome to",
    splashTagline1: "Cuts · Fades · Hot Towel Shaves",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book a Cut",
    location: "Cape Town, SA",
    Icon: Scissors,
    categories: [
      { id: "cuts", label: "Cuts" },
      { id: "shaves", label: "Shaves" },
      { id: "beard", label: "Beard" },
    ],
    services: [
      { id: "1", name: "Signature Fade",  duration: 45, price: 500, category: "cuts" },
      { id: "2", name: "Kids Cut",         duration: 30, price: 280, category: "cuts" },
      { id: "3", name: "Hot Towel Shave",  duration: 40, price: 450, category: "shaves" },
      { id: "4", name: "Beard Sculpt",     duration: 30, price: 350, category: "beard" },
      { id: "5", name: "Shape-up",         duration: 20, price: 200, category: "beard" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "Walk-in", "Drive-by"],
  },
  "nail-tech": {
    name: "Polish & Press",
    tagline: "Manicures, Gel & Nail Art",
    splashWelcome: "Welcome to",
    splashTagline1: "Gel · Acrylics · Nail Art",
    splashTagline2: "Cape Town, South Africa",
    splashCta: "Book a Nail Appointment",
    location: "Cape Town, SA",
    Icon: PaintBucket,
    categories: [
      { id: "manicure", label: "Manicure" },
      { id: "pedicure", label: "Pedicure" },
      { id: "art", label: "Nail Art" },
    ],
    services: [
      { id: "1", name: "Gel Manicure",    duration: 60, price:  600, category: "manicure" },
      { id: "2", name: "Acrylic Full Set", duration: 75, price:  850, category: "manicure" },
      { id: "3", name: "Gel Pedicure",    duration: 60, price:  550, category: "pedicure" },
      { id: "4", name: "Nail Art Session", duration: 90, price: 1100, category: "art" },
      { id: "5", name: "Press-On Set",    duration: 45, price:  700, category: "art" },
    ],
    referralOptions: ["Returning Client", "Instagram", "Google", "Friend", "TikTok", "Walk-in"],
  },
  "standard": {
    name: "NextSlot Demo",
    tagline: "Any Appointment-Based Service",
    splashWelcome: "Welcome to",
    splashTagline1: "Book · Manage · Grow",
    splashTagline2: "nextslot.co.za",
    splashCta: "Book an Appointment",
    location: "Cape Town, SA",
    Icon: LayoutGrid,
    categories: [
      { id: "standard", label: "Standard" },
      { id: "premium", label: "Premium" },
    ],
    services: [
      { id: "1", name: "Standard Session",  duration: 60, price:  800, category: "standard" },
      { id: "2", name: "Extended Session",  duration: 90, price: 1100, category: "standard" },
      { id: "3", name: "Express Session",   duration: 30, price:  500, category: "premium" },
      { id: "4", name: "Consultation",      duration: 30, price:  300, category: "premium" },
    ],
    referralOptions: ["Returning Client", "Google", "Instagram", "Friend", "Walk-in"],
  },
};

/* ─────────────────────────────────────────────────────────────
   DEMO CALENDAR HELPERS
───────────────────────────────────────────────────────────── */
const TIME_SLOTS = [
  "08:30","09:00","09:30","10:00","10:30","11:00",
  "13:00","13:30","14:00","14:30","15:00","15:30",
];

function isDemoAvailable(day: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isBefore(day, today) && !isToday(day)) return false;
  const dow = getDay(day);
  return dow >= 1 && dow <= 6;
}

/* ─────────────────────────────────────────────────────────────
   CSS VAR HELPERS
───────────────────────────────────────────────────────────── */
function toStyleVars(theme: BusinessTheme): React.CSSProperties {
  return Object.fromEntries(
    Object.entries(getThemeCssVars(theme)).map(([k, v]) => [k, v])
  ) as React.CSSProperties;
}

const S = {
  bg:          { background: "hsl(var(--background))" },
  card:        { background: "hsl(var(--card))" },
  primary:     { background: "hsl(var(--primary))" },
  primaryText: { color: "hsl(var(--primary))" },
  primaryFg:   { color: "hsl(var(--primary-foreground))" },
  fg:          { color: "hsl(var(--foreground))" },
  muted:       { color: "hsl(var(--muted-foreground))" },
  border:      { borderColor: "hsl(var(--border))" },
  secondary:   { background: "hsl(var(--secondary))" },
};

/* ─────────────────────────────────────────────────────────────
   SCREEN TYPE
   Mirrors the live public booking app (Book.tsx):
   splash → 4 steps (services, schedule, details, review) → confirmation.
   "theme" is a demo-only screen so visitors can preview other trades.
───────────────────────────────────────────────────────────── */
type Screen = "splash" | "theme" | "services" | "schedule" | "details" | "review" | "done";

const STEP_SCREENS: Screen[] = ["services", "schedule", "details", "review"];
const STEP_LABELS  = ["Services", "Schedule", "Details", "Review"];
const HOLD_SECONDS = 10 * 60;

const BookingAppPreview = () => {
  const [themeIdx, setThemeIdx]     = useState(0);
  const theme   = businessThemes[themeIdx];
  const cssVars = toStyleVars(theme);
  const tenant  = TENANT_BY_ID[theme.id] ?? TENANT_BY_ID["standard"];
  const TIcon   = tenant.Icon;
  const isDark  = parseFloat((theme.colors.background.split(/\s+/)[2] ?? "50").replace("%", "")) < 50;

  const [screen, setScreen] = useState<Screen>("splash");
  const stepIdx = STEP_SCREENS.indexOf(screen);

  const [referral, setReferral] = useState("");
  const [attempted, setAttempted] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // One entry per unit selected (same model as the live app) so quantities stack.
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [cartExpanded, setCartExpanded] = useState(false);

  const [currentMonth, setCurrentMonth]   = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]   = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen]   = useState(true);
  const [holdLeft, setHoldLeft]           = useState(HOLD_SECONDS);

  const [isExisting, setIsExisting]       = useState<boolean | null>(null);
  const [touched, setTouched]             = useState(false);
  const [form, setForm]                   = useState({ name: "", phone: "", email: "", address: "" });
  const [termsOpen, setTermsOpen]         = useState(false);

  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);

  // Slot hold countdown, as in the live Schedule step.
  useEffect(() => {
    if (!selectedTime || screen === "done") return;
    setHoldLeft(HOLD_SECONDS);
    const id = setInterval(() => setHoldLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [selectedTime, screen]);

  const activeCat = activeCategory ?? (tenant.categories[0]?.id ?? null);
  const visibleServices = activeCat
    ? tenant.services.filter(s => s.category === activeCat)
    : tenant.services;

  const qtyFor = (id: string) => selectedTreatments.filter(x => x === id).length;
  const uniqueIds = Array.from(new Set(selectedTreatments));
  const cartItems = uniqueIds.flatMap(id => {
    const svc = tenant.services.find(s => s.id === id);
    return svc ? [{ svc, qty: qtyFor(id) }] : [];
  });
  const totalPrice    = cartItems.reduce((n, { svc, qty }) => n + svc.price * qty, 0);
  const totalDuration = cartItems.reduce((n, { svc, qty }) => n + svc.duration * qty, 0);
  const depositAmt    = Math.ceil(totalPrice * 0.3);
  const balanceAmt    = totalPrice - depositAmt;

  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth()    === today.getMonth();
  const days           = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  const detailsValid =
    isExisting !== null && !!form.name.trim() && !!form.phone.trim() &&
    /\S+@\S+\.\S+/.test(form.email) && !!form.address.trim();

  const canProceed = (() => {
    if (screen === "services")  return selectedTreatments.length > 0;
    if (screen === "schedule")  return !!selectedDate && !!selectedTime;
    if (screen === "details")   return detailsValid;
    return true;
  })();

  const goNext = () => {
    if (screen === "details" && !detailsValid) { setTouched(true); return; }
    if (!canProceed) return;
    if (screen === "services") setScreen("schedule");
    else if (screen === "schedule") setScreen("details");
    else if (screen === "details") setScreen("review");
    else if (screen === "review") setScreen("done");
  };
  const goPrev = () => {
    if (screen === "review") setScreen("details");
    else if (screen === "details") setScreen("schedule");
    else if (screen === "schedule") setScreen("services");
  };

  const resetAll = () => {
    setScreen("splash");
    setReferral(""); setAttempted(false);
    setSelectedTreatments([]); setActiveCategory(null); setCartExpanded(false);
    setSelectedDate(null); setSelectedTime(null); setCalendarOpen(true);
    setCurrentMonth(new Date());
    setIsExisting(null); setTouched(false);
    setForm({ name: "", phone: "", email: "", address: "" });
  };

  const addTreatment    = (id: string) => setSelectedTreatments(p => [...p, id]);
  const removeTreatment = (id: string) => setSelectedTreatments(p => {
    const i = p.lastIndexOf(id);
    return i === -1 ? p : [...p.slice(0, i), ...p.slice(i + 1)];
  });

  const mm = String(Math.floor(holdLeft / 60)).padStart(2, "0");
  const ss = String(holdLeft % 60).padStart(2, "0");

  /* ════════════════════════════════════════════════════════════
     SPLASH SCREEN — referral source is required, like the live app
  ═══════════════════════════════════════════════════════════ */
  if (screen === "splash") {
    const picked = referral.trim().length > 0;
    const err = attempted && !picked;
    const subtle  = isDark ? "rgba(255,255,255,0.38)" : "hsl(var(--muted-foreground))";
    const faint   = isDark ? "rgba(255,255,255,0.18)" : "hsl(var(--muted-foreground) / 0.6)";
    const chipOn  = isDark ? "rgba(255,255,255,0.35)" : "hsl(var(--primary) / 0.5)";
    const chipOff = isDark ? "rgba(255,255,255,0.08)" : "hsl(var(--border))";
    return (
      <div
        className="relative flex flex-col items-center w-full overflow-y-auto"
        style={{ ...cssVars, ...S.bg, minHeight: "100%" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 90% 55% at 15% 5%, hsl(var(--primary) / 0.07) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 85% 90%, hsl(var(--primary) / 0.05) 0%, transparent 60%)",
        }} />
        <div className="relative flex flex-col items-center w-full px-6 pt-14 pb-8">
          <div
            className="w-[76px] h-[76px] rounded-[24px] flex items-center justify-center mb-6"
            style={{
              background: isDark ? "rgba(255,255,255,0.055)" : "hsl(var(--card))",
              boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <TIcon className="w-8 h-8" style={S.fg} />
          </div>

          <p className="text-[9px] font-bold tracking-[0.5em] uppercase mb-2" style={{ color: subtle }}>
            {tenant.splashWelcome}
          </p>
          <h1 className="font-bold text-center tracking-tight mb-4" style={{ ...S.fg, fontSize: "clamp(1.7rem,7vw,2.2rem)", lineHeight: 1.1 }}>
            {tenant.name}
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-1 text-center" style={{ color: subtle }}>
            {tenant.splashTagline1}
          </p>
          <p className="text-[10px] font-medium tracking-[0.3em] uppercase text-center" style={{ color: faint }}>
            {tenant.splashTagline2}
          </p>
          <div className="mt-6 mb-6" style={{ width: 48, height: 1, background: "hsl(var(--border))" }} />

          <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-center mb-1" style={{ color: subtle }}>
            Where did you hear about us?
            <span style={{ color: err ? "rgba(255,100,100,0.85)" : faint }}> *</span>
          </p>
          <p className="text-[8px] text-center mb-3 tracking-wide" style={{ color: err ? "rgba(255,120,120,0.85)" : faint }}>
            {err ? "Please select an option to continue" : "Scroll to see all options"}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full [&::-webkit-scrollbar]:hidden -mx-6 px-6">
            {tenant.referralOptions.map(opt => (
              <button
                key={opt}
                onClick={() => { setReferral(referral === opt ? "" : opt); setAttempted(false); }}
                className="shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200"
                style={{
                  border: `1px solid ${referral === opt ? chipOn : err ? "rgba(255,100,100,0.25)" : chipOff}`,
                  background: referral === opt ? "hsl(var(--primary) / 0.1)" : "transparent",
                  color: referral === opt ? "hsl(var(--foreground))" : err ? "rgba(255,120,120,0.7)" : "hsl(var(--muted-foreground))",
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={() => (picked ? setScreen("services") : setAttempted(true))}
            className="mt-8 w-full px-8 py-4 rounded-2xl text-[10px] font-bold tracking-[0.28em] uppercase transition-all duration-300"
            style={{
              background: picked ? "hsl(var(--primary) / 0.1)" : "hsl(var(--foreground) / 0.03)",
              border: `1px solid ${picked ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
              color: picked ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.6)",
              cursor: picked ? "pointer" : "default",
            }}
          >
            {tenant.splashCta}
          </button>

          <p className="mt-5 text-[8px] tracking-[0.2em]" style={{ color: faint }}>
            Powered by <span style={{ color: "hsl(var(--primary))" }}>nextslot.co.za</span>
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     CONFIRMATION — same sections as the live BookingConfirmation
  ═══════════════════════════════════════════════════════════ */
  if (screen === "done") {
    return (
      <div className="flex flex-col gap-6 px-5 py-8 text-left" style={{ ...cssVars, ...S.bg, minHeight: "100%" }}>
        <h2 className="font-display text-2xl font-bold text-center" style={S.fg}>Your booking is confirmed</h2>
        <p className="text-sm italic text-center" style={S.muted}>I see you choosing you.</p>
        <p className="text-sm leading-relaxed" style={S.muted}>
          Thank you for your booking{form.name ? `, ${form.name.split(" ")[0]}` : ""}. A confirmation is on its way to your email.
        </p>

        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>What happens next</h4>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold" style={S.fg}>The Arrival</span>
            <span className="text-sm" style={S.muted}>
              I'll be arriving on {selectedDate ? format(selectedDate, "EEEE, d MMMM yyyy") : "TBC"} at {selectedTime ?? "TBC"}.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold" style={S.fg}>The Space</span>
            <span className="text-sm" style={S.muted}>{form.address || "To be confirmed"}</span>
            <span className="text-sm" style={S.muted}>Just find a spot where you feel most comfortable, and I'll handle the rest.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold" style={S.fg}>The Intent</span>
            <span className="text-sm" style={S.muted}>Bring nothing but yourself.</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={S.muted}>We look forward to seeing you.</p>
        <p className="text-sm font-semibold" style={S.fg}>Thank you.</p>

        <button onClick={resetAll} className="btn-back w-full">Start over</button>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     THEME PICKER — demo only (the live app sets the theme per business)
  ═══════════════════════════════════════════════════════════ */
  if (screen === "theme") {
    return (
      <div className="flex flex-col" style={{ ...cssVars, ...S.bg, minHeight: "100%" }}>
        <div className="px-6 pt-8 pb-5 text-center">
          <h1 className="text-lg font-bold" style={S.fg}>Preview another business</h1>
          <p className="text-xs mt-1" style={S.muted}>Demo only. Every business gets its own theme.</p>
        </div>

        <div className="flex-1 px-5 space-y-2.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {businessThemes.map((bt, i) => {
            const btVars  = toStyleVars(bt);
            const meta    = TENANT_BY_ID[bt.id] ?? TENANT_BY_ID["standard"];
            const BtIcon  = meta.Icon;
            const isActive = themeIdx === i;
            return (
              <button
                key={bt.id}
                onClick={() => { setThemeIdx(i); setActiveCategory(null); setSelectedTreatments([]); }}
                className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200"
                style={{
                  background: isActive ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                  border: isActive ? "2px solid hsl(var(--primary))" : "2px solid hsl(var(--border))",
                }}
              >
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ ...btVars, background: "hsl(var(--primary))" }}>
                  <BtIcon style={{ color: "hsl(var(--primary-foreground))", width: 18, height: 18 }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={S.fg}>{bt.label}</p>
                  <p className="text-[11px] truncate" style={S.muted}>{meta.name} · {bt.vibe}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 pb-4 pt-3">
          <button onClick={() => setScreen("splash")} className="btn-next w-full">
            Open booking page
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     BOOKING FLOW — header, step indicator, body, bottom bar
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col" style={{ ...cssVars, ...S.bg, minHeight: "100%" }}>

      {/* COMPACT HEADER */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl glass-card flex-shrink-0 flex items-center justify-center">
            <TIcon style={{ ...S.fg, width: 16, height: 16 }} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate" style={S.fg}>{tenant.name}</p>
            <p className="text-[10px] font-medium tracking-wide truncate leading-tight mt-0.5" style={S.muted}>{tenant.tagline}</p>
          </div>
        </div>
        <button
          onClick={() => setScreen("theme")}
          className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
          style={S.muted}
          aria-label="Demo: preview another business theme"
        >
          <Palette className="w-3 h-3" /> Demo
        </button>
      </div>

      {/* STEP INDICATOR */}
      <div className="flex-shrink-0 px-2 py-3 border-b border-border/20">
        <div className="flex items-center justify-between w-full px-4">
          {STEP_LABELS.map((label, i) => {
            const status = i < stepIdx ? "completed" : i === stepIdx ? "active" : "upcoming";
            return (
              <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full flex items-center">
                  <div className={`h-0.5 flex-1 transition-colors duration-300 ${i === 0 ? "bg-transparent" : i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                  <div className={`step-indicator ${status}`}>{i + 1}</div>
                  <div className={`h-0.5 flex-1 transition-colors duration-300 ${i === STEP_LABELS.length - 1 ? "bg-transparent" : i < stepIdx ? "bg-primary" : "bg-muted"}`} />
                </div>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className="w-full px-4 pt-4 pb-6">

          {/* SERVICES */}
          {screen === "services" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>Select a service</h3>
                {selectedTreatments.length > 0 && (
                  <span className="text-[10px] font-semibold" style={S.primaryText}>{selectedTreatments.length} selected</span>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden -mx-1 px-1">
                {tenant.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`category-pill whitespace-nowrap shrink-0 transition-all duration-200 ${activeCat === cat.id ? "active" : ""}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {visibleServices.map(t => {
                  const qty = qtyFor(t.id);
                  const isSel = qty > 0;
                  return (
                    <div
                      key={t.id}
                      className={`glass-card-service rounded-xl px-4 py-3.5 flex items-center gap-3 w-full transition-all duration-150 ${isSel ? "selected" : ""}`}
                      style={isSel ? { borderColor: "hsl(var(--primary))" } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold leading-snug" style={S.fg}>{t.name}</span>
                        <span className="block text-[10px] leading-snug mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t.duration} min</span>
                      </div>
                      <span className="shrink-0 text-sm font-bold" style={S.fg}>R{t.price}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => removeTreatment(t.id)}
                              aria-label={`Remove one ${t.name}`}
                              className="w-7 h-7 rounded-full flex items-center justify-center border border-muted-foreground/30 bg-transparent text-muted-foreground"
                            >
                              <Minus className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                            <span className="w-4 text-center text-sm font-bold" style={S.fg}>{qty}</span>
                          </>
                        )}
                        <button
                          onClick={() => addTreatment(t.id)}
                          aria-label={`Add one ${t.name}`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${isSel ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent text-muted-foreground"}`}
                          style={isSel ? S.primaryFg : undefined}
                        >
                          <Plus className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCHEDULE */}
          {screen === "schedule" && (
            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>Choose date &amp; time</h3>

              {selectedTime && (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" style={S.primaryText} />
                  <p className="text-xs" style={S.muted}>
                    Slot held for <span className="font-semibold tabular-nums" style={S.fg}>{mm}:{ss}</span> — complete your booking before it expires
                  </p>
                </div>
              )}

              {selectedDate && !calendarOpen && (
                <button
                  onClick={() => setCalendarOpen(true)}
                  className="glass-card-service rounded-2xl px-4 py-3 flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 shrink-0" style={S.primaryText} />
                    <div>
                      <p className="text-sm font-semibold" style={S.fg}>{format(selectedDate, "EEEE, d MMMM yyyy")}</p>
                      <p className="text-[11px] mt-0.5" style={S.muted}>Tap to change date</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4" style={S.muted} />
                </button>
              )}

              {calendarOpen && (
                <div className="glass-card-service rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      disabled={isCurrentMonth}
                      onClick={() => !isCurrentMonth && setCurrentMonth(subMonths(currentMonth, 1))}
                      aria-label="Previous month"
                      className={`p-1.5 rounded-full transition-colors ${isCurrentMonth ? "text-muted-foreground/20 cursor-not-allowed" : "text-muted-foreground"}`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-display text-base font-semibold" style={S.fg}>{format(currentMonth, "MMMM yyyy")}</span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      aria-label="Next month"
                      className="p-1.5 rounded-full text-muted-foreground"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                      <span key={d} className="text-[10px] font-semibold uppercase" style={S.muted}>{d}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                    {days.map(day => {
                      const isPast   = isBefore(day, today) && !isToday(day);
                      const isAvail  = isDemoAvailable(day);
                      const isActive = selectedDate ? isSameDay(day, selectedDate) : false;
                      return (
                        <button
                          key={day.toISOString()}
                          disabled={isPast}
                          onClick={() => { setSelectedDate(day); setSelectedTime(null); setCalendarOpen(false); }}
                          className={`w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200 ${
                            isPast ? "text-muted-foreground/20 cursor-not-allowed"
                              : !isAvail ? "text-muted-foreground/30"
                              : isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                              : "text-foreground"
                          } ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : ""}`}
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedDate && !calendarOpen && (
                <div>
                  <h4 className="text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={S.muted}>Available times</h4>
                  {isDemoAvailable(selectedDate) ? (
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                            selectedTime === slot ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "glass-card-service text-foreground"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-center py-4" style={S.muted}>No slots available — tap the date above to pick another</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DETAILS */}
          {screen === "details" && (
            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>Your details</h3>

              <div>
                <p className="text-sm mb-3" style={S.fg}>Have you booked with us before?</p>
                <div className="flex gap-3">
                  {[
                    { label: "Existing client", value: true,  Icon: Star },
                    { label: "New client",      value: false, Icon: Sparkles },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setIsExisting(opt.value)}
                      className={`flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        isExisting === opt.value ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "glass-card-service text-foreground"
                      }`}
                    >
                      <opt.Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                {isExisting === null && touched && (
                  <p className="text-[11px] text-destructive mt-2">Please select one to continue</p>
                )}
              </div>

              {isExisting === false && (
                <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={S.fg}>
                    <ShieldCheck className="w-4 h-4" /> New client safety check
                  </h4>
                  <p className="text-xs" style={S.muted}>A short health questionnaire is part of your confirmation.</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {([
                  { icon: User,   key: "name",    placeholder: "Full Name *",             type: "text",  pad: "pl-10" },
                  { icon: Phone,  key: "phone",   placeholder: "e.g. 82 123 4567 *",      type: "tel",   pad: "pl-[4.75rem]" },
                  { icon: Mail,   key: "email",   placeholder: "Email Address *",         type: "email", pad: "pl-10" },
                  { icon: MapPin, key: "address", placeholder: "Home Address *",          type: "text",  pad: "pl-10" },
                ] as { icon: React.ElementType; key: keyof typeof form; placeholder: string; type: string; pad: string }[]).map(f => (
                  <div key={f.key} className="relative">
                    <f.icon className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                    {f.key === "phone" && (
                      <span className="absolute left-9 top-0 h-full flex items-center text-sm" style={S.fg}>+27</span>
                    )}
                    <input
                      id={`preview-${f.key}`}
                      name={f.key}
                      type={f.type}
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={`w-full glass-input rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ${f.pad}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVIEW */}
          {screen === "review" && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-[17px] font-bold leading-tight" style={S.fg}>Review your booking</h2>
                <p className="text-xs mt-0.5" style={S.muted}>Check everything looks right before confirming.</p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-border/30">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={S.muted}>Services</p>
                </div>
                <div className="divide-y divide-border/20">
                  {cartItems.map(({ svc, qty }) => (
                    <div key={svc.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium" style={S.fg}>{svc.name}{qty > 1 ? ` x${qty}` : ""}</p>
                        <p className="text-[11px]" style={S.muted}>{svc.duration * qty} min</p>
                      </div>
                      <p className="text-sm font-semibold" style={S.fg}>R{(svc.price * qty).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/20">
                  <p className="text-sm font-bold" style={S.fg}>Total</p>
                  <p className="text-sm font-bold" style={S.fg}>R{totalPrice.toLocaleString()}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-border/30">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={S.muted}>Appointment</p>
                </div>
                <div className="divide-y divide-border/20">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm" style={S.muted}>Date</p>
                    <p className="text-sm font-medium" style={S.fg}>{selectedDate ? format(selectedDate, "EEE d MMM yyyy") : "—"}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm" style={S.muted}>Time</p>
                    <p className="text-sm font-medium" style={S.fg}>{selectedTime ?? "—"}</p>
                  </div>
                  <div className="flex items-start justify-between px-4 py-2.5">
                    <p className="text-sm shrink-0 pt-0.5" style={S.muted}>Location</p>
                    <p className="text-sm font-medium text-right ml-3" style={S.fg}>{form.address || "Your address"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-border/30">
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={S.muted}>Payment</p>
                </div>
                <div className="divide-y divide-border/20">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm" style={S.muted}>Deposit due now (30%)</p>
                    <p className="text-sm font-semibold" style={S.primaryText}>R{depositAmt.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm" style={S.muted}>Balance on the day</p>
                    <p className="text-sm font-medium" style={S.fg}>R{balanceAmt.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm" style={S.muted}>Pay with</p>
                    <img src={YocoImg} alt="Yoco" className="h-5 w-auto object-contain" />
                  </div>
                </div>
              </div>

              <button onClick={() => setTermsOpen(v => !v)} className="text-xs underline underline-offset-2 text-left" style={S.muted}>
                {termsOpen ? "Hide" : "View"} terms &amp; conditions
              </button>
              {termsOpen && (
                <p className="text-xs leading-relaxed rounded-2xl border border-border/50 bg-muted/20 p-4" style={S.muted}>
                  Demo terms: deposits secure your slot and are non-refundable within 48 hours of the appointment.
                  Each business sets its own terms, shown here before the client pays.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div>
        {screen === "services" && cartItems.length > 0 && (
          <div>
            <button
              onClick={() => setCartExpanded(v => !v)}
              className="w-full flex items-center justify-between px-4 pt-3 pb-2 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={S.fg}>
                  {selectedTreatments.length} {selectedTreatments.length === 1 ? "service" : "services"}
                </span>
                <span className="text-[10px]" style={S.muted}>· {totalDuration} min · R{totalPrice}</span>
              </div>
              <span style={S.muted}>{cartExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</span>
            </button>
            {cartExpanded && (
              <div className="px-4 pb-2 flex flex-col gap-1.5">
                {cartItems.map(({ svc, qty }) => (
                  <div key={svc.id} className="flex items-center gap-2">
                    <button
                      onClick={() => removeTreatment(svc.id)}
                      aria-label={`Remove ${svc.name}`}
                      className="w-5 h-5 rounded-full flex items-center justify-center border border-muted-foreground/30 text-muted-foreground"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    <span className="flex-1 min-w-0 text-xs font-medium truncate" style={S.fg}>
                      {svc.name}{qty > 1 && <span className="ml-1" style={S.muted}>×{qty}</span>}
                    </span>
                    <span className="text-[10px] shrink-0" style={S.muted}>{svc.duration * qty} min</span>
                    <span className="text-xs font-semibold shrink-0" style={S.fg}>R{svc.price * qty}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-1.5 mt-0.5 flex items-center justify-between">
                  <span className="text-[10px]" style={S.muted}>{totalDuration} min total</span>
                  <span className="text-xs font-bold" style={S.fg}>R{totalPrice}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pb-4 pt-2 flex gap-3">
          {stepIdx > 0 && <button className="btn-back flex-1" onClick={goPrev}>Back</button>}
          {screen === "review" ? (
            <button className="btn-next flex-1 flex items-center justify-center gap-2.5" onClick={goNext}>
              <img src={YocoImg} alt="" className="h-4 w-auto object-contain shrink-0 invert" />
              <span>Confirm &amp; Pay Deposit R{depositAmt.toLocaleString()}</span>
            </button>
          ) : (
            <button className="btn-next flex-1" onClick={goNext} disabled={!canProceed && screen !== "details"}>
              {screen === "details" ? "Review" : "Next"}
            </button>
          )}
        </div>
        <p className="text-[9px] text-center pb-3 tracking-[0.12em]" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
          Powered by nextslot.co.za
        </p>
      </div>
    </div>
  );
};

export default BookingAppPreview;
