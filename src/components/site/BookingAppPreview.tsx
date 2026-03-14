import { useState } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight,
  Clock, CreditCard, MapPin, Palette, User, Phone, Mail, Scissors
} from "lucide-react";

const TENANT = "Blade & Co.";
const TAGLINE = "Premium Barbershop";
const LOCATION = "Cape Town, SA";

const services = [
  { id: "1", name: "Signature Fade", duration: "45 min", price: 500, deposit: 250, desc: "Clean skin fade, styled finish." },
  { id: "2", name: "Hot Towel Shave", duration: "40 min", price: 450, deposit: 225, desc: "Classic straight-razor shave with hot towel." },
  { id: "3", name: "Beard Sculpt", duration: "30 min", price: 350, deposit: 175, desc: "Shape and define your beard." },
  { id: "4", name: "Kids Cut", duration: "30 min", price: 280, deposit: 140, desc: "For the little ones. Patient, friendly." },
  { id: "5", name: "Shape-up", duration: "20 min", price: 200, deposit: 100, desc: "Edge-up and line clean." },
];

const timeSlots = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "15:00", "15:30"];
const blockedSlots = ["09:00", "10:00", "13:30"];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATES = [16, 17, 18, 19, 20, 21];
const themes = ["Classic", "Dark", "Blush", "Sage", "Slate"];

type Screen = "services" | "datetime" | "details" | "confirm";

