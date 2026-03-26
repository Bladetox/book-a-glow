import { useState, useMemo, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Plus,
  Trash2,
  Clock,
  Loader2,
} from "lucide-react";
import { businessThemes, getThemeCssVars } from "@/components/onboarding/themes";
import { supabase } from "@/integrations/supabase/client";

const availabilityPresets = [
  { label: "Standard Work Week", desc: "Mon–Fri, 09:00–17:00", schedule: { mon: "09:00–17:00", tue: "09:00–17:00", wed: "09:00–17:00", thu: "09:00–17:00", fri: "09:00–17:00", sat: "Closed", sun: "Closed" } },
  { label: "Weekend Business", desc: "Thu–Sun, 09:00–18:00", schedule: { mon: "Closed", tue: "Closed", wed: "Closed", thu: "09:00–18:00", fri: "09:00–18:00", sat: "09:00–18:00", sun: "09:00–15:00" } },
  { label: "Custom Schedule", desc: "Set your own hours", schedule: { mon: "09:00–18:00", tue: "09:00–18:00", wed: "Closed", thu: "09:00–18:00", fri: "09:00–19:00", sat: "09:00–15:00", sun: "Closed" } },
];

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = typeof days[number];
const dayLabels: Record<DayKey, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
// day_of_week: 0=Sun,1=Mon,...,6=Sat
const dayOfWeekMap: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

interface Service { name: string; price: string; duration: string; }

