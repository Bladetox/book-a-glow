import { useState, useMemo } from "react";
import {
  Check, ChevronLeft, ChevronRight,
  Scissors, Sparkles, HandMetal, PaintBucket, Eye, LayoutGrid,
  MapPin, User, Phone, Mail, Loader2, Palette, Star, ShieldCheck
} from "lucide-react";
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
   We fake availability so the calendar feels real:
   - All days from tomorrow onwards in the current & next month
     that fall Mon–Sat are "available".
   - Time slots are a fixed list (mirrors the real app grid).
───────────────────────────────────────────────────────────── */
const TIME_SLOTS = [
  "08:30","09:00","09:30","10:00","10:30","11:00",
  "13:00","13:30","14:00","14:30","15:00","15:30",
];

function isDemoAvailable(day: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isBefore(day, today) && !isToday(day)) return false;
  const dow = getDay(day); // 0=Sun, 6=Sat
  return dow >= 1 && dow <= 6; // Mon–Sat
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
───────────────────────────────────────────────────────────── */
type Screen = "splash" | "theme" | "services" | "schedule" | "details" | "review" | "done";

const STEP_SCREENS: Screen[] = ["services", "schedule", "details", "review"];
const STEP_LABELS  = ["Services", "Schedule", "Details", "Review"];

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const BookingAppPreview = () => {
  // ── theme
  const [themeIdx, setThemeIdx]     = useState(0);
  const theme   = businessThemes[themeIdx];
  const cssVars = toStyleVars(theme);
  const tenant  = TENANT_BY_ID[theme.id] ?? TENANT_BY_ID["standard"];
  const TIcon   = tenant.Icon;

  // ── navigation
  const [screen, setScreen] = useState<Screen>("splash");
  const stepIdx = STEP_SCREENS.indexOf(screen); // -1 when not in booking flow

  // ── splash
  const [referral, setReferral] = useState("");

  // ── services
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  // ── schedule
  const [currentMonth, setCurrentMonth]   = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]   = useState<string | null>(null);

  // ── details
  const [isExisting, setIsExisting]       = useState<boolean | null>(null);
  const [form, setForm]                   = useState({ name: "", phone: "", email: "", address: "" });

  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);

  // ── derived
  const activeCat = activeCategory ?? (tenant.categories[0]?.id ?? null);
  const visibleServices = activeCat
    ? tenant.services.filter(s => s.category === activeCat)
    : tenant.services;

  const selectedServiceObjects = tenant.services.filter(s => selectedTreatments.includes(s.id));
  const totalPrice    = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.duration, 0);
  const depositAmt    = Math.ceil(totalPrice * 0.3);
  const balanceAmt    = totalPrice - depositAmt;

  // calendar
  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth()    === today.getMonth();
  const monthStart     = startOfMonth(currentMonth);
  const monthEnd       = endOfMonth(currentMonth);
  const days           = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // canProceed per step
  const canProceed = (() => {
    if (screen === "services")  return selectedTreatments.length > 0;
    if (screen === "schedule")  return !!selectedDate && !!selectedTime;
    if (screen === "details")   return isExisting !== null && !!form.name && !!form.phone && !!form.email;
    return true;
  })();

  const goNext = () => {
    if (screen === "services")  { setScreen("schedule"); return; }
    if (screen === "schedule")  { setScreen("details");  return; }
    if (screen === "details")   { setScreen("review");   return; }
    if (screen === "review")    { setScreen("done");     return; }
  };
  const goPrev = () => {
    if (screen === "review")   { setScreen("details");  return; }
    if (screen === "details")  { setScreen("schedule"); return; }
    if (screen === "schedule") { setScreen("services"); return; }
    if (screen === "services") { setScreen("theme");    return; }
  };

  const resetAll = () => {
    setScreen("splash");
    setReferral("");
    setSelectedTreatments([]);
    setActiveCategory(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setCurrentMonth(new Date());
    setIsExisting(null);
    setForm({ name: "", phone: "", email: "", address: "" });
  };

  const toggleTreatment = (id: string) =>
    setSelectedTreatments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  /* ════════════════════════════════════════════════════════════
     SPLASH SCREEN
  ═══════════════════════════════════════════════════════════ */
  if (screen === "splash") {
    // Fake stable orbs for the demo
    const orbs = [
      { id: 0, x: 10,  y: 8,  size: 320, color: "rgba(220,235,255,0.13)" },
      { id: 1, x: 80,  y: 70, size: 260, color: "rgba(200,220,255,0.09)" },
      { id: 2, x: 48,  y: 38, size: 180, color: "rgba(235,245,255,0.08)" },
    ];
    return (
      <div
        className="relative flex flex-col items-center w-full overflow-y-auto"
        style={{ background: "#080808", minHeight: "100%" }}
      >
        {/* Ambient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {orbs.map(o => (
            <div
              key={o.id}
              className="absolute rounded-full"
              style={{
                width: o.size, height: o.size,
                left: `${o.x}%`, top: `${o.y}%`,
                background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
                filter: "blur(48px)",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center w-full px-6 pt-14 pb-10">
          {/* Logo box */}
          <div
            className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-8"
            style={{
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 0 0 0.5px rgba(220,235,255,0.12) inset, 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <TIcon className="w-8 h-8" style={{ color: "rgba(220,238,255,0.85)" }} />
          </div>

          {/* Welcome label */}
          <p
            className="text-[9px] font-bold tracking-[0.5em] uppercase mb-2"
            style={{ color: "rgba(210,228,255,0.38)" }}
          >
            {tenant.splashWelcome}
          </p>

          {/* Business name */}
          <h1
            className="font-bold text-white text-center tracking-tight mb-5"
            style={{ fontSize: "clamp(1.7rem,7vw,2.2rem)", lineHeight: 1.1 }}
          >
            {tenant.name}
          </h1>

          {/* Taglines */}
          <p className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-1"
            style={{ color: "rgba(215,232,255,0.42)" }}>
            {tenant.splashTagline1}
          </p>
          <p className="text-[9px] font-medium tracking-[0.3em] uppercase"
            style={{ color: "rgba(215,232,255,0.2)" }}>
            {tenant.splashTagline2}
          </p>

          {/* Divider */}
          <div className="mt-7 mb-7" style={{
            width: 40, height: 1,
            background: "linear-gradient(90deg,transparent,rgba(210,228,255,0.35),transparent)"
          }} />

          {/* Where did you hear about us */}
          <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-center mb-1"
            style={{ color: "rgba(210,228,255,0.3)" }}>
            Where did you hear about us?
          </p>
          <p className="text-[8px] text-center mb-3 tracking-wide"
            style={{ color: "rgba(255,255,255,0.15)" }}>
            Scroll to see all options
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full [&::-webkit-scrollbar]:hidden -mx-6 px-6">
            {tenant.referralOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setReferral(referral === opt ? "" : opt)}
                className="shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200"
                style={{
                  border: referral === opt
                    ? "1px solid rgba(210,228,255,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: referral === opt ? "rgba(210,228,255,0.1)" : "transparent",
                  color: referral === opt ? "rgba(225,240,255,0.95)" : "rgba(255,255,255,0.32)",
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setScreen("theme")}
            className="mt-8 w-full px-8 py-4 rounded-2xl text-[10px] font-bold tracking-[0.28em] uppercase relative overflow-hidden cursor-pointer transition-all duration-300"
            style={{
              background: "rgba(210,228,255,0.07)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(210,228,255,0.18)",
              boxShadow: "0 0 40px rgba(210,228,255,0.04), 0 1px 0 rgba(220,236,255,0.14) inset",
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {tenant.splashCta}
          </button>

          {/* Powered by */}
          <p className="mt-6 text-[8px] tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.14)" }}>
            Powered by{" "}
            <span style={{ color: "rgba(210,228,255,0.35)" }}>nextslot.co.za</span>
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     DONE SCREEN
  ═══════════════════════════════════════════════════════════ */
  if (screen === "done") {
    return (
      <div
        className="flex flex-col items-center justify-center px-6 py-12 text-center gap-6"
        style={{ ...cssVars, ...S.bg, minHeight: "100%" }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={S.primary}>
          <Check className="w-8 h-8" style={S.primaryFg} strokeWidth={3} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={S.fg}>Booking Confirmed!</h2>
          <p className="text-sm" style={S.muted}>A confirmation has been sent to your email.</p>
        </div>

        <div className="w-full rounded-2xl p-4 text-left flex flex-col gap-2" style={S.card}>
          {selectedServiceObjects.map(s => (
            <div key={s.id} className="flex justify-between text-sm">
              <span style={S.fg}>{s.name}</span>
              <span style={S.muted}>R{s.price}</span>
            </div>
          ))}
          <div className="h-px my-1" style={{ background: "hsl(var(--border))" }} />
          <div className="flex justify-between text-sm">
            <span style={S.muted}>{selectedDate ? format(selectedDate, "EEE, d MMM yyyy") : "—"} · {selectedTime}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span style={S.fg}>Deposit paid</span>
            <span style={S.primaryText}>R{depositAmt}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={S.muted}>Balance due on day</span>
            <span style={S.fg}>R{balanceAmt}</span>
          </div>
        </div>

        <button onClick={resetAll} className="text-sm underline" style={S.muted}>
          Book another appointment
        </button>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     THEME PICKER SCREEN
  ═══════════════════════════════════════════════════════════ */
  if (screen === "theme") {
    return (
      <div className="flex flex-col" style={{ ...cssVars, ...S.bg, minHeight: "100%" }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={S.primary}>
            <TIcon className="w-6 h-6" style={S.primaryFg} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold" style={S.fg}>Choose your theme</h1>
          <p className="text-xs mt-1" style={S.muted}>Personalise how your booking page looks</p>
        </div>

        {/* Theme list */}
        <div className="flex-1 px-5 space-y-2.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {businessThemes.map((bt, i) => {
            const btVars  = toStyleVars(bt);
            const meta    = TENANT_BY_ID[bt.id] ?? TENANT_BY_ID["standard"];
            const BtIcon  = meta.Icon;
            const isActive = themeIdx === i;
            return (
              <button
                key={bt.id}
                onClick={() => { setThemeIdx(i); setActiveCategory(null); }}
                className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200"
                style={{
                  background: isActive ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                  border: isActive
                    ? "2px solid hsl(var(--primary))"
                    : "2px solid hsl(var(--border))",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ ...btVars, background: "hsl(var(--primary))" }}
                >
                  <BtIcon style={{ color: "hsl(var(--primary-foreground))", width: 18, height: 18 }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={S.fg}>{bt.label}</p>
                  <p className="text-[11px] truncate" style={S.muted}>{meta.name} · {bt.vibe}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                  style={isActive
                    ? { background: "hsl(var(--primary))", border: "2px solid hsl(var(--primary))" }
                    : { background: "transparent", border: "2px solid hsl(var(--border))" }
                  }
                >
                  {isActive && <Check className="w-3 h-3" style={S.primaryFg} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-5 pb-8 pt-4">
          <button
            onClick={() => setScreen("services")}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl transition-all"
            style={{ ...S.primary, ...S.primaryFg }}
          >
            Start Booking <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-center text-xs mt-3" style={S.muted}>Powered by NextSlot</p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     BOOKING FLOW (services / schedule / details / review)
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col" style={{ ...cssVars, ...S.bg, minHeight: "100vh" }}>

      {/* ── APP HEADER ── */}
      <div
        className="px-5 pt-7 pb-4"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {/* Brand row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={S.primary}>
              <TIcon className="w-4.5 h-4.5" style={{ ...S.primaryFg, width: 18, height: 18 }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold leading-none" style={S.fg}>{tenant.name}</p>
              <p className="text-[11px] leading-none mt-0.5" style={S.muted}>{tenant.tagline}</p>
            </div>
          </div>
          <button
            onClick={() => setScreen("theme")}
            className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
            style={S.muted}
          >
            <Palette className="w-3 h-3" /> Theme
          </button>
        </div>

        {/* ── STEP INDICATOR (matches real StepIndicator.tsx geometry) ── */}
        <div className="flex items-center justify-between w-full">
          {STEP_LABELS.map((label, i) => {
            const status = i < stepIdx ? "completed" : i === stepIdx ? "active" : "upcoming";
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full flex items-center">
                  {/* Left line */}
                  <div
                    className="h-0.5 flex-1 transition-colors duration-300"
                    style={{
                      background: i === 0 ? "transparent" : i <= stepIdx ? "hsl(var(--primary))" : "hsl(var(--border))"
                    }}
                  />
                  {/* Dot */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={
                      status === "completed"
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                        : status === "active"
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                        : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {status === "completed" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </div>
                  {/* Right line */}
                  <div
                    className="h-0.5 flex-1 transition-colors duration-300"
                    style={{
                      background: i === STEP_LABELS.length - 1 ? "transparent" : i < stepIdx ? "hsl(var(--primary))" : "hsl(var(--border))"
                    }}
                  />
                </div>
                <span
                  className="text-[9px] font-semibold tracking-widest uppercase"
                  style={S.muted}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-5 py-5">

        {/* ── SERVICES STEP ── */}
        {screen === "services" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>
                Select treatments
              </h3>
              {selectedTreatments.length > 0 && (
                <span className="text-[10px] font-semibold" style={S.primaryText}>
                  {selectedTreatments.length} selected
                </span>
              )}
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden -mx-1 px-1">
              {tenant.categories.map(cat => {
                const isAct = activeCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="whitespace-nowrap shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                    style={isAct
                      ? { ...S.primary, ...S.primaryFg }
                      : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                    }
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Service cards */}
            <div className="flex flex-col gap-2">
              {visibleServices.map(t => {
                const isSel = selectedTreatments.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTreatment(t.id)}
                    className="rounded-xl px-4 py-3.5 flex items-center gap-3 text-left w-full transition-all duration-150"
                    style={{
                      background: isSel ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                      border: isSel ? "1.5px solid hsl(var(--primary))" : "1.5px solid hsl(var(--border))",
                    }}
                  >
                    {/* Check circle */}
                    <div
                      className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                      style={isSel
                        ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary))" }
                        : { borderColor: "hsl(var(--muted-foreground) / 0.3)", background: "transparent" }
                      }
                    >
                      {isSel && <Check className="w-2.5 h-2.5" style={S.primaryFg} strokeWidth={3} />}
                    </div>
                    {/* Name + duration */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold" style={S.fg}>{t.name}</span>
                      {t.duration > 0 && (
                        <span className="text-[10px]" style={S.muted}>{t.duration} min</span>
                      )}
                    </div>
                    {/* Price */}
                    <span className="shrink-0 text-sm font-bold" style={S.fg}>R{t.price}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCHEDULE STEP ── */}
        {screen === "schedule" && (
          <div className="flex flex-col gap-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>
              Choose date &amp; time
            </h3>

            {/* Month calendar */}
            <div className="rounded-2xl p-4" style={S.card}>
              <div className="flex items-center justify-between mb-4">
                <button
                  disabled={isCurrentMonth}
                  onClick={() => !isCurrentMonth && setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 rounded-full transition-colors"
                  style={isCurrentMonth
                    ? { color: "hsl(var(--muted-foreground) / 0.25)", cursor: "not-allowed" }
                    : S.muted
                  }
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-base font-semibold" style={S.fg}>
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 rounded-full transition-colors"
                  style={S.muted}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <span key={d} className="text-[10px] font-semibold uppercase" style={S.muted}>{d}</span>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {days.map(day => {
                  const isPast     = isBefore(day, today) && !isToday(day);
                  const isAvail    = isDemoAvailable(day);
                  const isDisabled = isPast || !isAvail;
                  const isActive   = selectedDate ? isSameDay(day, selectedDate) : false;
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={isDisabled}
                      onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                      className="w-full aspect-square rounded-xl text-sm font-medium transition-all duration-200"
                      style={
                        isActive
                          ? { ...S.primary, ...S.primaryFg }
                          : isDisabled
                          ? { color: "hsl(var(--muted-foreground) / 0.25)", cursor: "not-allowed" }
                          : { color: "hsl(var(--foreground))" }
                      }
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <h4 className="text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={S.muted}>
                  Available times
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className="py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={selectedTime === slot
                        ? { ...S.primary, ...S.primaryFg }
                        : { ...S.card, color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }
                      }
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DETAILS STEP ── */}
        {screen === "details" && (
          <div className="flex flex-col gap-5">
            <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>
              Your details
            </h3>

            {/* Existing / new client */}
            <div>
              <p className="text-sm mb-3" style={S.fg}>Have you booked with us before?</p>
              <div className="flex gap-3">
                {[
                  { label: "Existing Diva", value: true,  Icon: Star },
                  { label: "New Diva",      value: false, Icon: Sparkles },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setIsExisting(opt.value)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    style={isExisting === opt.value
                      ? { ...S.primary, ...S.primaryFg }
                      : { ...S.card, color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" }
                    }
                  >
                    <opt.Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety check note for new clients */}
            {isExisting === false && (
              <div className="rounded-2xl p-4" style={S.card}>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-1" style={S.fg}>
                  <ShieldCheck className="w-4 h-4" /> New Client Safety Check
                </h4>
                <p className="text-xs" style={S.muted}>
                  A short health questionnaire will be sent with your confirmation.
                </p>
              </div>
            )}

            {/* Form fields */}
            <div className="flex flex-col gap-3">
              {([
                { icon: User,   key: "name",    placeholder: "Full Name *",        type: "text" },
                { icon: Phone,  key: "phone",   placeholder: "Phone Number *",     type: "tel" },
                { icon: Mail,   key: "email",   placeholder: "Email Address *",    type: "email" },
                { icon: MapPin, key: "address", placeholder: "Home Address (optional)", type: "text" },
              ] as { icon: React.ElementType; key: keyof typeof form; placeholder: string; type: string }[]).map(f => (
                <div key={f.key} className="relative">
                  <f.icon className="absolute left-3.5 top-3.5 w-4 h-4" style={S.muted} />
                  <input
                    id={`preview-${f.key}`}
                    name={f.key}
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none transition-colors"
                    style={{
                      background: "hsl(var(--card))",
                      color: "hsl(var(--foreground))",
                      border: "1.5px solid hsl(var(--border))",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW STEP ── */}
        {screen === "review" && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-[0.2em] uppercase" style={S.muted}>
              Review booking
            </h3>

            {/* Schedule card */}
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={S.card}>
              <h4 className="text-xs font-semibold tracking-wider uppercase mb-1" style={S.muted}>Schedule</h4>
              <span className="text-sm" style={S.fg}>
                {selectedDate ? format(selectedDate, "EEEE, d MMMM yyyy") : "—"}
              </span>
              <span className="text-sm" style={S.muted}>{selectedTime || "—"}</span>
            </div>

            {/* Contact card */}
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={S.card}>
              <h4 className="text-xs font-semibold tracking-wider uppercase mb-1" style={S.muted}>Contact</h4>
              <span className="text-sm" style={S.fg}>{form.name || "—"}</span>
              <span className="text-sm" style={S.muted}>{form.phone}</span>
              <span className="text-sm" style={S.muted}>{form.email || "—"}</span>
              {form.address && <span className="text-sm" style={S.muted}>{form.address}</span>}
            </div>

            {/* Summary card */}
            <div className="rounded-2xl p-4 flex flex-col gap-0" style={S.card}>
              {selectedServiceObjects.map(t => (
                <div key={t.id} className="flex items-baseline justify-between py-1.5">
                  <span className="text-sm" style={S.fg}>{t.name}</span>
                  <span className="text-sm font-semibold ml-4" style={S.fg}>R{t.price}</span>
                </div>
              ))}

              <div className="h-px my-2" style={{ background: "hsl(var(--border) / 0.5)" }} />

              <div className="flex justify-between items-baseline py-1">
                <span className="text-base font-bold" style={S.fg}>Total</span>
                <span className="text-base font-bold" style={S.fg}>R{totalPrice}</span>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <span className="text-sm" style={S.muted}>Deposit due now (30%)</span>
                <span className="text-sm font-semibold" style={S.primaryText}>R{depositAmt}</span>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <span className="text-sm" style={S.muted}>Balance remaining</span>
                <span className="text-sm font-semibold" style={S.fg}>R{balanceAmt}</span>
              </div>

              <div className="h-px my-3" style={{ background: "hsl(var(--border) / 0.3)" }} />

              <p className="text-[10px] text-center mb-3" style={S.muted}>
                By confirming you agree to our{" "}
                <span className="underline font-medium" style={S.fg}>Terms &amp; Conditions</span>
              </p>

              <button
                onClick={goNext}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl transition-all"
                style={{ background: "hsl(142 71% 35%)", color: "#fff" }}
              >
                <Sparkles className="w-4 h-4" />
                Confirm &amp; Pay Deposit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM BAR (matches real StickyBottomBar.tsx) ── */}
      {screen !== "review" && (
        <div
          className="px-5 pt-3 pb-6"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          {/* Summary pill — only on services step when items selected */}
          {screen === "services" && selectedTreatments.length > 0 && (
            <div
              className="rounded-2xl px-4 py-3 mb-3 flex items-center justify-between"
              style={S.card}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs" style={S.muted}>
                  {selectedTreatments.length} treatment{selectedTreatments.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>•</span>
                <span className="text-xs" style={S.muted}>{totalDuration} min</span>
              </div>
              <span className="font-bold text-lg" style={S.fg}>R{totalPrice}</span>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-3">
            {stepIdx > 0 && (
              <button
                onClick={goPrev}
                className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}
              >
                Back
              </button>
            )}
            <button
              disabled={!canProceed}
              onClick={goNext}
              className="flex-1 py-4 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ ...S.primary, ...S.primaryFg }}
            >
              {screen === "details" ? "Review" : "Next"}
            </button>
          </div>
        </div>
      )}

      {/* On review step, nav is handled inside the card (no external bar) */}
      {screen === "review" && (
        <div className="px-5 pt-3 pb-6">
          <button
            onClick={goPrev}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingAppPreview;
