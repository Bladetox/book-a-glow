import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/demo",    label: "Demo" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about",   label: "About" },
];

const SiteHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-lg"
      style={{
        background: "hsl(var(--background) / 0.92)",
        borderBottom: "1px solid hsl(var(--accent) / 0.12)",
        boxShadow: "0 1px 0 0 hsl(var(--accent) / 0.06), 0 4px 16px -4px hsl(var(--background) / 0.8)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot logo"
              className="h-9 w-9 object-contain rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base font-bold tracking-tight leading-none">
              <span style={{ color: "hsl(var(--foreground))" }}>Next</span><span style={{ color: "hsl(var(--accent))" }}>Slot</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    color: active
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                    background: active ? "hsl(var(--accent) / 0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: "hsl(var(--accent))" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200"
              style={{ color: "hsl(var(--muted-foreground))" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              Login
            </Link>

            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center text-sm font-semibold px-5 py-2.5 rounded-[10px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                boxShadow: "0 0 0 1px hsl(var(--accent) / 0.35), 0 4px 14px -2px hsl(var(--accent) / 0.30)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 1px hsl(var(--accent) / 0.55), 0 6px 20px -2px hsl(var(--accent) / 0.40)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 1px hsl(var(--accent) / 0.35), 0 4px 14px -2px hsl(var(--accent) / 0.30)";
              }}
            >
              Try Free for 30 Days
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors duration-200"
            style={{ color: "hsl(var(--muted-foreground))" }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.08)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {isMenuOpen && (
          <div
            className="md:hidden py-4 animate-fade-in"
            style={{ borderTop: "1px solid hsl(var(--accent) / 0.12)" }}
          >
            <nav className="flex flex-col gap-1 mb-4">
              {navLinks.map(({ to, label }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                    style={{
                      color: active
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--muted-foreground))",
                      background: active ? "hsl(var(--accent) / 0.08)" : "transparent",
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {label}
                    {active && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "hsl(var(--accent))" }}
                      />
                    )}
                  </Link>
                );
              })}
              <Link
                to="/login"
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ color: "hsl(var(--muted-foreground))" }}
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            </nav>
            <Link
              to="/onboarding"
              className="flex items-center justify-center text-sm font-semibold px-5 py-3 rounded-[10px] transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                boxShadow: "0 0 0 1px hsl(var(--accent) / 0.35), 0 4px 14px -2px hsl(var(--accent) / 0.28)",
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              Try Free for 30 Days
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
