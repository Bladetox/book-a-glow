import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const SiteFooter = () => (
  <footer className="border-t border-border/50 bg-background">
    {/* CTA conversion strip */}
    <div className="bg-secondary/40 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-base font-semibold">Your next booking should not depend on a message.</p>
          <p className="text-sm text-muted-foreground mt-1">Cancel anytime. POPIA compliant. Built for South Africa.</p>
        </div>
        <Link
          to="/onboarding"
          className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-7 py-3.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_20px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] transition-all duration-200 whitespace-nowrap"
        >
          Create Your Booking Page
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>

    {/* Standard footer */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold">NextSlot</p>
          <p className="text-xs text-muted-foreground mt-1">Built for the people behind the chair, the studio, and the craft.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link to="/product" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Product</Link>
          <Link to="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
          <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
        </nav>
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} NextSlot. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
