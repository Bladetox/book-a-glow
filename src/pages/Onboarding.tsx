import { useState, useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import logo from "@/assets/nextslot-logo.png";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";

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

  const themeStyle = useMemo(() => {
    if (!activeTheme) return {};
    return getThemeCssVars(activeTheme) as CSSProperties;
  }, [activeTheme]);

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
    <div className="nextslot-theme min-h-screen flex flex-col transition-colors duration-500 bg-background text-foreground" style={themeStyle}>
      <div className="border-b border-border bg-background/80 backdrop-blur-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><img src={logo} alt="NextSlot" className="h-10 w-auto mix-blend-multiply dark:mix-blend-screen" /></Link>
          <div className="flex items-center gap-3">
            {activeTheme && <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-accent/20 text-accent-foreground transition-colors duration-500">{activeTheme.vibe}</span>}
            <span className="text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 w-full mt-6"><div className="flex gap-1.5">{Array.from({ length: totalSteps }).map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i < step ? "bg-primary" : "bg-border"}`} />)}</div></div>

      <div className="flex-1 flex items-start justify-center pt-12 pb-20 px-4"><div className="w-full max-w-lg">
        {step === 1 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">Let's set up your booking page</h1><p className="text-muted-foreground text-sm">Select your business type, and the page will adapt to your vibe. This will be your customer-facing app.</p></div><div className="space-y-2">{businessThemes.map((type) => <button key={type.label} onClick={() => setBusinessType(type.label)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 text-left ${businessType === type.label ? "border-primary gradient-card shadow-elevated" : "border-border hover:border-foreground/20 hover:shadow-soft gradient-surface"}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${businessType === type.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><type.icon className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-semibold text-foreground">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p></div><span className="text-[10px] text-muted-foreground hidden sm:block">{type.vibe}</span>{businessType === type.label && <Check className="h-4 w-4 text-primary" />}</button>)}</div></div>}

        {step === 2 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">What's your business called?</h1><p className="text-muted-foreground text-sm">This will appear on your booking page.</p></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1.5 text-foreground">Business name</label><input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-soft transition-all duration-300" placeholder="" /></div>{businessName.trim() && <div className="gradient-card rounded-xl p-4 animate-fade-in border border-border shadow-soft"><p className="text-xs text-muted-foreground mb-1">Your booking page will be:</p><p className="text-sm font-mono font-semibold">{bookingUrl}</p><p className="text-xs text-muted-foreground mt-2">You can connect your own domain later.</p></div>}</div></div>}

        {step === 3 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">Add your services</h1><p className="text-muted-foreground text-sm">What do you offer? You can always edit these later.</p></div><div className="space-y-3">{services.map((service, i) => <div key={i} className="gradient-card border border-border rounded-xl p-4 space-y-3 shadow-soft"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Service {i + 1}</span>{services.length > 1 && <button onClick={() => removeService(i)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>}</div><input type="text" value={service.name} onChange={(e) => updateService(i, "name", e.target.value)} placeholder="Service name (e.g. Fade Cut)" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" /><div className="grid grid-cols-2 gap-3"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">R</span><input type="text" value={service.price} onChange={(e) => updateService(i, "price", e.target.value)} placeholder="Price (R)" className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" /></div><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><select value={service.duration} onChange={(e) => updateService(i, "duration", e.target.value)} className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option></select></div></div></div>)}<button onClick={addService} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:shadow-soft transition-all"><Plus className="h-4 w-4" />Add another service</button></div></div>}

        {step === 4 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">Set your availability</h1><p className="text-muted-foreground text-sm">When can clients book you?</p></div><div className="grid grid-cols-3 gap-2">{availabilityPresets.map((preset, i) => <button key={preset.label} onClick={() => { setSelectedPreset(i); setSchedule(preset.schedule); }} className={`p-3 rounded-xl border text-left transition-all ${selectedPreset === i ? "border-primary gradient-card shadow-elevated" : "border-border hover:border-foreground/20 hover:shadow-soft"}`}><p className="text-xs font-semibold mb-0.5 text-foreground">{preset.label}</p><p className="text-[10px] text-muted-foreground">{preset.desc}</p></button>)}</div><div className="space-y-1.5">{days.map((day) => {const isCustom = selectedPreset === 2; const isClosed = schedule[day] === "Closed"; const timeParts = !isClosed ? schedule[day].split("–") : ["09:00", "17:00"]; return <div key={day} className="flex items-center justify-between gradient-surface rounded-lg px-4 py-2.5 border border-border/50 gap-2"><span className="text-sm font-medium w-24 text-foreground shrink-0">{dayLabels[day]}</span>{isCustom ? <div className="flex items-center gap-2"><button onClick={() => {const updated = { ...schedule }; updated[day] = isClosed ? "09:00–17:00" : "Closed"; setSchedule(updated);}} className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${isClosed ? "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>{isClosed ? "Open" : "Close"}</button>{!isClosed && <div className="flex items-center gap-1"><input type="time" value={timeParts[0]} onChange={(e) => {const updated = { ...schedule }; updated[day] = `${e.target.value}–${timeParts[1]}`; setSchedule(updated);}} className="w-[5.5rem] px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-all" /><span className="text-muted-foreground text-xs">–</span><input type="time" value={timeParts[1]} onChange={(e) => {const updated = { ...schedule }; updated[day] = `${timeParts[0]}–${e.target.value}`; setSchedule(updated);}} className="w-[5.5rem] px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-all" /></div>}{isClosed && <span className="text-sm text-muted-foreground">Closed</span>}</div> : <span className={`text-sm ${isClosed ? "text-muted-foreground" : "text-foreground"}`}>{schedule[day]}</span>}</div>;})}</div></div>}

        {step === 5 && <div className="space-y-8 animate-fade-in text-center"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto shadow-glow"><Check className="h-8 w-8 text-primary" /></div><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">Your booking page is ready</h1><p className="text-muted-foreground text-sm">Share it anywhere and start accepting bookings.</p></div><div className="gradient-card rounded-xl p-5 space-y-3 border border-border shadow-elevated"><p className="text-xs text-muted-foreground">Your booking link</p><p className="text-lg font-mono font-semibold text-foreground">{bookingUrl}</p><button onClick={handleCopy} className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 shadow-elevated transition-all">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied!" : "Copy Booking Link"}</button></div><div><p className="text-sm font-medium mb-3">Share on</p><div className="flex justify-center gap-3">{[{ label: "WhatsApp", color: "bg-emerald-500", url: `https://wa.me/?text=Book%20me%20at%20https://${bookingUrl}` },{ label: "Instagram", color: "bg-pink-500", url: "#" },{ label: "Website", color: "bg-primary", url: "#" }].map((channel) => <a key={channel.label} href={channel.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:shadow-soft gradient-surface transition-all"><div className={`w-2 h-2 rounded-full ${channel.color}`} />{channel.label}</a>)}</div></div><Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link></div>}
      </div></div>

      {step < 5 && <div className="border-t border-border bg-background/80 backdrop-blur-sm transition-colors duration-500"><div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between"><button onClick={() => step > 1 && setStep(step - 1)} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 1 ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`} disabled={step === 1}><ArrowLeft className="h-4 w-4" />Back</button><button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()} className={`flex items-center gap-2 text-sm font-medium px-6 py-2.5 rounded-[10px] transition-all ${canProceed() ? "bg-primary text-primary-foreground hover:opacity-90 shadow-elevated" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>Continue <ArrowRight className="h-4 w-4" /></button></div></div>}
    </div>
  );
};

export default Onboarding;
