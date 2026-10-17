import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";

const navLinks = [
  { to: "/demo", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/case-study/phenomebeauty", label: "Case Study" },
  { to: "/pricing", label: "Pricing" },
  { to: "/resources", label: "Resources" },
];

type SiteHeaderProps = { journeyMode?: boolean };

const SiteHeader = ({ journeyMode = false }: SiteHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isMenuOpen || !journeyMode) return;
    const menu = mobileMenuRef.current;
    const trigger = menuButtonRef.current;
    const closeButton = menuCloseButtonRef.current;
    const header = menu?.closest<HTMLElement>(".site-header");
    const headerRow = headerRowRef.current;
    const site = header?.closest<HTMLElement>(".marketing-site");
    if (!menu || !trigger || !closeButton || !header || !headerRow) return;

    const scrollY = window.scrollY;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    // Keep the visible page underneath the translucent menu, but remove it from interaction
    // and the accessibility tree while the modal is open.
    const inertTargets: HTMLElement[] = [headerRow];
    if (site) {
      for (const child of Array.from(site.children)) {
        if (child !== header && child instanceof HTMLElement) inertTargets.push(child);
      }
    }
    const previousInert = new Map<HTMLElement, boolean>();
    inertTargets.forEach((element) => {
      previousInert.set(element, element.inert);
      element.inert = true;
    });

    const focusable = () => Array.from(menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getAttribute("aria-hidden") !== "true");
    const focusFrame = window.requestAnimationFrame(() => closeButton.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      previousInert.forEach((wasInert, element) => {
        if (element.isConnected) element.inert = wasInert;
      });
      Object.assign(document.body.style, previousBodyStyles);
      window.scrollTo(0, scrollY);
      if (trigger.isConnected) trigger.focus();
    };
  }, [isMenuOpen, journeyMode]);
  const isActive = (to: string) => { const path = to.split("#")[0]; return pathname === path || pathname.startsWith(path + "/"); };

  return (
    <header className={`site-header${isMenuOpen && journeyMode ? " is-mobile-menu-open" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRowRef} className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="NextSlot">
            <img src="/web-app-manifest-192x192.png" alt="NextSlot logo" className="h-9 w-9 object-contain rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <span className="site-header__wordmark site-wordmark text-base font-bold tracking-tight leading-none"><span className="site-header__wordmark-next">Next</span><span className="site-header__wordmark-slot">Slot</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map(({ to, label }) => {
              const active = isActive(to);
              return <Link key={to} to={to} className={`site-header__nav-link relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200${active ? " is-active" : ""}`}>{label}{active && <span className="site-header__active-dot absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" />}</Link>;
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="site-header__login text-sm font-medium px-3 py-2 rounded-lg">Login</Link>
            <PrimaryCTA to="/onboarding">Start for free</PrimaryCTA>
          </div>

          <button ref={menuButtonRef} type="button" className={`site-header__menu-button md:hidden p-2 rounded-lg${isMenuOpen && journeyMode ? " is-menu-trigger-hidden" : ""}`} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen && !journeyMode ? "Close menu" : "Open menu"} aria-expanded={isMenuOpen} aria-controls="nextslot-mobile-menu" aria-hidden={isMenuOpen && journeyMode ? true : undefined} tabIndex={isMenuOpen && journeyMode ? -1 : 0}>{isMenuOpen && !journeyMode ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>

        {isMenuOpen && (
          <div ref={mobileMenuRef} id="nextslot-mobile-menu" role={journeyMode ? "dialog" : undefined} aria-modal={journeyMode ? true : undefined} aria-label="Site navigation" className="site-header__mobile-menu md:hidden py-4 animate-fade-in" onClick={(event) => { if (event.target === event.currentTarget) setIsMenuOpen(false); }}>
            {journeyMode && <button ref={menuCloseButtonRef} type="button" className="site-header__menu-button site-header__menu-button--close" onClick={() => setIsMenuOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>}
            <nav className="flex flex-col gap-1 mb-4" aria-label="Mobile navigation">
              {navLinks.map(({ to, label }) => <Link key={to} to={to} className="site-header__mobile-link px-3 py-2.5 rounded-lg text-sm font-medium" onClick={() => setIsMenuOpen(false)}>{label}</Link>)}
              <Link to="/login" className="site-header__mobile-link px-3 py-2.5 rounded-lg text-sm font-medium" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </nav>
            <div className="px-3"><div onClick={() => setIsMenuOpen(false)}><PrimaryCTA to="/onboarding">Start for free</PrimaryCTA></div></div>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
