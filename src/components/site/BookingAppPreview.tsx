import { useState } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight,
  Clock, CreditCard, MapPin, User, Phone, Mail,
  Scissors, Sparkles, Wind, Camera, HandMetal, Zap, UserCheck, PaintBucket,
  Palette
} from "lucide-react";

/* ─── THEME DEFINITIONS ──────────────────────────────────────── */

type ThemeConfig = {
  label: string;
  // booking app shell
  appBg: string;
  headerBg: string;
  headerBorder: string;
  // accent / brand colour
  accentBg: string;        // button, selected slot bg
  accentText: string;      // text on accent bg
  accentBorder: string;    // selected card border
  accentRing: string;      // ring on selected card
  accentLight: string;     // subtle bg on selected card
  // checklist dot / progress tick
  doneBg: string;
  // text
  heading: string;
  body: string;
  muted: string;
  inputBorder: string;
  inputFocus: string;
  summaryBg: string;
  slotBorder: string;
  swatch: string;          // tailwind bg class for the swatch circle
  // tenant flavour
  tenant: string;
  tagline: string;
  iconBg: string;
  iconText: string;
  Icon: React.ElementType;
  placeholder: string;     // notes placeholder
};

const THEMES: ThemeConfig[] = [
  {
    label: "Classic",
    appBg: "bg-white",
    headerBg: "bg-white",
    headerBorder: "border-gray-100",
    accentBg: "bg-gray-900",
    accentText: "text-white",
    accentBorder: "border-gray-900",
    accentRing: "ring-gray-900",
    accentLight: "bg-gray-50",
    doneBg: "bg-emerald-500",
    heading: "text-gray-900",
    body: "text-gray-700",
    muted: "text-gray-400",
    inputBorder: "border-gray-200",
    inputFocus: "focus:border-gray-900",
    summaryBg: "bg-gray-50",
    slotBorder: "border-gray-200",
    swatch: "bg-gray-900",
    tenant: "Blade & Co.",
    tagline: "Premium Barbershop",
    iconBg: "bg-gray-900",
    iconText: "text-white",
    Icon: Scissors,
    placeholder: "Any notes for your barber? (optional)",
  },
  {
    label: "Dark",
    appBg: "bg-slate-900",
    headerBg: "bg-slate-900",
    headerBorder: "border-slate-700",
    accentBg: "bg-violet-500",
    accentText: "text-white",
    accentBorder: "border-violet-500",
    accentRing: "ring-violet-500",
    accentLight: "bg-slate-800",
    doneBg: "bg-violet-500",
    heading: "text-slate-100",
    body: "text-slate-300",
    muted: "text-slate-500",
    inputBorder: "border-slate-700",
    inputFocus: "focus:border-violet-400",
    summaryBg: "bg-slate-800",
    slotBorder: "border-slate-700",
    swatch: "bg-slate-700",
    tenant: "Ink Vault Studio",
    tagline: "Custom Tattoo Artists",
    iconBg: "bg-violet-600",
    iconText: "text-white",
    Icon: HandMetal,
    placeholder: "Reference images or style notes? (optional)",
  },
  {
    label: "Blush",
    appBg: "bg-rose-50",
    headerBg: "bg-white",
    headerBorder: "border-rose-100",
    accentBg: "bg-rose-500",
    accentText: "text-white",
    accentBorder: "border-rose-400",
    accentRing: "ring-rose-400",
    accentLight: "bg-rose-50",
    doneBg: "bg-rose-500",
    heading: "text-rose-900",
    body: "text-rose-800",
    muted: "text-rose-400",
    inputBorder: "border-rose-200",
    inputFocus: "focus:border-rose-500",
    summaryBg: "bg-rose-100/60",
    slotBorder: "border-rose-200",
    swatch: "bg-pink-300",
    tenant: "Glow Studio",
    tagline: "Beauty & Skincare",
    iconBg: "bg-rose-500",
    iconText: "text-white",
    Icon: Sparkles,
    placeholder: "Skin concerns or preferences? (optional)",
  },
  {
    label: "Sage",
    appBg: "bg-emerald-50",
    headerBg: "bg-white",
    headerBorder: "border-emerald-100",
    accentBg: "bg-emerald-600",
    accentText: "text-white",
    accentBorder: "border-emerald-500",
    accentRing: "ring-emerald-500",
    accentLight: "bg-emerald-50",
    doneBg: "bg-emerald-500",
    heading: "text-emerald-900",
    body: "text-emerald-800",
    muted: "text-emerald-500",
    inputBorder: "border-emerald-200",
    inputFocus: "focus:border-emerald-600",
    summaryBg: "bg-emerald-100/60",
    slotBorder: "border-emerald-200",
    swatch: "bg-emerald-400",
    tenant: "Serenity Massage",
    tagline: "Mobile & In-Studio Therapy",
    iconBg: "bg-emerald-600",
    iconText: "text-white",
    Icon: Wind,
    placeholder: "Pressure preference or focus areas? (optional)",
  },
  {
    label: "Slate",
    appBg: "bg-slate-50",
    headerBg: "bg-white",
    headerBorder: "border-slate-200",
    accentBg: "bg-slate-600",
    accentText: "text-white",
    accentBorder: "border-slate-500",
    accentRing: "ring-slate-500",
    accentLight: "bg-slate-100",
    doneBg: "bg-slate-600",
    heading: "text-slate-900",
    body: "text-slate-700",
    muted: "text-slate-400",
    inputBorder: "border-slate-200",
    inputFocus: "focus:border-slate-600",
    summaryBg: "bg-slate-100",
    slotBorder: "border-slate-200",
    swatch: "bg-slate-400",
    tenant: "Frame & Lens",
    tagline: "Photography Studio",
    iconBg: "bg-slate-700",
    iconText: "text-white",
    Icon: Camera,
    placeholder: "Shot list or style direction? (optional)",
  },
];

