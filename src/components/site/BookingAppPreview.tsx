import { useState } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight,
  Clock, CreditCard, MapPin, User, Phone, Mail,
  Scissors, Sparkles, HandMetal, Zap, PaintBucket, Eye, LayoutGrid, Palette
} from "lucide-react";
import { businessThemes, getThemeCssVars, BusinessTheme } from "@/data/themes";

/* ─── PER-THEME TENANT + SERVICE DATA ─────────────────────────── */

type Service = { id: string; name: string; duration: string; price: number; deposit: number; desc: string };

type TenantMeta = {
  name: string;
  tagline: string;
  location: string;
  Icon: React.ElementType;
  placeholder: string;
  services: Service[];
};

// Keyed by businessTheme.id — must cover all 7 real themes
const TENANT_BY_ID: Record<string, TenantMeta> = {
  "makeup-artist": {
    name: "Brush & Veil",
    tagline: "Bridal & Editorial Makeup",
    location: "Cape Town, SA",
    Icon: Sparkles,
    placeholder: "Wedding date, inspiration images, skin type? (optional)",
    services: [
      { id: "1", name: "Bridal Glam",        duration: "90 min", price: 2800, deposit: 900,  desc: "Full glam for your big day." },
      { id: "2", name: "Editorial Look",     duration: "60 min", price: 1800, deposit: 600,  desc: "High-fashion shoot-ready look." },
      { id: "3", name: "Event Makeup",       duration: "45 min", price: 1200, deposit: 400,  desc: "Polished look for any occasion." },
      { id: "4", name: "Natural Glow",       duration: "40 min", price:  900, deposit: 300,  desc: "Everyday skin-forward finish." },
    ],
  },
  "beautician": {
    name: "Glow Studio",
    tagline: "Facials, Skincare & Waxing",
    location: "Cape Town, SA",
    Icon: Sparkles,
    placeholder: "Skin concerns or sensitivities? (optional)",
    services: [
      { id: "1", name: "Signature Facial",   duration: "60 min", price:  950, deposit: 300,  desc: "Deep cleanse, exfoliate, and hydrate." },
      { id: "2", name: "Microdermabrasion",  duration: "50 min", price: 1100, deposit: 350,  desc: "Resurface and brighten dull skin." },
      { id: "3", name: "Full Leg Wax",       duration: "40 min", price:  550, deposit: 180,  desc: "Smooth finish, long-lasting results." },
      { id: "4", name: "Back Treatment",     duration: "45 min", price:  800, deposit: 250,  desc: "Cleanse, extract, and calm the back." },
    ],
  },
  "tattoo-artist": {
    name: "Ink Vault Studio",
    tagline: "Custom Tattoo Artists",
    location: "Cape Town, SA",
    Icon: HandMetal,
    placeholder: "Reference images, placement, or style notes? (optional)",
    services: [
      { id: "1", name: "Custom Sleeve",      duration: "3 hr",   price: 3500, deposit: 1000, desc: "Full custom sleeve — first session." },
      { id: "2", name: "Flash Piece",        duration: "1 hr",   price: 1200, deposit:  400, desc: "Choose from in-studio flash designs." },
      { id: "3", name: "Touch-up",           duration: "45 min", price:  800, deposit:  200, desc: "Refresh and sharpen existing ink." },
      { id: "4", name: "Consultation",       duration: "30 min", price:  300, deposit:  150, desc: "Design review before your session." },
    ],
  },
  "lash-tech": {
    name: "Luxe Lash Co.",
    tagline: "Lash Extensions, Lifts & Tinting",
    location: "Cape Town, SA",
    Icon: Eye,
    placeholder: "Lash style preference or allergy info? (optional)",
    services: [
      { id: "1", name: "Classic Full Set",   duration: "90 min", price: 1400, deposit: 450,  desc: "Natural-looking individual extensions." },
      { id: "2", name: "Volume Full Set",    duration: "2 hr",   price: 1800, deposit: 600,  desc: "Fluffy, full-fan lash set." },
      { id: "3", name: "Lash Lift & Tint",  duration: "60 min", price:  750, deposit: 250,  desc: "Curl and darken your natural lashes." },
      { id: "4", name: "Lash Infill",        duration: "60 min", price:  750, deposit: 250,  desc: "Maintenance fill every 2–3 weeks." },
    ],
  },
  "barber": {
    name: "Blade & Co.",
    tagline: "Classic Barbershop",
    location: "Cape Town, SA",
    Icon: Scissors,
    placeholder: "Any notes for your barber? (optional)",
    services: [
      { id: "1", name: "Signature Fade",     duration: "45 min", price:  500, deposit: 250,  desc: "Clean skin fade, styled finish." },
      { id: "2", name: "Hot Towel Shave",    duration: "40 min", price:  450, deposit: 225,  desc: "Classic straight-razor shave." },
      { id: "3", name: "Beard Sculpt",       duration: "30 min", price:  350, deposit: 175,  desc: "Shape and define your beard." },
      { id: "4", name: "Kids Cut",           duration: "30 min", price:  280, deposit: 140,  desc: "Patient and friendly kids cut." },
      { id: "5", name: "Shape-up",           duration: "20 min", price:  200, deposit: 100,  desc: "Edge-up and line clean." },
    ],
  },
  "nail-tech": {
    name: "Polish & Press",
    tagline: "Manicures, Gel & Nail Art",
    location: "Cape Town, SA",
    Icon: PaintBucket,
    placeholder: "Nail art inspo or length preference? (optional)",
    services: [
      { id: "1", name: "Gel Manicure",       duration: "60 min", price:  600, deposit: 200,  desc: "Long-lasting gel colour on natural nails." },
      { id: "2", name: "Acrylic Full Set",   duration: "75 min", price:  850, deposit: 280,  desc: "Full acrylic nail extensions." },
      { id: "3", name: "Nail Art Session",   duration: "90 min", price: 1100, deposit: 350,  desc: "Custom designs, press-ons, or freehand art." },
      { id: "4", name: "Gel Pedicure",       duration: "60 min", price:  550, deposit: 180,  desc: "Gel colour with foot soak and scrub." },
    ],
  },
  "standard": {
    name: "NextSlot Demo",
    tagline: "Any Appointment-Based Service",
    location: "Cape Town, SA",
    Icon: LayoutGrid,
    placeholder: "Any notes for your provider? (optional)",
    services: [
      { id: "1", name: "Standard Session",   duration: "60 min", price:  800, deposit: 250,  desc: "Standard service session." },
      { id: "2", name: "Extended Session",   duration: "90 min", price: 1100, deposit: 350,  desc: "Longer appointment with more time." },
      { id: "3", name: "Express Session",    duration: "30 min", price:  500, deposit: 150,  desc: "Quick focused service slot." },
      { id: "4", name: "Consultation",       duration: "30 min", price:  300, deposit: 100,  desc: "Initial consultation and assessment." },
    ],
  },
};

