import { usePublicServices, usePublicCategories } from "@/hooks/usePublicServices";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StepHeading from "@/components/booking/StepHeading";
import { formatDuration, formatPrice } from "@/lib/bookingFormat";

interface ServicesStepProps {
  selectedTreatments: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

const ServicesStep = ({ selectedTreatments, onAdd, onRemove }: ServicesStepProps) => {
  const { data: treatments = [], isLoading: loadingServices } = usePublicServices();
  const { data: categories = [], isLoading: loadingCats } = usePublicCategories();
  const config = usePublicBusinessConfig();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (activeCategory === null && categories.length > 0) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Keep the active category tab in view when the row is wider than the screen.
  useEffect(() => {
    if (!activeCategory) return;
    tabRefs.current[activeCategory]?.scrollIntoView?.({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeCategory]);

  const heading = (
    <StepHeading
      title={config.servicesStepHeading}
      description="Add everything you'd like in this visit."
    />
  );

  if (loadingServices || loadingCats) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-4" role="status" aria-label="Loading services">
        {heading}
        <div className="flex gap-2">
          {[88, 120, 96].map((width) => (
            <div key={width} className="bk-skeleton h-10 rounded-full" style={{ width }} />
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bk-card px-4 py-4">
              <div className="flex justify-between gap-6">
                <div className="bk-skeleton h-4 w-1/2" />
                <div className="bk-skeleton h-4 w-12" />
              </div>
              <div className="bk-skeleton mt-3 h-3 w-4/5" />
              <div className="bk-skeleton mt-4 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeCat = activeCategory ?? (categories[0]?.id ?? null);

  // All active services in the selected category — is_addon does not affect visibility
  const visibleTreatments = activeCat
    ? treatments.filter((t) => t.category === activeCat)
    : [];

  const quantityFor = (id: string) =>
    selectedTreatments.filter((selectedId) => selectedId === id).length;

  const selectedInCategory = (categoryId: string) =>
    selectedTreatments.filter(
      (selectedId) => treatments.find((t) => t.id === selectedId)?.category === categoryId,
    ).length;

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      {heading}

      {/* Category tabs */}
      {categories.length > 1 && (
        <div
          role="tablist"
          aria-label="Service categories"
          className="bk-fade-right -mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pr-8 scrollbar-hide"
        >
          {categories.map((cat) => {
            const isActive = activeCat === cat.id;
            const count = selectedInCategory(cat.id);
            return (
              <motion.button
                key={cat.id}
                ref={(node) => {
                  tabRefs.current[cat.id] = node;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`bk-chip ${isActive ? "is-active" : ""}`}
              >
                {cat.label}
                {count > 0 && (
                  <span className="bk-chip__count" aria-label={`${count} selected`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Services for the active category */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeCat ?? "empty"}
            role="tabpanel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="bk-fade-bottom -mx-1 h-full min-h-0 overflow-y-auto overscroll-contain scrollbar-hide flex flex-col gap-2.5 px-1 pt-0.5 pb-8"
          >
            {visibleTreatments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {categories.length === 0
                  ? "There are no services to book online right now."
                  : "No services in this category."}
              </p>
            ) : (
              visibleTreatments.map((t) => {
                const qty = quantityFor(t.id);
                const isSelected = qty > 0;
                return (
                  <article
                    key={t.id}
                    // Tapping anywhere on an unselected card adds it; once it is in
                    // the booking the quantity controls take over.
                    onClick={isSelected ? undefined : () => onAdd(t.id)}
                    className={`bk-card bk-card--interactive shrink-0 px-4 py-3.5 ${
                      isSelected ? "is-selected" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                        {t.name}
                      </h3>
                      <span className="bk-num shrink-0 text-[15px] font-semibold leading-snug text-foreground">
                        {formatPrice(config.currency, t.price)}
                      </span>
                    </div>

                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
                        {t.duration > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDuration(t.duration)}
                          </span>
                        )}
                        {t.isAddon && (
                          <span className="bk-well rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Add-on
                          </span>
                        )}
                      </div>

                      {isSelected ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.88 }}
                            onClick={() => onRemove(t.id)}
                            className="bk-icon-btn bk-icon-btn--outline bk-icon-btn--sm"
                            aria-label={`Remove one ${t.name}`}
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </motion.button>
                          <span
                            aria-live="polite"
                            aria-label={`${qty} ${t.name} selected`}
                            className="bk-num w-7 text-center text-[15px] font-semibold text-foreground"
                          >
                            {qty}
                          </span>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.88 }}
                            onClick={() => onAdd(t.id)}
                            className="bk-icon-btn bk-icon-btn--solid bk-icon-btn--sm"
                            aria-label={`Add one ${t.name}`}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAdd(t.id);
                          }}
                          className="bk-btn bk-btn--quiet bk-btn--sm shrink-0"
                          aria-label={`Add one ${t.name}`}
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                          Add
                        </motion.button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ServicesStep;
