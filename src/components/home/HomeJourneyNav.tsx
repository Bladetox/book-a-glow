import { useEffect, useState } from "react";

const ITEMS = [
  { id: "who-its-for", label: "Who it's for" },
  { id: "how-nextslot-works", label: "How it works" },
  { id: "results", label: "Results" },
  { id: "pricing-preview", label: "Pricing" },
  { id: "get-started", label: "Get started" },
];

type HomeJourneyNavProps = { enabled: boolean };

export const HomeJourneyNav = ({ enabled }: HomeJourneyNavProps) => {
  const [activeId, setActiveId] = useState(() => {
    if (typeof window === "undefined") return ITEMS[0].id;
    const hash = window.location.hash.slice(1);
    return ITEMS.some((item) => item.id === hash) ? hash : ITEMS[0].id;
  });

  useEffect(() => {
    if (!enabled) return;
    const sections = ITEMS.map(({ id }) => document.getElementById(id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.15, 0.35, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <nav className="home-journey-nav" aria-label="Explore the homepage">
      <div className="home-journey-nav__inner">
        {ITEMS.map(({ id, label }, index) => (
          <a
            key={id}
            href={`#${id}`}
            className={`home-journey-nav__link${activeId === id ? " is-active" : ""}`}
            aria-current={activeId === id ? "location" : undefined}
            onClick={(event) => {
              const target = document.getElementById(id);
              if (!target) return;
              event.preventDefault();
              setActiveId(id);
              window.history.pushState(null, "", `#${id}`);
              const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
            }}
          >
            <span className="home-journey-nav__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
};
