import { useState, useEffect, useCallback } from "react";
import { MessageSquare, CalendarX, AlertTriangle, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RED = "hsl(0 84% 60%)";

const PROBLEMS = [
  {
    id: "whatsapp",
    label: "WhatsApp Chaos",
    icon: MessageSquare,
    bg: RED,
    description:
      "Clients message at all hours. You lose track of who wants what and when. Every morning starts with a backlog you have to untangle before you can even begin working.",
  },
  {
    id: "manual",
    label: "Manual Scheduling",
    icon: CalendarX,
    bg: RED,
    description:
      "Pen and paper or memory. Neither scales when business picks up. One missed note and a client shows up to an empty slot, or worse, two clients arrive at once.",
  },
  {
    id: "double",
    label: "Double Bookings",
    icon: AlertTriangle,
    bg: RED,
    description:
      "Two clients, same slot. Someone is unhappy and you look unprofessional. It happens more often than it should, and every time it costs you a relationship.",
  },
  {
    id: "data",
    label: "No Visibility",
    icon: BarChart2,
    bg: RED,
    description:
      "You have numbers but no direction. Revenue, bookings, clients all sitting there with no system to turn that data into a decision you can act on today.",
  },
];

const AUTO_PLAY_INTERVAL = 3500;
const ITEM_HEIGHT = 68;

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

export function PainPointCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = PROBLEMS.length;
  const currentIndex = ((step % total) + total) % total;

  const next = useCallback(() => setStep((s) => s + 1), []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, AUTO_PLAY_INTERVAL);
    return () => clearInterval(id);
  }, [next, isPaused]);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + total) % total;
    if (diff > 0) setStep((s) => s + diff);
    else if (diff === 0) return;
    else setStep((s) => s + diff + total);
  };

  const active = PROBLEMS[currentIndex];
  const ActiveIcon = active.icon;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        className="relative overflow-hidden rounded-[2rem] lg:rounded-[3rem] flex flex-col lg:flex-row border border-border/40"
        style={{ minHeight: 480 }}
      >
        {/* LEFT PANEL */}
        <div
          className="w-full lg:w-[40%] relative flex flex-col items-start justify-center overflow-hidden px-8 md:px-12 lg:px-10 py-12 lg:py-0"
          style={{ background: RED, minHeight: 240 }}
        >
          <div
            className="absolute inset-x-0 top-0 h-16 lg:h-20 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${RED}, transparent)` }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 lg:h-20 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${RED}, transparent)` }}
          />

          <div className="relative w-full h-full flex items-center justify-center lg:justify-start z-20" style={{ minHeight: ITEM_HEIGHT * total }}>
            {PROBLEMS.map((problem, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrapped = wrap(-(total / 2), total / 2, distance);
              const Icon = problem.icon;
              return (
                <div
                  key={problem.id}
                  style={{
                    position: "absolute",
                    height: ITEM_HEIGHT,
                    width: "fit-content",
                    transform: `translateY(${wrapped * ITEM_HEIGHT}px)`,
                    opacity: Math.max(0, 1 - Math.abs(wrapped) * 0.28),
                    transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease",
                  }}
                >
                  <button
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 rounded-full border text-left transition-all duration-500",
                      isActive
                        ? "bg-white text-foreground border-white shadow-lg"
                        : "bg-transparent text-white/60 border-white/20 hover:border-white/50 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors duration-500",
                        isActive ? "text-foreground" : "text-white/50"
                      )}
                      strokeWidth={2}
                    />
                    <span className="text-sm font-medium whitespace-nowrap tracking-tight">
                      {problem.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-background border-t lg:border-t-0 lg:border-l border-border/20 flex items-center justify-center p-8 md:p-12 lg:p-14">
          <div className="w-full max-w-sm">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: `${RED}18`, border: `1.5px solid ${RED}40` }}
            >
              <ActiveIcon className="h-6 w-6" style={{ color: RED }} strokeWidth={1.75} />
            </div>

            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-4"
              style={{ background: `${RED}12`, border: `1px solid ${RED}35`, color: RED }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
              {active.label}
            </div>

            <p key={active.id} className="text-base text-foreground/80 leading-relaxed animate-fade-in">
              {active.description}
            </p>

            <div className="flex items-center gap-2 mt-8">
              {PROBLEMS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(i)}
                  className="rounded-full transition-all duration-300"
                  style={{ width: i === currentIndex ? 24 : 8, height: 8, background: i === currentIndex ? RED : "hsl(var(--border))" }}
                  aria-label={`Go to ${PROBLEMS[i].label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PainPointCarousel;