const TIME_SLOTS = ["08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","15:00","15:30"];
const BLOCKED   = ["09:00","10:00","13:30"];
const DAYS      = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const DATES     = [16, 17, 18, 19, 20, 21];

type Screen = "theme" | "services" | "datetime" | "details" | "confirm";

/* ─── HELPERS ─────────────────────────────────────────────── */

// Convert the CSS vars record to a React style object
function toStyleVars(theme: BusinessTheme): React.CSSProperties {
  return Object.fromEntries(
    Object.entries(getThemeCssVars(theme)).map(([k, v]) => [k, v])
  ) as React.CSSProperties;
}

// Inline style shorthand helpers using real CSS vars
const S = {
  bg:            { background: "hsl(var(--background))" },
  card:          { background: "hsl(var(--card))" },
  primary:       { background: "hsl(var(--primary))" },
  primaryText:   { color: "hsl(var(--primary))" },
  primaryFg:     { color: "hsl(var(--primary-foreground))" },
  accent:        { background: "hsl(var(--accent))" },
  accentText:    { color: "hsl(var(--accent))" },
  fg:            { color: "hsl(var(--foreground))" },
  muted:         { color: "hsl(var(--muted-foreground))" },
  border:        { borderColor: "hsl(var(--border))" },
  inputBg:       { background: "hsl(var(--input))" },
  secondary:     { background: "hsl(var(--secondary))" },
};

/* ─── COMPONENT ─────────────────────────────────────────────── */

