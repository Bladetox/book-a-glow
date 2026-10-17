import { useEffect, useState } from "react";
import { ArrowUpRight, ChartNoAxesCombined, CreditCard, Users, Workflow } from "lucide-react";

const ITEMS = [
  { id: "who-its-for", label: "Who it's for", Icon: Users },
  { id: "how-nextslot-works", label: "How it works", Icon: Workflow },
  { id: "results", label: "Results", Icon: ChartNoAxesCombined },
  { id: "pricing-preview", label: "Pricing", Icon: CreditCard },
  { id: "get-started", label: "Get started", Icon: ArrowUpRight },
];
type HomeJourneyNavProps = { enabled: boolean };

export const HomeJourneyNav = ({ enabled }: HomeJourneyNavProps) => {
  const [activeId, setActiveId] = useState(() => {
    if (typeof window === "undefined") return ITEMS[0].id;
    const hash = window.location.hash.slice(1);
    return ITEMS.some((item) => item.id === hash) ? hash : ITEMS[0].id;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [hasChosenDestination, setHasChosenDestination] = useState(() =>
    typeof window !== "undefined" && ITEMS.some((item) => item.id === window.location.hash.slice(1))
  );

  useEffect(() => {
    const reopenSelector = () => setHasChosenDestination(false);
    window.addEventListener("nextslot:journey-start", reopenSelector);
    return () => window.removeEventListener("nextslot:journey-start", reopenSelector);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sections = ITEMS.map(({ id }) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: "-16% 0px -64% 0px", threshold: [0, 0.15, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    const syncFromHash = () => {
      const id = window.location.hash.slice(1);
      if (!ITEMS.some((item) => item.id === id)) return;
      setActiveId(id); setHasChosenDestination(true);
    };
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => { window.removeEventListener("hashchange", syncFromHash); window.removeEventListener("popstate", syncFromHash); };
  }, []);

  if (!enabled) return null;
  const introOverlay = isMobile && !hasChosenDestination;
  return <nav className={`home-journey-nav${introOverlay ? " is-intro-overlay" : " is-rail"}`} aria-label="Explore the homepage">
    {introOverlay && <div className="home-journey-nav__heading">Explore NextSlot</div>}
    <div className="home-journey-nav__inner">
      {ITEMS.map(({ id, label, Icon }) => <a key={id} href={`#${id}`}
        className={`home-journey-nav__link${activeId === id ? " is-active" : ""}`}
        aria-current={activeId === id ? "location" : undefined}
        onClick={(event) => {
          const target = document.getElementById(id);
          if (!target) return;
          event.preventDefault(); setActiveId(id); setHasChosenDestination(true);
          window.history.pushState(null, "", `#${id}`);
          window.dispatchEvent(new CustomEvent("nextslot:journey-destination-selected"));
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => target.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth", block: "start",
          })));
        }}>
        <Icon className="home-journey-nav__icon" aria-hidden="true" focusable="false" />
        <span className="home-journey-nav__label">{label}</span>
      </a>)}
    </div>
  </nav>;
};
