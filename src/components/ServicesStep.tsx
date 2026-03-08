import { treatments, categories } from "@/data/bookingData";
import { useState, useRef } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = treatments.filter((t) => t.category === activeCategory);

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
            className={`category-pill whitespace-nowrap ${activeCategory === cat.id ? "active" : ""}`}
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
