import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { MapPin, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface Props {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

const AddressAutocomplete = ({ value, onChange, placeholder = "Start typing your address..." }: Props) => {
  const { tenantId } = usePublicTenant();
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (input: string) => {
      if (input.length < 3) { setPredictions([]); setOpen(false); return; }
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-autocomplete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ input, tenant_id: tenantId }),
          }
        );
        const data = await res.json();
        if (data.predictions?.length) {
          setPredictions(data.predictions);
          setOpen(true);
        } else {
          setPredictions([]);
          setOpen(false);
        }
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    },
    [tenantId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 320);
  };

  const handleSelect = (p: Prediction) => {
    setQuery(p.description);
    onChange(p.description);
    setPredictions([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setPredictions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <MapPin className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-3 rounded-2xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
        />
        {loading && <Loader2 className="absolute right-3.5 w-4 h-4 animate-spin text-muted-foreground" />}
        {!loading && query && (
          <button onClick={handleClear} className="absolute right-3.5 p-0.5 rounded-full hover:bg-muted/60 transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 glass-card rounded-2xl overflow-hidden shadow-xl"
          >
            {predictions.map((p) => (
              <button
                key={p.place_id}
                onClick={() => handleSelect(p)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/20 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{p.main_text}</p>
                  <p className="text-xs text-muted-foreground">{p.secondary_text}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressAutocomplete;
