import { treatments, categories, type Treatment } from "@/data/bookingData";
import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = treatments.filter((t) => t.category === activeCategory);
  const totalPrice = treatments
    .filter((t) => selectedTreatments.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Select your treatments
      </h3>

      {/* Category pills */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-pill whitespace-nowrap ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Treatment list */}
      <div className="flex flex-col gap-3">
        {filtered.map((t) => {
          const isSelected = selectedTreatments.includes(t.id);
          return (
            <button
              key={t.id}
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
              <div className={`selection-circle ${isSelected ? "checked" : ""}`}>
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection summary bar */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Your Selection
        </span>
        <span className="font-display text-lg font-bold text-foreground">
          R{totalPrice}
        </span>
      </div>
    </div>
  );
};

export default ServicesStep;
