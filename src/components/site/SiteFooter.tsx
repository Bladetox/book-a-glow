import { Link } from "react-router-dom";
import logo from "@/assets/nextslot-logo.png";

const SiteFooter = () => (
  <footer className="border-t border-border mt-24 bg-secondary/30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between gap-8">
        <div className="max-w-xs">
          <img src={logo} alt="NextSlot" className="h-12 w-auto mb-2 mix-blend-multiply dark:mix-blend-screen" />
          <p className="text-sm text-muted-foreground">Booking infrastructure for modern service businesses.</p>
        </div>
        <div className="flex gap-16">
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/product#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>© 2026 NextSlot. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
