import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const [activeNav, setActiveNav] = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleNavClick = (catId: string) => {
    setActiveNav(catId);
    const el = sectionRefs.current[catId];
    if (el) {
      // Offset for the sticky pill nav (approx 48px) + some breathing room
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (loadingServices || loadingCats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      {/* Category quick-jump pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleNavClick(cat.id)}
              className={`category-pill whitespace-nowrap shrink-0 transition-all duration-200 ${
                activeNav === cat.id ? "active" : ""
              }`}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {categories.map((cat) => {
          const catTreatments = treatments.filter((t) => t.category === cat.id);
          if (catTreatments.length === 0) return null;

          return (
            <div key={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }}>
              {/* Section label */}
              <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-muted-foreground/70 mb-2.5 px-0.5">
                {cat.label}
              </p>

              {/* Service cards — compact 2-line layout */}
              <div className="flex flex-col gap-2">
                {catTreatments.map((t) => {
                  const isSelected = selectedTreatments.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onToggle(t.id)}
                      className={`glass-card-service rounded-xl px-4 py-3.5 flex items-center gap-3 text-left w-full transition-all duration-150 ${
                        isSelected ? "selected" : ""
                      }`}
                    >
                      {/* Selection indicator — left side */}
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground leading-snug">{t.name}</span>
                        {t.duration > 0 && (
                          <span className="text-[10px] text-muted-foreground">{t.duration} min</span>
                        )}
                      </div>

                      {/* Price — right */}
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        R{t.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServicesStep;
