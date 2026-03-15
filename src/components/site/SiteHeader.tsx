import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const SiteHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + Wordmark */}
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/web-app-manifest-192x192.png"
              alt="NextSlot logo"
              className="h-9 w-9 object-contain rounded-lg shrink-0"
            />
            <span className="text-base font-bold tracking-tight leading-none">
              Next<span className="text-accent">Slot</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/product" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Product</Link>
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Live Demo</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Login</Link>
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity"
            >
              Create Your Booking Page
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/product" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>Product</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
              <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
              <Link to="/demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>Live Demo</Link>
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>Login</Link>
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity"
                onClick={() => setIsMenuOpen(false)}
              >
                Create Your Booking Page
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
