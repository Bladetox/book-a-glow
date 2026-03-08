import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useState, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const [activeCategory, setActiveCategory] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set first category once loaded
  const effectiveCat = activeCategory || categories[0]?.id || "";
  const filtered = treatments.filter((t) => t.category === effectiveCat);

  if (loadingServices || loadingCats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Select your treatments
      </h3>

      {/* Category pills */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.93 }}
            className={`category-pill whitespace-nowrap ${effectiveCat === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </motion.button>
        ))}
      </div>

      {/* Treatment list */}
      <div className="flex flex-col gap-3">
        {filtered.map((t, i) => {
          const isSelected = selectedTreatments.includes(t.id);
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onToggle(t.id)}
              className={`glass-card-service rounded-xl p-4 flex items-center gap-3 text-left ${isSelected ? "selected" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-display text-base font-semibold text-foreground">{t.name}</h4>
                  <span className="font-body text-sm font-bold text-foreground shrink-0">R{t.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.description} · {t.duration} min
                </p>
              </div>
              <motion.div
                animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`selection-circle ${isSelected ? "checked" : ""}`}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ServicesStep;
