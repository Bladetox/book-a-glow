import { useEffect, useState } from "react";
import { ArrowUpRight, ChartNoAxesCombined, CreditCard, Users, Workflow, X } from "lucide-react";

const ITEMS = [
  { id: "who-its-for", label: "Who it\u0027s for", Icon: Users },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (enabled && window.matchMedia("(max-width: 767px)").matches) setMobileOpen(true);
  }, [enabled]);
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
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.15, 0.35, 0.6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);
  if (!enabled) return null;
  if (isMobile && !mobileOpen) return <button type="button" className="home-journey-nav__mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Open homepage section navigation"><span>Explore sections</span></button>;
  return <nav className="home-journey-nav" aria-label="Explore the homepage">
    <div className="home-journey-nav__heading"><span>Explore NextSlot</span>{isMobile && <button type="button" className="home-journey-nav__close" onClick={() => setMobileOpen(false)} aria-label="Close section navigation"><X aria-hidden="true" size={22} /></button>}</div>
    <div className="home-journey-nav__inner">{ITEMS.map(({ id, label, Icon }) => <a key={id} href={"#" + id} className={"home-journey-nav__link" + (activeId === id ? " is-active" : "")} aria-current={activeId === id ? "location" : undefined} onClick={(event) => { const target = document.getElementById(id); if (!target) return; event.preventDefault(); setActiveId(id); window.history.pushState(null, "", "#" + id); const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }}><Icon className="home-journey-nav__icon" aria-hidden="true" /><span className="home-journey-nav__label">{label}</span></a>)}</div>
  </nav>;
};