const BookingAppPreview = () => {
  const [screen, setScreen] = useState<Screen>("services");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [form, setForm] = useState({ name: "Sipho M.", phone: "082 555 0123", email: "sipho@email.com", notes: "" });
  const [done, setDone] = useState(false);

  const svc = services.find(s => s.id === selectedService);
  const progress: Record<Screen, number> = { services: 1, datetime: 2, details: 3, confirm: 4 };
  const steps = ["Service", "Date & Time", "Details", "Confirm"];

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center bg-white px-8 py-12 text-center space-y-6" style={{ minHeight: "100%" }}>
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-sm text-gray-400">A confirmation has been sent to your email.</p>
        </div>
        <div className="w-full bg-gray-50 rounded-2xl p-5 text-left space-y-3">
          <p className="text-sm font-semibold text-gray-700">{svc?.name}</p>
          <p className="text-xs text-gray-400">{DAYS[selectedDay]} 16 Mar at {selectedTime}</p>
          <p className="text-xs text-gray-400">{TENANT} · {LOCATION}</p>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="text-xs text-gray-400">Deposit paid</span>
            <span className="text-xs font-semibold text-gray-700">R{svc?.deposit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-400">Balance due on day</span>
            <span className="text-xs font-semibold text-gray-700">R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
          </div>
        </div>
        <button
          onClick={() => { setDone(false); setScreen("services"); setSelectedService(null); setSelectedTime(null); }}
          className="text-sm text-gray-400 underline"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-none">{TENANT}</p>
              <p className="text-xs text-gray-400 leading-none mt-1">{TAGLINE}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5" />{LOCATION}
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
                progress[screen] > i + 1 ? "bg-emerald-500 text-white" :
                progress[screen] === i + 1 ? "bg-gray-900 text-white" :
                "bg-gray-100 text-gray-400"
              }`}>
                {progress[screen] > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[11px] hidden sm:block ${
                progress[screen] === i + 1 ? "text-gray-900 font-semibold" : "text-gray-300"
              }`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-px ${ progress[screen] > i + 1 ? "bg-emerald-300" : "bg-gray-100" }`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Screen content */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden px-6 py-6">

        {/* SCREEN 1: SERVICES */}
        {screen === "services" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Choose a service</h2>
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedService === s.id
                    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" />{s.duration}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400"><CreditCard className="w-3.5 h-3.5" />R{s.deposit} deposit</span>
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-base font-bold text-gray-900">R{s.price}</p>
                    {selectedService === s.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto mt-1" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* SCREEN 2: DATE & TIME */}
        {screen === "datetime" && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Pick a date</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => { setSelectedDay(i); setSelectedTime(null); }}
                  className={`flex flex-col items-center min-w-[56px] py-3 px-2 rounded-2xl border text-center transition-all ${
                    selectedDay === i ? "border-gray-900 bg-gray-900 text-white" : "border-gray-100 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span className="text-[11px] font-medium">{d}</span>
                  <span className="text-lg font-bold mt-0.5">{DATES[i]}</span>
                  <span className="text-[10px] mt-0.5 opacity-60">Mar</span>
                </button>
              ))}
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Available times</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {timeSlots.map(t => {
                const blocked = blockedSlots.includes(t);
                return (
                  <button
                    key={t}
                    disabled={blocked}
                    onClick={() => setSelectedTime(t)}
                    className={`py-3 rounded-2xl text-sm font-medium border transition-all ${
                      blocked ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" :
                      selectedTime === t ? "bg-gray-900 text-white border-gray-900" :
                      "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {blocked ? <span className="line-through">{t}</span> : t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SCREEN 3: DETAILS */}
        {screen === "details" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Your details</h2>
            {([
              { icon: User, key: "name", label: "Full name", type: "text" },
              { icon: Phone, key: "phone", label: "Phone number", type: "tel" },
              { icon: Mail, key: "email", label: "Email address", type: "email" },
            ] as { icon: React.ElementType; key: keyof typeof form; label: string; type: string }[]).map(f => (
              <div key={f.key} className="relative">
                <f.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>
            ))}
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any notes for your barber? (optional)"
              rows={2}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-gray-900 transition-colors resize-none"
            />
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Booking summary</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{svc?.name}</span><span>R{svc?.price}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{DAYS[selectedDay]} 16 Mar · {selectedTime}</span><span>{svc?.duration}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-sm font-medium text-gray-700">Deposit due now</span>
                <span className="text-sm font-bold text-gray-900">R{svc?.deposit}</span>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: CONFIRM */}
        {screen === "confirm" && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Confirm your booking</h2>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-base font-bold text-gray-900">{svc?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{svc?.duration} · {TENANT}</p>
                </div>
                <span className="text-base font-bold text-gray-900">R{svc?.price}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm text-gray-500"><span>Date</span><span>{DAYS[selectedDay]}, 16 Mar 2026</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>Time</span><span>{selectedTime}</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>Name</span><span>{form.name}</span></div>
                <div className="flex justify-between text-sm text-gray-500"><span>Phone</span><span>{form.phone}</span></div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Deposit to pay now</span>
                  <span className="text-sm font-bold text-gray-900">R{svc?.deposit}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">Balance on the day</span>
                  <span className="text-sm text-gray-500">R{(svc?.price || 0) - (svc?.deposit || 0)}</span>
                </div>
              </div>
            </div>
            {/* Yoco payment mock */}
            <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CreditCard className="w-4 h-4" />Pay deposit via Yoco</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 font-mono">4242 4242 4242 4242</div>
              <div className="flex gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 font-mono flex-1">03/28</div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 font-mono flex-1">123</div>
              </div>
            </div>
            {/* Theme picker */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-300 shrink-0" />
              <p className="text-xs text-gray-400 mr-1">Theme:</p>
              {themes.map((t, i) => (
                <button key={t} onClick={() => setSelectedTheme(i)} title={t}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    selectedTheme === i ? "border-gray-900 scale-110" : "border-transparent"
                  } ${
                    ["bg-gray-900","bg-slate-700","bg-pink-300","bg-emerald-400","bg-slate-400"][i]
                  }`}
                />
              ))}
              <span className="text-xs text-gray-400 ml-1">{themes[selectedTheme]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav — sticky bottom */}
      <div className="px-6 pb-8 pt-4 border-t border-gray-100 space-y-3">
        {screen === "services" && (
          <button
            disabled={!selectedService}
            onClick={() => setScreen("datetime")}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {screen === "datetime" && (
          <div className="flex gap-3">
            <button onClick={() => setScreen("services")} className="flex items-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={!selectedTime}
              onClick={() => setScreen("details")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {screen === "details" && (
          <div className="flex gap-3">
            <button onClick={() => setScreen("datetime")} className="flex items-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={!form.name || !form.phone || !form.email}
              onClick={() => setScreen("confirm")}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-4 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Review booking <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {screen === "confirm" && (
          <div className="flex gap-3">
            <button onClick={() => setScreen("details")} className="flex items-center gap-1.5 px-5 py-4 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
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
        <p className="text-center text-xs text-gray-300">Powered by NextSlot</p>
      </div>
    </div>
  );
};

export default BookingAppPreview;
