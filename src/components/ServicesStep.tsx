import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useSuggestedAddons, getActiveSuggestions, getSelectedAddonsForTrigger } from "@/hooks/useSuggestedAddons";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useState, useMemo } from "react";
import { Loader2, Plus, Minus, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onAdd, onRemove }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const { data: addonsConfig } = useSuggestedAddons();
  const config = usePublicBusinessConfig();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // ── Derive the step-1 heading from app_settings or fall back to a neutral label ──
  const servicesHeading: string =
    (config as Record<string, string>)["services_step_heading"] ?? "Select a service";

  // ── Derive suggestion strip ──────────────────────────────────────────────
  const suggestionStrip = useMemo(() => {
    if (!addonsConfig) return null;

    const suggestedIds = getActiveSuggestions(addonsConfig, selectedTreatments);
    if (suggestedIds.length === 0) return null;

    const suggestions = suggestedIds
      .map((id) => treatments.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t);

    return suggestions.length > 0 ? suggestions : null;
  }, [addonsConfig, selectedTreatments, treatments]);

  if (loadingServices || loadingCats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCat = activeCategory ?? (categories[0]?.id ?? null);

  const visibleTreatments = activeCat
    ? treatments.filter((t) => t.category === activeCat)
    : [];

  /** How many times this id appears in the current selection */
  const qty = (id: string) => selectedTreatments.filter((t) => t === id).length;

  const totalSelected = selectedTreatments.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          {servicesHeading}
        </h3>
        {totalSelected > 0 && (
          <span className="text-[10px] font-semibold text-primary">
            {totalSelected} selected
          </span>
        )}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => {
            const isActive = activeCat === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-pill whitespace-nowrap shrink-0 transition-all duration-200 ${
                  isActive ? "active" : ""
                }`}
              >
                {cat.label}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Add-on suggestion strip — sits RIGHT above the service list ─────── */}
      <AnimatePresence initial={false}>
        {suggestionStrip && (
          <motion.div
            key="addon-strip"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              {/* Strip header */}
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary">
                  Recommended add-ons
                </span>
              </div>

              {suggestionStrip.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18, delay: i * 0.06 }}
                  className="flex items-center gap-3 w-full"
                >
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground leading-snug">
                      {s.name}
                    </span>
                    {s.duration > 0 && (
                      <span className="block text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                        {s.duration} min
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    R{s.price}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onAdd(s.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center border border-primary/40 bg-primary/10 text-primary hover:bg-primary/25 transition-colors shrink-0"
                    aria-label={`Add ${s.name}`}
                  >
                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services for active category */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCat ?? "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-2"
        >
          {visibleTreatments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No services in this category.
            </p>
          ) : (
            visibleTreatments.map((t) => {
              const count = qty(t.id);
              const isSelected = count > 0;

              // Add-ons already selected that belong to this trigger service
              const nestedAddonIds = addonsConfig
                ? getSelectedAddonsForTrigger(addonsConfig, t.id, selectedTreatments)
                : [];
              const nestedAddons = nestedAddonIds
                .map((id) => treatments.find((tr) => tr.id === id))
                .filter((tr): tr is NonNullable<typeof tr> => !!tr);

              return (
                <div
                  key={t.id}
                  className={`glass-card-service rounded-xl px-4 py-3.5 flex flex-col gap-0 w-full transition-all duration-150 ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  {/* Main service row */}
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground leading-snug">
                        {t.name}
                      </span>
                      {t.description && (
                        <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {t.description}
                        </span>
                      )}
                      {t.duration > 0 && (
                        <span className="block text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                          {t.duration} min
                        </span>
                      )}
                    </div>

                    <span className="shrink-0 text-sm font-bold text-foreground">
                      R{t.price}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <AnimatePresence>
                        {isSelected && (
                          <motion.button
                            key="minus"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => onRemove(t.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            aria-label={`Remove one ${t.name}`}
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.5} />
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {isSelected && (
                          <motion.span
                            key="count"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="w-5 text-center text-sm font-bold text-foreground"
                          >
                            {count}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onAdd(t.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-muted-foreground/30 bg-transparent text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                        aria-label={`Add ${t.name}`}
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Nested selected add-ons */}
                  <AnimatePresence initial={false}>
                    {nestedAddons.map((a) => {
                      const aCount = qty(a.id);
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="flex items-center gap-3 w-full pt-2.5 mt-2.5 border-t border-primary/10">
                            {/* Indent indicator */}
                            <span className="text-[10px] text-primary/50 shrink-0 select-none">↳</span>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs font-semibold text-foreground/80 leading-snug">
                                {a.name}
                              </span>
                              {a.duration > 0 && (
                                <span className="block text-[10px] text-muted-foreground/50 leading-snug mt-0.5">
                                  {a.duration} min
                                </span>
                              )}
                            </div>
                            <span className="shrink-0 text-xs font-bold text-foreground/70">
                              R{a.price}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => onRemove(a.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                aria-label={`Remove one ${a.name}`}
                              >
                                <Minus className="w-2.5 h-2.5" strokeWidth={2.5} />
                              </motion.button>
                              <span className="w-4 text-center text-xs font-bold text-foreground">
                                {aCount}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => onAdd(a.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center border border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                aria-label={`Add another ${a.name}`}
                              >
                                <Plus className="w-2.5 h-2.5" strokeWidth={2.5} />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ServicesStep;