/** Generate 30-min slots between two "HH:MM" strings */
function generateSlots(start: string, end: string): { slot_start_time: string; slot_end_time: string }[] {
  const slots: { slot_start_time: string; slot_end_time: string }[] = [];
  const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  let cur = toMins(start);
  const endMins = toMins(end);
  while (cur + 30 <= endMins) {
    slots.push({ slot_start_time: toTime(cur), slot_end_time: toTime(cur + 30) });
    cur += 30;
  }
  return slots;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [services, setServices] = useState<Service[]>([{ name: "", price: "", duration: "30" }]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [schedule, setSchedule] = useState(availabilityPresets[0].schedule);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Not authenticated. Please sign in again.");

      // 1. Create tenant
      const { error: tenantErr } = await supabase.from("tenants").insert({
        id: slug,
        name: businessName.trim(),
        owner_id: user.id,
        theme_id: activeTheme?.label.toLowerCase().replace(/\s+/g, "_") ?? "standard",
        currency: "R",
        is_active: true,
      });
      if (tenantErr) throw new Error(`Failed to create tenant: ${tenantErr.message}`);

      // 2. Assign owner role
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: user.id,
        tenant_id: slug,
        role: "owner",
      });
      if (roleErr) throw new Error(`Failed to assign role: ${roleErr.message}`);

      // 3. Update profile with tenant_id and owner role
      await supabase.from("profiles").update({ tenant_id: slug, role: "owner" }).eq("id", user.id);

      // 4. Insert services (only ones with a name)
      const validServices = services.filter((s) => s.name.trim());
      if (validServices.length > 0) {
        const serviceRows = validServices.map((s) => ({
          tenant_id: slug,
          name: s.name.trim(),
          price: parseFloat(s.price) || 0,
          duration_minutes: parseInt(s.duration, 10),
          category: businessType ?? "General",
          is_active: true,
        }));
        const { error: svcErr } = await supabase.from("services").insert(serviceRows);
        if (svcErr) throw new Error(`Failed to save services: ${svcErr.message}`);
      }

      // 5. Insert staff_availability slots
      const availabilityRows: {
        tenant_id: string;
        staff_id: string;
        day_of_week: number;
        slot_start_time: string;
        slot_end_time: string;
        is_available: boolean;
        day_enabled: boolean;
      }[] = [];

      for (const day of days) {
        const hours = schedule[day];
        if (hours === "Closed") continue;
        const [start, end] = hours.split("–");
        const slots = generateSlots(start, end);
        for (const slot of slots) {
          availabilityRows.push({
            tenant_id: slug,
            staff_id: user.id,
            day_of_week: dayOfWeekMap[day],
            slot_start_time: slot.slot_start_time,
            slot_end_time: slot.slot_end_time,
            is_available: true,
            day_enabled: true,
          });
        }
      }

      if (availabilityRows.length > 0) {
        const { error: availErr } = await supabase.from("staff_availability").insert(availabilityRows);
        if (availErr) throw new Error(`Failed to save availability: ${availErr.message}`);
      }

      // Done — redirect to dashboard
      navigate("/admin");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 5;

  return (
    <div className="nextslot-theme min-h-screen flex flex-col transition-colors duration-500 bg-background text-foreground" style={themeStyle}>
      <div className="border-b border-border bg-background/80 backdrop-blur-sm transition-colors duration-500">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot"
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-10 w-10 object-contain rounded-lg shrink-0"
            />
            <span className="text-base font-bold tracking-tight leading-none">
              Next<span className="text-accent">Slot</span>
            </span>
          </Link>
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

        {step === 4 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">Set your availability</h1><p className="text-muted-foreground text-sm">When can clients book you?</p></div><div className="grid grid-cols-3 gap-2">{availabilityPresets.map((preset, i) => <button key={preset.label} onClick={() => { setSelectedPreset(i); setSchedule(preset.schedule); }} className={`p-3 rounded-xl border text-left transition-all ${selectedPreset === i ? "border-primary gradient-card shadow-elevated" : "border-border hover:border-foreground/20 hover:shadow-soft"}`}><p className="text-xs font-semibold mb-0.5 text-foreground">{preset.label}</p><p className="text-[10px] text-muted-foreground">{preset.desc}</p></button>)}</div><div className="space-y-1.5">{days.map((day) => {const isCustom = selectedPreset === 2; const isClosed = schedule[day] === "Closed"; const timeParts = !isClosed ? schedule[day].split("–") : ["09:00", "17:00"]; return <div key={day} className="flex items-center justify-between gradient-surface rounded-lg px-4 py-2.5 border border-border/50 gap-2"><span className="text-sm font-medium w-24 text-foreground shrink-0">{dayLabels[day]}</span>{isCustom ? <div className="flex items-center gap-2"><button onClick={() => {const updated = { ...schedule }; updated[day] = isClosed ? "09:00–17:00" : "Closed"; setSchedule(updated as typeof schedule);}} className={`text-xs px-2 py-1 rounded-md border transition-colors ${isClosed ? "border-border text-muted-foreground" : "border-primary text-primary bg-primary/10"}`}>{isClosed ? "Closed" : "Open"}</button>{!isClosed && <><input type="time" value={timeParts[0]} onChange={(e) => {const updated = { ...schedule }; updated[day] = `${e.target.value}–${timeParts[1]}`; setSchedule(updated as typeof schedule);}} className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground w-24" /><span className="text-xs text-muted-foreground">–</span><input type="time" value={timeParts[1]} onChange={(e) => {const updated = { ...schedule }; updated[day] = `${timeParts[0]}–${e.target.value}`; setSchedule(updated as typeof schedule);}} className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground w-24" /></>}</div> : <span className={`text-sm ml-auto ${isClosed ? "text-muted-foreground" : "text-foreground font-medium"}`}>{schedule[day]}</span>}</div>;})}</div></div>}

        {step === 5 && <div className="space-y-8 animate-fade-in"><div><h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2 text-foreground">You're all set! 🎉</h1><p className="text-muted-foreground text-sm">Your booking page is ready. Share it with your clients.</p></div><div className="gradient-card rounded-xl p-5 border border-border shadow-soft space-y-3"><p className="text-xs text-muted-foreground">Your booking link</p><div className="flex items-center gap-2"><span className="flex-1 text-sm font-mono font-semibold text-foreground truncate">{bookingUrl}</span><button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">{copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied!" : "Copy"}</button></div></div><div className="gradient-surface rounded-xl p-4 border border-border/50 space-y-2"><p className="text-xs font-medium text-muted-foreground mb-3">Summary</p><p className="text-sm text-foreground"><span className="text-muted-foreground">Business: </span>{businessName}</p><p className="text-sm text-foreground"><span className="text-muted-foreground">Type: </span>{businessType}</p><p className="text-sm text-foreground"><span className="text-muted-foreground">Services: </span>{services.filter(s => s.name.trim()).length} added</p></div>{submitError && <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{submitError}</div>}</div>}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 1 ? <button onClick={() => setStep(step - 1)} disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back</button> : <div />}
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">Continue<ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={handleComplete} disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Setting up...</> : <>Go to Dashboard<ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div></div>
    </div>
  );
};

export default Onboarding;
