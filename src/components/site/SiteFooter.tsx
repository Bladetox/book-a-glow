import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="border-t border-border/50 bg-background">
    {/* Standard footer */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Logo + wordmark */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/web-app-manifest-192x192.png"
            alt="NextSlot logo"
            className="h-8 w-8 object-contain rounded-lg opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="text-center md:text-left">
            <p className="text-sm font-bold tracking-tight leading-none">
              Next<span className="text-accent">Slot</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Built for the people behind the chair, the studio, and the craft.
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link to="/product"  className="text-xs text-muted-foreground hover:text-foreground transition-colors">Product</Link>
          <Link to="/pricing"  className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/about"    className="text-xs text-muted-foreground hover:text-foreground transition-colors">About</Link>
          <Link to="/blog"     className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          <Link to="/privacy"  className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms"    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
        </nav>

        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} NextSlot. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
