import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/demo", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/resources", label: "Resources" },
  { to: "/about#case-study", label: "Results" },
];

const SiteHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (to: string) => { const path = to.split("#")[0]; return pathname === path || pathname.startsWith(path + "/"); };

  return (
    <header className="fixed top-0 z-50 w-full backdrop-blur-lg" style={{ background: "rgba(0,0,0,.92)", borderBottom: "1px solid hsl(var(--accent) / .12)", boxShadow: "0 1px 0 0 hsl(var(--accent) / .06), 0 4px 16px -4px rgba(0,0,0,.8)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="NextSlot home">
            <img src="/web-app-manifest-192x192.png" alt="NextSlot logo" className="h-9 w-9 object-contain rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight leading-none"><span style={{ color: "hsl(var(--foreground))" }}>Next</span><span style={{ color: "hsl(var(--accent))" }}>Slot</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map(({ to, label }) => {
              const active = isActive(to);
              return <Link key={to} to={to} className="relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200" style={{ color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", background: active ? "hsl(var(--accent) / .08)" : "transparent" }}>{label}{active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "hsl(var(--accent))" }} />}</Link>;
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium px-3 py-2 rounded-lg" style={{ color: "hsl(var(--muted-foreground))" }}>Login</Link>
            <Link to="/onboarding" className="inline-flex items-center justify-center text-sm font-semibold px-5 py-2.5 rounded-[10px]" style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", boxShadow: "0 0 0 1px hsl(var(--accent) / .35), 0 4px 14px -2px hsl(var(--accent) / .30)" }}>Try NextSlot free</Link>
          </div>

          <button className="md:hidden p-2 rounded-lg" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? "Close menu" : "Open menu"}>{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 animate-fade-in" style={{ borderTop: "1px solid hsl(var(--accent) / .12)", background: "#000" }}>
            <nav className="flex flex-col gap-1 mb-4" aria-label="Mobile navigation">
              {navLinks.map(({ to, label }) => <Link key={to} to={to} className="px-3 py-2.5 rounded-lg text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => setIsMenuOpen(false)}>{label}</Link>)}
              <Link to="/login" className="px-3 py-2.5 rounded-lg text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => setIsMenuOpen(false)}>Login</Link>
            </nav>
            <div className="px-3"><Link to="/onboarding" className="flex items-center justify-center text-sm font-semibold px-5 py-3 rounded-[10px] w-full" style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }} onClick={() => setIsMenuOpen(false)}>Try NextSlot free</Link></div>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
