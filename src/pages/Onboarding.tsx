import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Copy, Plus, Trash2, Clock } from "lucide-react";
import logo from "@/assets/nextslot-logo.png";
import { businessThemes } from "@/data/themes";

const availabilityPresets = [
  { label: "Standard Work Week", desc: "Mon–Fri, 09:00–17:00", schedule: { mon: "09:00–17:00", tue: "09:00–17:00", wed: "09:00–17:00", thu: "09:00–17:00", fri: "09:00–17:00", sat: "Closed", sun: "Closed" } },
  { label: "Weekend Business", desc: "Thu–Sun, 09:00–18:00", schedule: { mon: "Closed", tue: "Closed", wed: "Closed", thu: "09:00–18:00", fri: "09:00–18:00", sat: "09:00–18:00", sun: "09:00–15:00" } },
  { label: "Custom Schedule", desc: "Set your own hours", schedule: { mon: "09:00–18:00", tue: "09:00–18:00", wed: "Closed", thu: "09:00–18:00", fri: "09:00–19:00", sat: "09:00–15:00", sun: "Closed" } },
];

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const dayLabels: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

interface Service { name: string; price: string; duration: string; }

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [services, setServices] = useState<Service[]>([{ name: "", price: "", duration: "30" }]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [schedule, setSchedule] = useState(availabilityPresets[0].schedule);
  const [copied, setCopied] = useState(false);

  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
  const bookingUrl = slug ? `${slug}.nextslot.app` : "yourbusiness.nextslot.app";

  const activeTheme = useMemo(() => {
    if (!businessType) return null;
    return businessThemes.find((t) => t.label === businessType) ?? null;
  }, [businessType]);

  const canProceed = () => {
    if (step === 1) return !!businessType;
    if (step === 2) return businessName.trim().length >= 2;
    if (step === 3) return services.some((s) => s.name.trim());
    return true;
  };

  const addService = () => setServices([...services, { name: "", price: "", duration: "30" }]);
  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof Service, value: string) => {
    const updated = [...services];
    updated[i] = { ...updated[i], [field]: value };
    setServices(updated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${bookingUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="NextSlot" className="h-10 w-auto mix-blend-multiply dark:mix-blend-screen" /></Link>
          <div className="flex items-center gap-3">
            {activeTheme && <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-accent/20 text-accent-foreground">{activeTheme.vibe}</span>}
            <span className="text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 w-full mt-6">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i < step ? "bg-primary" : "bg-border"}`} />)}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 pb-20 px-4">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Let's set up your booking page</h1><p className="text-muted-foreground text-sm">Select your business type.</p></div>
              <div className="space-y-2">
                {businessThemes.map((type) => (
                  <button key={type.label} onClick={() => setBusinessType(type.label)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 text-left ${businessType === type.label ? "border-primary bg-card shadow-lg" : "border-border hover:border-foreground/20"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${businessType === type.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {type.label.charAt(0)}
                    </div>
                    <div className="flex-1"><p className="text-sm font-semibold">{type.label}</p><p className="text-xs text-muted-foreground">{type.vibe}</p></div>
                    {businessType === type.label && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">What's your business called?</h1><p className="text-muted-foreground text-sm">This will appear on your booking page.</p></div>
              <div className="space-y-4">
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your business name" />
                {businessName.trim() && <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground mb-1">Your booking page will be:</p><p className="text-sm font-mono font-semibold">{bookingUrl}</p></div>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Add your services</h1><p className="text-muted-foreground text-sm">What do you offer?</p></div>
              <div className="space-y-3">
                {services.map((service, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Service {i + 1}</span>{services.length > 1 && <button onClick={() => removeService(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
                    <input type="text" value={service.name} onChange={(e) => updateService(i, "name", e.target.value)} placeholder="Service name" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={service.price} onChange={(e) => updateService(i, "price", e.target.value)} placeholder="Price (R)" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <select value={service.duration} onChange={(e) => updateService(i, "duration", e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button onClick={addService} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4" />Add another service</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Set your availability</h1><p className="text-muted-foreground text-sm">When can clients book you?</p></div>
              <div className="grid grid-cols-3 gap-2">
                {availabilityPresets.map((preset, i) => (
                  <button key={preset.label} onClick={() => { setSelectedPreset(i); setSchedule(preset.schedule); }} className={`p-3 rounded-xl border text-left transition-all ${selectedPreset === i ? "border-primary bg-card shadow-lg" : "border-border hover:border-foreground/20"}`}>
                    <p className="text-xs font-semibold mb-0.5">{preset.label}</p><p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                {days.map((day) => (
                  <div key={day} className="flex items-center justify-between bg-card rounded-lg px-4 py-2.5 border border-border/50">
                    <span className="text-sm font-medium w-24">{dayLabels[day]}</span>
                    <span className={`text-sm ${schedule[day] === "Closed" ? "text-muted-foreground" : ""}`}>{schedule[day]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-fade-in text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Check className="h-8 w-8 text-primary" /></div>
              <div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Your booking page is ready</h1><p className="text-muted-foreground text-sm">Share it anywhere and start accepting bookings.</p></div>
              <div className="bg-card rounded-xl p-5 space-y-3 border border-border shadow-lg">
                <p className="text-xs text-muted-foreground">Your booking link</p>
                <p className="text-lg font-mono font-semibold">{bookingUrl}</p>
                <button onClick={handleCopy} className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 shadow-lg transition-all">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Booking Link"}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link to="/book" className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-6 py-3 rounded-[10px] hover:opacity-90 transition-opacity">Preview Booking Page <ArrowRight className="ml-2 h-4 w-4" /></Link>
                <Link to="/admin" className="inline-flex items-center justify-center border border-border text-sm font-medium px-6 py-3 rounded-[10px] hover:bg-secondary transition-all">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {step < 5 && (
        <div className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="max-w-lg mx-auto px-4 py-4 flex gap-3">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-all flex items-center justify-center gap-2"><ArrowLeft className="h-4 w-4" />Back</button>}
            <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center justify-center gap-2">Continue <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
