import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/web-app-manifest-192x192.png" alt="NextSlot logo" className="h-8 w-8 object-contain rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="text-center md:text-left">
            <p className="site-wordmark text-sm font-bold tracking-tight leading-none">
              <span className="site-footer__wordmark-next">Next</span><span className="site-footer__wordmark-slot">Slot</span>
            </p>
            <p className="site-footer__description">
              Online booking and business management software for independent service businesses.
            </p>
          </div>
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <div className="site-footer__nav">
            {[
              { to: "/online-booking-software", label: "Online booking" },
              { to: "/business-management-software", label: "Business management" },
              { to: "/client-management", label: "Client management" },
              { to: "/business-analytics", label: "Business analytics" },
              { to: "/business-growth", label: "Business growth" },
              { to: "/pricing", label: "Pricing" },
              { to: "/resources", label: "Resources" },
              { to: "/about", label: "About" },
              { to: "/privacy", label: "Privacy" },
              { to: "/terms", label: "Terms" },
            ].map(({ to, label }) => (
              <Link key={to} to={to} className="site-footer__link">{label}</Link>
            ))}
          </div>
        </nav>
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} NextSlot. Proudly made in South Africa.
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
