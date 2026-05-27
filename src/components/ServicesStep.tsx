import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useSuggestedAddons } from "@/hooks/useSuggestedAddons";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import AddonPopup from "@/components/AddonPopup";
import { useState, useMemo } from "react";
import { Loader2, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicService } from "@/hooks/usePublicServices";

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

  // Popup state: which service triggered it
  const [popupTrigger, setPopupTrigger] = useState<PublicService | null>(null);

  // ── Derive the step-1 heading from app_settings or fall back to a neutral label ──
  const servicesHeading: string =
    (config as Record<string, string>)["services_step_heading"] ?? "Select a service";

  // ── Build a map: triggerId → addon PublicService[] ───────────────────────
  const addonsByTrigger = useMemo(() => {
    const map = new Map<string, PublicService[]>();
    if (!addonsConfig) return map;
    for (const rule of addonsConfig.rules) {
      const addons = rule.suggestIds
        .map((id) => treatments.find((t) => t.id === id))
        .filter((t): t is PublicService => !!t);
      if (addons.length > 0) map.set(rule.triggerId, addons);
    }
    return map;
  }, [addonsConfig, treatments]);

  if (loadingServices || loadingCats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCat = activeCategory ?? (categories[0]?.id ?? null);

  // All active services in the selected category are shown — is_addon only
  // controls whether a service appears as a suggestion in the popup, never
  // whether it is visible in the tab.
  const visibleTreatments = activeCat
    ? treatments.filter((t) => t.category === activeCat)
    : [];

  const selectedSet = new Set(selectedTreatments);
  const totalSelected = selectedTreatments.length;

  // When client taps a service card's + button:
  // 1. Add it to the basket
  // 2. If it has configured add-ons, open the popup
  // 3. If not, go straight to cart (no popup)
  const handleServiceAdd = (t: PublicService) => {
    onAdd(t.id);
    const addons = addonsByTrigger.get(t.id);
    if (addons && addons.length > 0) {
      setPopupTrigger(t);
    }
  };

  // Tapping the selected (check) state removes one instance
  const handleServiceToggle = (t: PublicService) => {
    if (selectedSet.has(t.id)) {
      onRemove(t.id);
    } else {
      handleServiceAdd(t);
    }
  };

  return (
    <>
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
                const isSelected = selectedSet.has(t.id);
                const hasAddons = (addonsByTrigger.get(t.id)?.length ?? 0) > 0;

                return (
                  <motion.div
                    key={t.id}
                    layout
                    className={`glass-card-service rounded-xl px-4 py-3.5 flex items-center gap-3 w-full transition-all duration-150 ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    {/* Service info */}
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

                    {/* Single toggle button — check when selected, + when not */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleServiceToggle(t)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border-muted-foreground/30 bg-transparent text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                      aria-label={isSelected ? `Remove ${t.name}` : `Add ${t.name}`}
                    >
                      {isSelected
                        ? <Check className="w-3 h-3" strokeWidth={2.5} />
                        : <Plus className="w-3 h-3" strokeWidth={2.5} />}
                    </motion.button>

                    {/* Re-open popup hint when selected and has add-ons */}
                    {isSelected && hasAddons && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setPopupTrigger(t)}
                        className="text-[9px] font-semibold text-primary/70 hover:text-primary transition-colors shrink-0 underline underline-offset-2"
                      >
                        + add-ons
                      </motion.button>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pair it with popup — rendered outside the scroll container */}
      {popupTrigger && (
        <AddonPopup
          trigger={popupTrigger}
          addons={addonsByTrigger.get(popupTrigger.id) ?? []}
          selectedTreatments={selectedTreatments}
          onAdd={onAdd}
          onClose={() => setPopupTrigger(null)}
        />
      )}
    </>
  );
};

export default ServicesStep;