const BookingAppPreview = () => {
  const [screen, setScreen]                   = useState<Screen>("theme");
  const [themeIdx, setThemeIdx]               = useState(0);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDay, setSelectedDay]         = useState(0);
  const [selectedTime, setSelectedTime]       = useState<string | null>(null);
  const [form, setForm]                       = useState({ name: "", phone: "", email: "", notes: "" });
  const [done, setDone]                       = useState(false);

  const theme   = businessThemes[themeIdx];
  const cssVars = toStyleVars(theme);
  const tenant  = TENANT_BY_ID[theme.id] ?? TENANT_BY_ID["standard"];
  const TIcon   = tenant.Icon;
  const svc     = tenant.services.find(s => s.id === selectedService);

  const BOOKING_SCREENS: Screen[] = ["services", "datetime", "details", "confirm"];
  const STEP_LABELS = ["Service", "Date & Time", "Details", "Confirm"];
  const stepIndex   = BOOKING_SCREENS.indexOf(screen);

  const reset = () => {
    setScreen("theme");
    setSelectedService(null);
    setSelectedTime(null);
    setSelectedDay(0);
    setForm({ name: "", phone: "", email: "", notes: "" });
    setDone(false);
  };

  /* ── CONFIRMED SCREEN ── */
  if (done) {
    return (
      <div
        className="flex flex-col items-center justify-center px-8 py-12 text-center space-y-6"
        style={{ ...cssVars, ...S.bg, minHeight: "100%" }}
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={S.card}>
          <CheckCircle2 className="w-10 h-10" style={S.primaryText} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2" style={S.fg}>Booking Confirmed!</h2>
          <p className="text-sm" style={S.muted}>A confirmation has been sent to your email.</p>
        </div>
        <div className="w-full rounded-2xl p-5 text-left space-y-3" style={S.card}>
          <p className="text-sm font-semibold" style={S.fg}>{svc?.name}</p>
          <p className="text-xs" style={S.muted}>{DAYS[selectedDay]} {DATES[selectedDay]} Mar at {selectedTime}</p>
          <p className="text-xs" style={S.muted}>{tenant.name} · {tenant.location}</p>
          <div className="pt-3 flex justify-between" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <span className="text-xs" style={S.muted}>Deposit paid</span>
            <span className="text-xs font-semibold" style={S.fg}>R{svc?.deposit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={S.muted}>Balance due on day</span>
            <span className="text-xs font-semibold" style={S.fg}>R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
          </div>
        </div>
        <button onClick={reset} className="text-sm underline" style={S.muted}>Book another appointment</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ ...cssVars, ...S.bg, minHeight: "100vh" }}>

      {/* ── THEME PICKER SCREEN ── */}
      {screen === "theme" && (
        <div className="flex flex-col" style={{ minHeight: "100vh" }}>
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={S.primary}
            >
              <TIcon className="w-6 h-6" style={S.primaryFg} strokeWidth={2} />
            </div>
            <h1 className="text-lg font-bold" style={S.fg}>Welcome to NextSlot</h1>
            <p className="text-xs mt-1" style={S.muted}>Pick a theme to personalise your demo</p>
          </div>

          {/* Theme cards */}
          <div className="flex-1 px-5 space-y-2.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {businessThemes.map((bt, i) => {
              const btVars  = toStyleVars(bt);
              const meta    = TENANT_BY_ID[bt.id] ?? TENANT_BY_ID["standard"];
              const BtIcon  = meta.Icon;
              const isActive = themeIdx === i;
              return (
                <button
                  key={bt.id}
                  onClick={() => setThemeIdx(i)}
                  className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200"
                  style={{
                    background: isActive ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                    border: isActive
                      ? "2px solid hsl(var(--primary))"
                      : "2px solid hsl(var(--border))",
                  }}
                >
                  {/* Mini swatch */}
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ ...btVars, background: `hsl(var(--primary))` }}
                  >
                    <BtIcon className="w-4.5 h-4.5" style={{ color: `hsl(var(--primary-foreground))`, width: 18, height: 18 }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={S.fg}>{bt.label}</p>
                    <p className="text-[11px] truncate" style={S.muted}>{meta.name} · {bt.vibe}</p>
                  </div>
                  {/* Selection indicator */}
                  <div
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all"
                    style={isActive
                      ? { background: "hsl(var(--primary))", border: "2px solid hsl(var(--primary))" }
                      : { background: "transparent", border: "2px solid hsl(var(--border))" }
                    }
                  >
                    {isActive && <CheckCircle2 className="w-full h-full" style={{ color: "hsl(var(--primary-foreground))", padding: 1 }} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="px-5 pb-8 pt-4">
            <button
              onClick={() => { setSelectedService(null); setScreen("services"); }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl transition-all"
              style={{ ...S.primary, ...S.primaryFg }}
            >
              Start Booking <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs mt-3" style={S.muted}>Powered by NextSlot</p>
          </div>
        </div>
      )}

      {/* ── BOOKING SCREENS ── */}
      {screen !== "theme" && (
        <>
          {/* Header */}
          <div
            className="px-6 pt-8 pb-4"
            style={{ ...S.bg, borderBottom: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={S.primary}
                >
                  <TIcon className="w-5 h-5" style={S.primaryFg} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-base font-bold leading-none" style={S.fg}>{tenant.name}</p>
                  <p className="text-xs leading-none mt-1" style={S.muted}>{tenant.tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={S.muted}>
                <MapPin className="w-3.5 h-3.5" />{tenant.location}
              </div>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-1.5">
              {STEP_LABELS.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 flex-1">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all"
                    style={
                      stepIndex > i
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                        : stepIndex === i
                        ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                        : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {stepIndex > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className="text-[11px] hidden sm:block"
                    style={stepIndex === i ? { ...S.fg, fontWeight: 600 } : S.muted}
                  >{s}</span>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className="flex-1 h-px"
                      style={{ background: stepIndex > i ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Change theme link */}
            <button
              onClick={() => setScreen("theme")}
              className="mt-3 flex items-center gap-1 text-[11px] hover:opacity-80 transition-opacity"
              style={S.muted}
            >
              <Palette className="w-3 h-3" /> Change theme
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-6 py-6">

            {/* SERVICES */}
            {screen === "services" && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold mb-4" style={S.fg}>Choose a service</h2>
                {tenant.services.map(s => {
                  const isSelected = selectedService === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      className="w-full text-left p-4 rounded-2xl transition-all"
                      style={{
                        background: isSelected ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                        border: isSelected
                          ? "1.5px solid hsl(var(--primary))"
                          : "1.5px solid hsl(var(--border))",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={S.fg}>{s.name}</p>
                          <p className="text-xs mt-0.5" style={S.muted}>{s.desc}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs" style={S.muted}>
                              <Clock className="w-3.5 h-3.5" />{s.duration}
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={S.muted}>
                              <CreditCard className="w-3.5 h-3.5" />R{s.deposit} deposit
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-base font-bold" style={S.fg}>R{s.price}</p>
                          {isSelected && <CheckCircle2 className="w-5 h-5 ml-auto mt-1" style={S.primaryText} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DATE & TIME */}
            {screen === "datetime" && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold" style={S.fg}>Pick a date</h2>
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {DAYS.map((d, i) => {
                    const isActive = selectedDay === i;
                    return (
                      <button
                        key={d}
                        onClick={() => { setSelectedDay(i); setSelectedTime(null); }}
                        className="flex flex-col items-center min-w-[56px] py-3 px-2 rounded-2xl text-center transition-all"
                        style={isActive
                          ? { ...S.primary, ...S.primaryFg, border: "1.5px solid hsl(var(--primary))" }
                          : { background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
                        }
                      >
                        <span className="text-[11px] font-medium">{d}</span>
                        <span className="text-lg font-bold mt-0.5">{DATES[i]}</span>
                        <span className="text-[10px] mt-0.5 opacity-60">Mar</span>
                      </button>
                    );
                  })}
                </div>
                <h2 className="text-sm font-semibold" style={S.fg}>Available times</h2>
                <div className="grid grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map(slot => {
                    const blocked  = BLOCKED.includes(slot);
                    const isActive = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        disabled={blocked}
                        onClick={() => setSelectedTime(slot)}
                        className="py-3 rounded-2xl text-sm font-medium transition-all"
                        style={
                          blocked
                            ? { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))", opacity: 0.4, cursor: "not-allowed" }
                            : isActive
                            ? { ...S.primary, ...S.primaryFg, border: "1.5px solid hsl(var(--primary))" }
                            : { background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1.5px solid hsl(var(--border))" }
                        }
                      >
                        {blocked ? <span style={{ textDecoration: "line-through" }}>{slot}</span> : slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DETAILS */}
            {screen === "details" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold" style={S.fg}>Your details</h2>
                {([
                  { icon: User,  key: "name",  label: "Full name",     type: "text" },
                  { icon: Phone, key: "phone", label: "Phone number",  type: "tel" },
                  { icon: Mail,  key: "email", label: "Email address", type: "email" },
                ] as { icon: React.ElementType; key: keyof typeof form; label: string; type: string }[]).map(f => (
                  <div key={f.key} className="relative">
                    <f.icon
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={S.muted}
                    />
                    <input
                      type={f.type}
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.label}
                      className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none transition-colors"
                      style={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1.5px solid hsl(var(--border))",
                      }}
                    />
                  </div>
                ))}
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={tenant.placeholder}
                  rows={2}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm focus:outline-none transition-colors resize-none"
                  style={{
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    border: "1.5px solid hsl(var(--border))",
                  }}
                />
                <div className="rounded-2xl p-4 space-y-2" style={S.card}>
                  <p className="text-sm font-semibold" style={S.fg}>Booking summary</p>
                  <div className="flex justify-between text-sm" style={S.muted}>
                    <span>{svc?.name}</span><span>R{svc?.price}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={S.muted}>
                    <span>{DAYS[selectedDay]} {DATES[selectedDay]} Mar · {selectedTime}</span>
                    <span>{svc?.duration}</span>
                  </div>
                  <div className="pt-2 flex justify-between" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <span className="text-sm font-medium" style={S.fg}>Deposit due now</span>
                    <span className="text-sm font-bold" style={S.fg}>R{svc?.deposit}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRM */}
            {screen === "confirm" && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold" style={S.fg}>Confirm your booking</h2>
                <div className="rounded-2xl p-5 space-y-3" style={S.card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-base font-bold" style={S.fg}>{svc?.name}</p>
                      <p className="text-xs mt-0.5" style={S.muted}>{svc?.duration} · {tenant.name}</p>
                    </div>
                    <span className="text-base font-bold" style={S.fg}>R{svc?.price}</span>
                  </div>
                  <div className="space-y-2" style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 12 }}>
                    {[
                      ["Date",  `${DAYS[selectedDay]}, ${DATES[selectedDay]} Mar 2026`],
                      ["Time",  selectedTime],
                      ["Name",  form.name],
                      ["Phone", form.phone],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-sm" style={S.muted}>
                        <span>{label}</span><span>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 12 }}>
                    <div className="flex justify-between">
                      <span className="text-sm" style={S.muted}>Deposit to pay now</span>
                      <span className="text-sm font-bold" style={S.fg}>R{svc?.deposit}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm" style={S.muted}>Balance on the day</span>
                      <span className="text-sm" style={S.muted}>R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Yoco mock */}
                <div className="rounded-2xl p-4 space-y-3" style={{ border: "1.5px solid hsl(var(--border))" }}>
                  <p className="text-sm font-semibold flex items-center gap-2" style={S.fg}>
                    <CreditCard className="w-4 h-4" />Pay deposit via Yoco
                  </p>
                  <div className="rounded-xl px-4 py-3 text-sm font-mono" style={{ ...S.card, ...S.muted }}>4242 4242 4242 4242</div>
                  <div className="flex gap-3">
                    <div className="rounded-xl px-4 py-3 text-sm font-mono flex-1" style={{ ...S.card, ...S.muted }}>03/28</div>
                    <div className="rounded-xl px-4 py-3 text-sm font-mono flex-1" style={{ ...S.card, ...S.muted }}>123</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div
            className="px-6 pb-8 pt-4 space-y-3"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
          >
            {screen === "services" && (
              <button
                disabled={!selectedService}
                onClick={() => setScreen("datetime")}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ ...S.primary, ...S.primaryFg }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {screen === "datetime" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setScreen("services")}
                  className="flex items-center gap-1.5 px-5 py-4 rounded-2xl text-sm transition-all"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!selectedTime}
                  onClick={() => setScreen("details")}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  style={{ ...S.primary, ...S.primaryFg }}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {screen === "details" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setScreen("datetime")}
                  className="flex items-center gap-1.5 px-5 py-4 rounded-2xl text-sm transition-all"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!form.name || !form.phone || !form.email}
                  onClick={() => setScreen("confirm")}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  style={{ ...S.primary, ...S.primaryFg }}
                >
                  Review booking <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {screen === "confirm" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setScreen("details")}
                  className="flex items-center gap-1.5 px-5 py-4 rounded-2xl text-sm transition-all"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setDone(true)}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-4 rounded-2xl transition-all"
                  style={{ background: "hsl(142 71% 35%)", color: "#fff" }}
                >
                  Pay R{svc?.deposit} &amp; Confirm <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-center text-xs" style={S.muted}>Powered by NextSlot</p>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingAppPreview;
