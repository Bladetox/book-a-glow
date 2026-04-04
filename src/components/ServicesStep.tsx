import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useState } from "react";
import { Loader2, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onAdd, onRemove }: ServicesStepProps) => {
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

  /** How many times this id appears in the current selection */
  const qty = (id: string) => selectedTreatments.filter((t) => t === id).length;

  const totalSelected = selectedTreatments.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Select treatments
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
              const count = qty(t.id);
              const isSelected = count > 0;
              return (
                <div
                  key={t.id}
                  className={`glass-card-service rounded-xl px-4 py-3.5 flex items-center gap-3 w-full transition-all duration-150 ${
                    isSelected ? "selected" : ""
                  }`}
                >
                  {/* Name + description + duration */}
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

                  {/* Price */}
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    R{t.price}
                  </span>

                  {/* Quantity counter */}
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
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ServicesStep;
