import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Select treatments
        </h3>
        {selectedTreatments.length > 0 && (
          <span className="text-[10px] font-semibold text-primary">
            {selectedTreatments.length} selected
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
              const isSelected = selectedTreatments.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t.id)}
                  className={`glass-card-service rounded-xl px-4 py-3.5 flex items-center gap-3 text-left w-full transition-all duration-150 ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  {/* Selection indicator */}
                  <div
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                    )}
                  </div>

                  {/* Name + description + duration */}
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground leading-snug">
                      {t.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground truncate leading-snug mt-0.5">
                      {t.description
                        ? `${t.description}${t.duration > 0 ? ` · ${t.duration} min` : ""}`
                        : t.duration > 0
                        ? `${t.duration} min`
                        : ""}
                    </span>
                  </div>

                  {/* Price */}
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    R{t.price}
                  </span>
                </button>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ServicesStep;