/* ─── SERVICE DATA (per-theme) ──────────────────────────────── */

const SERVICES_BY_THEME = [
  // Classic — Barber
  [
    { id: "1", name: "Signature Fade",   duration: "45 min", price: 500, deposit: 250, desc: "Clean skin fade, styled finish." },
    { id: "2", name: "Hot Towel Shave",  duration: "40 min", price: 450, deposit: 225, desc: "Classic straight-razor shave with hot towel." },
    { id: "3", name: "Beard Sculpt",     duration: "30 min", price: 350, deposit: 175, desc: "Shape and define your beard." },
    { id: "4", name: "Kids Cut",         duration: "30 min", price: 280, deposit: 140, desc: "For the little ones. Patient, friendly." },
    { id: "5", name: "Shape-up",         duration: "20 min", price: 200, deposit: 100, desc: "Edge-up and line clean." },
  ],
  // Dark — Tattoo
  [
    { id: "1", name: "Custom Sleeve",    duration: "3 hr",   price: 3500, deposit: 1000, desc: "Full custom sleeve consultation + first session." },
    { id: "2", name: "Flash Piece",      duration: "1 hr",   price: 1200, deposit:  400, desc: "Choose from in-studio flash designs." },
    { id: "3", name: "Touch-up",         duration: "45 min", price:  800, deposit:  200, desc: "Refresh and sharpen existing ink." },
    { id: "4", name: "Consultation",     duration: "30 min", price:  300, deposit:  150, desc: "Design review before booking your session." },
  ],
  // Blush — Beauty
  [
    { id: "1", name: "Signature Facial", duration: "60 min", price: 950, deposit: 300, desc: "Deep cleanse, exfoliate, and hydrate." },
    { id: "2", name: "Gel Mani + Pedi",  duration: "75 min", price: 750, deposit: 250, desc: "Gel colour application, hands and feet." },
    { id: "3", name: "Lash Lift & Tint", duration: "50 min", price: 650, deposit: 200, desc: "Curl and darken natural lashes." },
    { id: "4", name: "Brow Lamination",  duration: "45 min", price: 550, deposit: 180, desc: "Sculpted, defined brows." },
  ],
  // Sage — Massage
  [
    { id: "1", name: "Swedish Massage",  duration: "60 min", price:  900, deposit: 300, desc: "Relaxation full-body massage." },
    { id: "2", name: "Deep Tissue",      duration: "75 min", price: 1100, deposit: 350, desc: "Target muscle knots and tension." },
    { id: "3", name: "Hot Stone",        duration: "90 min", price: 1350, deposit: 400, desc: "Heated stones for deep relaxation." },
    { id: "4", name: "Prenatal",         duration: "60 min", price:  950, deposit: 300, desc: "Safe and gentle for expecting mothers." },
  ],
  // Slate — Photography
  [
    { id: "1", name: "Portrait Session", duration: "90 min", price: 2500, deposit:  800, desc: "Studio portraits, 20 edited images." },
    { id: "2", name: "Event Coverage",   duration: "4 hr",   price: 6500, deposit: 2000, desc: "Full event coverage, gallery delivery." },
    { id: "3", name: "Product Shoot",    duration: "2 hr",   price: 3200, deposit: 1000, desc: "E-commerce and brand product images." },
    { id: "4", name: "Headshots",        duration: "45 min", price: 1500, deposit:  500, desc: "Professional headshots, 5 edited images." },
  ],
];

