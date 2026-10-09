import { useState } from "react";
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

const SiteHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (to: string) => { const path = to.split("#")[0]; return pathname === path || pathname.startsWith(path + "/"); };

  return (
    <header className="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="NextSlot home">
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

          <button className="site-header__menu-button md:hidden p-2 rounded-lg" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? "Close menu" : "Open menu"}>{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>

        {isMenuOpen && (
          <div className="site-header__mobile-menu md:hidden py-4 animate-fade-in">
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
