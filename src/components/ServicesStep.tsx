import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ServicesStepProps {
  selectedTreatments: string[];
  onToggle: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onToggle }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Select your treatments
      </h3>

      {/* Category quick-nav pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => scrollToSection(cat.id)}
              className="category-pill whitespace-nowrap shrink-0"
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* All categories as sections */}
      <div className="flex flex-col gap-6">
        {categories.map((cat) => {
          const catTreatments = treatments.filter((t) => t.category === cat.id);
          if (catTreatments.length === 0) return null;

          return (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
                  {cat.label}
                </h4>
                <div className="flex-1 h-px bg-border/30" />
              </div>

              {/* Services in this section */}
              <div className="flex flex-col gap-2.5">
                {catTreatments.map((t, i) => {
                  const isSelected = selectedTreatments.includes(t.id);
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onToggle(t.id)}
                      className={`glass-card-service rounded-xl p-4 flex items-center gap-3 text-left ${isSelected ? "selected" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h5 className="font-display text-base font-semibold text-foreground">{t.name}</h5>
                          <span className="font-body text-sm font-bold text-foreground shrink-0">R{t.price}</span>
                        </div>
                        {(t.description || t.duration) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[t.description, t.duration ? `${t.duration} min` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
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
        })}
      </div>
    </div>
  );
};

export default ServicesStep;