const TIME_SLOTS  = ["08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","15:00","15:30"];
const BLOCKED     = ["09:00","10:00","13:30"];
const DAYS        = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const DATES       = [16, 17, 18, 19, 20, 21];
const LOCATION    = "Cape Town, SA";

type Screen = "theme" | "services" | "datetime" | "details" | "confirm";

/* ─── COMPONENT ─────────────────────────────────────────────── */

const BookingAppPreview = () => {
  const [screen, setScreen]             = useState<Screen>("theme");
  const [themeIdx, setThemeIdx]         = useState(0);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDay, setSelectedDay]   = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm]                 = useState({ name: "", phone: "", email: "", notes: "" });
  const [done, setDone]                 = useState(false);

  const t       = THEMES[themeIdx];
  const TIcon   = t.Icon;
  const services = SERVICES_BY_THEME[themeIdx];
  const svc     = services.find(s => s.id === selectedService);

  const BOOKING_SCREENS: Screen[] = ["services", "datetime", "details", "confirm"];
  const stepLabels = ["Service", "Date & Time", "Details", "Confirm"];
  const stepIndex  = BOOKING_SCREENS.indexOf(screen); // -1 when on theme screen

  const reset = () => {
    setScreen("theme");
    setSelectedService(null);
    setSelectedTime(null);
    setSelectedDay(0);
    setForm({ name: "", phone: "", email: "", notes: "" });
    setDone(false);
  };

  /* ── Confirmation screen ── */
  if (done) {
    return (
      <div className={`flex flex-col items-center justify-center ${t.appBg} px-8 py-12 text-center space-y-6`} style={{ minHeight: "100%" }}>
        <div className={`w-20 h-20 rounded-full ${t.accentLight} flex items-center justify-center`}>
          <CheckCircle2 className={`w-10 h-10 ${t.accentBg.replace("bg-","text-")}`} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${t.heading} mb-2`}>Booking Confirmed!</h2>
          <p className={`text-sm ${t.muted}`}>A confirmation has been sent to your email.</p>
        </div>
        <div className={`w-full ${t.summaryBg} rounded-2xl p-5 text-left space-y-3`}>
          <p className={`text-sm font-semibold ${t.body}`}>{svc?.name}</p>
          <p className={`text-xs ${t.muted}`}>{DAYS[selectedDay]} {DATES[selectedDay]} Mar at {selectedTime}</p>
          <p className={`text-xs ${t.muted}`}>{t.tenant} · {LOCATION}</p>
          <div className="border-t border-current/10 pt-3 flex justify-between">
            <span className={`text-xs ${t.muted}`}>Deposit paid</span>
            <span className={`text-xs font-semibold ${t.body}`}>R{svc?.deposit}</span>
          </div>
          <div className="flex justify-between">
            <span className={`text-xs ${t.muted}`}>Balance due on day</span>
            <span className={`text-xs font-semibold ${t.body}`}>R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
          </div>
        </div>
        <button onClick={reset} className={`text-sm ${t.muted} underline`}>Book another appointment</button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${t.appBg}`} style={{ minHeight: "100vh" }}>

      {/* ── THEME PICKER SCREEN ── */}
      {screen === "theme" && (
        <div className="flex flex-col" style={{ minHeight: "100vh" }}>
          {/* Top brand strip */}
          <div className="px-6 pt-8 pb-6 text-center">
            <div className={`w-12 h-12 rounded-2xl ${t.iconBg} flex items-center justify-center mx-auto mb-3`}>
              <TIcon className={`w-6 h-6 ${t.iconText}`} strokeWidth={2} />
            </div>
            <h1 className={`text-lg font-bold ${t.heading}`}>Welcome to NextSlot</h1>
            <p className={`text-xs ${t.muted} mt-1`}>Pick a theme to personalise your demo experience</p>
          </div>

          {/* Theme cards */}
          <div className="flex-1 px-5 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {THEMES.map((th, i) => {
              const ThIcon = th.Icon;
              const isActive = themeIdx === i;
              return (
                <button
                  key={th.label}
                  onClick={() => setThemeIdx(i)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    isActive
                      ? `${t.accentBorder} ${t.accentLight}`
                      : `border-transparent ${t.summaryBg} hover:border-current/20`
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${th.iconBg} flex items-center justify-center shrink-0`}>
                    <ThIcon className={`w-5 h-5 ${th.iconText}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${t.heading}`}>{th.label}</p>
                    <p className={`text-xs ${t.muted} truncate`}>{th.tenant} · {th.tagline}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${
                    isActive ? `${t.accentBg} border-transparent` : `border-current/20 ${t.appBg}`
                  }`}>
                    {isActive && <CheckCircle2 className={`w-full h-full ${t.accentText}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="px-5 pb-8 pt-4">
            <button
              onClick={() => { setSelectedService(null); setScreen("services"); }}
              className={`w-full flex items-center justify-center gap-2 ${t.accentBg} ${t.accentText} text-sm font-semibold py-4 rounded-2xl transition-all`}
            >
              Start Booking <ChevronRight className="w-4 h-4" />
            </button>
            <p className={`text-center text-xs ${t.muted} mt-3`}>Powered by NextSlot</p>
          </div>
        </div>
      )}

      {/* ── BOOKING SCREENS (services / datetime / details / confirm) ── */}
      {screen !== "theme" && (
        <>
          {/* Header */}
          <div className={`px-6 pt-8 pb-4 border-b ${t.headerBorder} ${t.headerBg}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${t.iconBg} flex items-center justify-center`}>
                  <TIcon className={`w-5 h-5 ${t.iconText}`} strokeWidth={2} />
                </div>
                <div>
                  <p className={`text-base font-bold ${t.heading} leading-none`}>{t.tenant}</p>
                  <p className={`text-xs ${t.muted} leading-none mt-1`}>{t.tagline}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${t.muted}`}>
                <MapPin className="w-3.5 h-3.5" />{LOCATION}
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-1.5">
              {stepLabels.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5 flex-1">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
                    stepIndex > i ? `${t.doneBg} text-white` :
                    stepIndex === i ? `${t.accentBg} ${t.accentText}` :
                    `${t.summaryBg} ${t.muted}`
                  }`}>
                    {stepIndex > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[11px] hidden sm:block ${
                    stepIndex === i ? `${t.heading} font-semibold` : t.muted
                  }`}>{s}</span>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px ${ stepIndex > i ? t.doneBg.replace("bg-","bg-") : t.slotBorder.replace("border-","bg-") }`} />
                  )}
                </div>
              ))}
            </div>
            {/* Back to theme picker */}
            <button
              onClick={() => setScreen("theme")}
              className={`mt-3 flex items-center gap-1 text-[11px] ${t.muted} hover:opacity-80 transition-opacity`}
            >
              <Palette className="w-3 h-3" /> Change theme
            </button>
          </div>

          {/* Screen body */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-6 py-6">

            {/* SERVICES */}
            {screen === "services" && (
              <div className="space-y-3">
                <h2 className={`text-lg font-bold ${t.heading} mb-4`}>Choose a service</h2>
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedService === s.id
                        ? `${t.accentBorder} ${t.accentLight} ring-1 ${t.accentRing}`
                        : `${t.slotBorder} hover:border-current/30`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${t.heading}`}>{s.name}</p>
                        <p className={`text-xs ${t.muted} mt-0.5`}>{s.desc}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`flex items-center gap-1 text-xs ${t.muted}`}><Clock className="w-3.5 h-3.5" />{s.duration}</span>
                          <span className={`flex items-center gap-1 text-xs ${t.muted}`}><CreditCard className="w-3.5 h-3.5" />R{s.deposit} deposit</span>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className={`text-base font-bold ${t.heading}`}>R{s.price}</p>
                        {selectedService === s.id && <CheckCircle2 className={`w-5 h-5 ${t.accentBg.replace("bg-","text-")} ml-auto mt-1`} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* DATE & TIME */}
            {screen === "datetime" && (
              <div className="space-y-5">
                <h2 className={`text-lg font-bold ${t.heading}`}>Pick a date</h2>
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => { setSelectedDay(i); setSelectedTime(null); }}
                      className={`flex flex-col items-center min-w-[56px] py-3 px-2 rounded-2xl border text-center transition-all ${
                        selectedDay === i
                          ? `${t.accentBorder} ${t.accentBg} ${t.accentText}`
                          : `${t.slotBorder} ${t.muted} hover:border-current/30`
                      }`}
                    >
                      <span className="text-[11px] font-medium">{d}</span>
                      <span className="text-lg font-bold mt-0.5">{DATES[i]}</span>
                      <span className="text-[10px] mt-0.5 opacity-60">Mar</span>
                    </button>
                  ))}
                </div>
                <h2 className={`text-sm font-semibold ${t.heading}`}>Available times</h2>
                <div className="grid grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map(slot => {
                    const blocked = BLOCKED.includes(slot);
                    return (
                      <button
                        key={slot}
                        disabled={blocked}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 rounded-2xl text-sm font-medium border transition-all ${
                          blocked
                            ? `${t.summaryBg} ${t.muted} ${t.slotBorder} cursor-not-allowed opacity-40`
                            : selectedTime === slot
                            ? `${t.accentBg} ${t.accentText} ${t.accentBorder}`
                            : `${t.slotBorder} ${t.body} hover:border-current/40`
                        }`}
                      >
                        {blocked ? <span className="line-through">{slot}</span> : slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DETAILS */}
            {screen === "details" && (
              <div className="space-y-4">
                <h2 className={`text-lg font-bold ${t.heading}`}>Your details</h2>
                {([
                  { icon: User,  key: "name",  label: "Full name",     type: "text" },
                  { icon: Phone, key: "phone", label: "Phone number",  type: "tel" },
                  { icon: Mail,  key: "email", label: "Email address", type: "email" },
                ] as { icon: React.ElementType; key: keyof typeof form; label: string; type: string }[]).map(f => (
                  <div key={f.key} className="relative">
                    <f.icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${t.muted}`} />
                    <input
                      type={f.type}
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.label}
                      className={`w-full pl-10 pr-4 py-3.5 rounded-2xl border ${t.inputBorder} text-sm ${t.body} placeholder:${t.muted} focus:outline-none ${t.inputFocus} transition-colors ${t.appBg}`}
                    />
                  </div>
                ))}
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t.placeholder}
                  rows={2}
                  className={`w-full px-4 py-3.5 rounded-2xl border ${t.inputBorder} text-sm ${t.body} placeholder:${t.muted} focus:outline-none ${t.inputFocus} transition-colors resize-none ${t.appBg}`}
                />
                <div className={`${t.summaryBg} rounded-2xl p-4 space-y-2`}>
                  <p className={`text-sm font-semibold ${t.body}`}>Booking summary</p>
                  <div className={`flex justify-between text-sm ${t.muted}`}>
                    <span>{svc?.name}</span><span>R{svc?.price}</span>
                  </div>
                  <div className={`flex justify-between text-sm ${t.muted}`}>
                    <span>{DAYS[selectedDay]} {DATES[selectedDay]} Mar · {selectedTime}</span><span>{svc?.duration}</span>
                  </div>
                  <div className={`border-t border-current/10 pt-2 flex justify-between`}>
                    <span className={`text-sm font-medium ${t.body}`}>Deposit due now</span>
                    <span className={`text-sm font-bold ${t.heading}`}>R{svc?.deposit}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRM */}
            {screen === "confirm" && (
              <div className="space-y-5">
                <h2 className={`text-lg font-bold ${t.heading}`}>Confirm your booking</h2>
                <div className={`${t.summaryBg} rounded-2xl p-5 space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-base font-bold ${t.heading}`}>{svc?.name}</p>
                      <p className={`text-xs ${t.muted} mt-0.5`}>{svc?.duration} · {t.tenant}</p>
                    </div>
                    <span className={`text-base font-bold ${t.heading}`}>R{svc?.price}</span>
                  </div>
                  <div className={`border-t border-current/10 pt-3 space-y-2`}>
                    <div className={`flex justify-between text-sm ${t.muted}`}><span>Date</span><span>{DAYS[selectedDay]}, {DATES[selectedDay]} Mar 2026</span></div>
                    <div className={`flex justify-between text-sm ${t.muted}`}><span>Time</span><span>{selectedTime}</span></div>
                    <div className={`flex justify-between text-sm ${t.muted}`}><span>Name</span><span>{form.name}</span></div>
                    <div className={`flex justify-between text-sm ${t.muted}`}><span>Phone</span><span>{form.phone}</span></div>
                  </div>
                  <div className={`border-t border-current/10 pt-3`}>
                    <div className="flex justify-between">
                      <span className={`text-sm ${t.muted}`}>Deposit to pay now</span>
                      <span className={`text-sm font-bold ${t.heading}`}>R{svc?.deposit}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className={`text-sm ${t.muted}`}>Balance on the day</span>
                      <span className={`text-sm ${t.muted}`}>R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
                    </div>
                  </div>
                </div>
                {/* Yoco payment mock */}
                <div className={`border ${t.slotBorder} rounded-2xl p-4 space-y-3`}>
                  <p className={`text-sm font-semibold ${t.body} flex items-center gap-2`}><CreditCard className="w-4 h-4" />Pay deposit via Yoco</p>
                  <div className={`${t.summaryBg} rounded-xl px-4 py-3 text-sm ${t.muted} font-mono`}>4242 4242 4242 4242</div>
                  <div className="flex gap-3">
                    <div className={`${t.summaryBg} rounded-xl px-4 py-3 text-sm ${t.muted} font-mono flex-1`}>03/28</div>
                    <div className={`${t.summaryBg} rounded-xl px-4 py-3 text-sm ${t.muted} font-mono flex-1`}>123</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className={`px-6 pb-8 pt-4 border-t ${t.headerBorder} space-y-3`}>
            {screen === "services" && (
              <button
                disabled={!selectedService}
                onClick={() => setScreen("datetime")}
                className={`w-full flex items-center justify-center gap-2 ${t.accentBg} ${t.accentText} text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {screen === "datetime" && (
              <div className="flex gap-3">
                <button onClick={() => setScreen("services")} className={`flex items-center gap-1.5 px-5 py-4 rounded-2xl border ${t.slotBorder} text-sm ${t.muted} hover:opacity-80 transition-all`}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!selectedTime}
                  onClick={() => setScreen("details")}
                  className={`flex-1 flex items-center justify-center gap-2 ${t.accentBg} ${t.accentText} text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {screen === "details" && (
              <div className="flex gap-3">
                <button onClick={() => setScreen("datetime")} className={`flex items-center gap-1.5 px-5 py-4 rounded-2xl border ${t.slotBorder} text-sm ${t.muted} hover:opacity-80 transition-all`}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  disabled={!form.name || !form.phone || !form.email}
                  onClick={() => setScreen("confirm")}
                  className={`flex-1 flex items-center justify-center gap-2 ${t.accentBg} ${t.accentText} text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all`}
                >
                  Review booking <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {screen === "confirm" && (
              <div className="flex gap-3">
                <button onClick={() => setScreen("details")} className={`flex items-center gap-1.5 px-5 py-4 rounded-2xl border ${t.slotBorder} text-sm ${t.muted} hover:opacity-80 transition-all`}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setDone(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold py-4 rounded-2xl hover:bg-emerald-700 transition-all"
                >
                  Pay R{svc?.deposit} &amp; Confirm <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className={`text-center text-xs ${t.muted}`}>Powered by NextSlot</p>
          </div>
        </>
      )}
    </div>
  );
};

export default BookingAppPreview;
