import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { BusinessThemeProvider } from "./contexts/BusinessThemeProvider";
import { PublicTenantProvider, usePublicTenant } from "./contexts/PublicTenantContext";
import { getTenantSlug, isCustomDomainHost } from "./lib/tenant-resolver";
import { supabase } from "./integrations/supabase/client";
import { PwaUpdater } from "@/components/PwaUpdater";
import { usePageSEO } from "@/hooks/usePageSEO";

const Index            = lazy(() => import("./pages/Index"));
const About            = lazy(() => import("./pages/About"));
const Resources        = lazy(() => import("./pages/Resources"));
const Book             = lazy(() => import("./pages/Book"));
const Pricing          = lazy(() => import("./pages/Pricing"));
const Login            = lazy(() => import("./pages/Login"));
const Onboarding       = lazy(() => import("./pages/Onboarding"));
const Privacy          = lazy(() => import("./pages/Privacy"));
const SiteTerms        = lazy(() => import("./pages/SiteTerms"));
const Admin            = lazy(() => import("./pages/Admin"));
const SuperAdmin       = lazy(() => import("./pages/SuperAdmin"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const TenantNotFound   = lazy(() => import("./pages/TenantNotFound"));
const PaymentSuccess   = lazy(() => import("./pages/PaymentSuccess"));
const BillingSuccess   = lazy(() => import("./pages/BillingSuccess"));
const Demo             = lazy(() => import("./pages/Demo"));
const CaseStudy         = lazy(() => import("./pages/CaseStudy"));
const OnlineBookingSoftware = lazy(() => import("./pages/OnlineBookingSoftware"));
const BusinessManagementSoftware = lazy(() => import("./pages/BusinessManagementSoftware"));
const BookingSoftwareSouthAfrica = lazy(() => import("./pages/BookingSoftwareSouthAfrica"));
const ClientManagement = lazy(() => import("./pages/ClientManagement"));
const BusinessAnalytics = lazy(() => import("./pages/BusinessAnalytics"));
const MobileServiceBusinesses = lazy(() => import("./pages/MobileServiceBusinesses"));
const Payments = lazy(() => import("./pages/Payments"));
const BusinessGrowth = lazy(() => import("./pages/BusinessGrowth"));

const queryClient = new QueryClient();

/**
 * Suspense fallback shells.
 *
 * Background is transparent so the browser-painted background from
 * index.html's inline script shows through during the JS bundle load.
 * Previously these were #000 which caused a visible black flash before
 * BusinessThemeProvider could apply the correct tenant theme colour.
 */
const MarketingShell = () => (
  <div style={{ minHeight: "100dvh", background: "transparent" }} />
);

const TenantShell = () => (
  <div style={{ position: "fixed", inset: 0, background: "transparent" }} />
);

const SEO = ({ path }: { path: string }) => { usePageSEO(path); return null; };

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
};

const AuthRecoveryHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") navigate("/reset-password");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
};

/* =================================================================
   MARKETING ROUTES
   Rendered directly into #root with NO overflow/height constraints.
   html, body, and #root are all at browser defaults (height: auto,
   overflow: visible) so pages scroll naturally -- no JS class toggling.
================================================================= */
const MarketingRoutes = () => (
  <>
    <AuthRecoveryHandler />
    <Suspense fallback={<MarketingShell />}>
      <Routes>
        <Route path="/" element={<><SEO path="/" /><Index /></>} />
        <Route path="/about" element={<><SEO path="/about" /><About /></>} />
        <Route path="/resources" element={<><SEO path="/resources" /><Resources /></>} />
        <Route path="/pricing" element={<><SEO path="/pricing" /><Pricing /></>} />
        <Route path="/login" element={<><SEO path="/login" /><Login /></>} />
        <Route path="/onboarding" element={<><SEO path="/onboarding" /><Onboarding /></>} />
        <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
        <Route path="/privacy" element={<><SEO path="/privacy" /><Privacy /></>} />
        <Route path="/terms" element={<><SEO path="/terms" /><SiteTerms /></>} />
        <Route path="/online-booking-software" element={<OnlineBookingSoftware />} />
        <Route path="/business-management-software" element={<BusinessManagementSoftware />} />
        <Route path="/booking-software-south-africa" element={<BookingSoftwareSouthAfrica />} />
        <Route path="/client-management" element={<ClientManagement />} />
        <Route path="/business-analytics" element={<BusinessAnalytics />} />
        <Route path="/mobile-service-businesses" element={<MobileServiceBusinesses />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/business-growth" element={<BusinessGrowth />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />
        <Route path="/superadmin" element={<><SEO path="/superadmin" /><SuperAdmin /></>} />
        <Route path="/demo" element={<><SEO path="/demo" /><Demo /></>} />\n        <Route path="/case-study/phenomebeauty" element={<><SEO path="/case-study/phenomebeauty" /><CaseStudy /></>} />
        <Route path="/reset-password" element={<><SEO path="/reset-password" /><ResetPassword /></>} />
        <Route path="/payment" element={<><SEO path="/payment" /><PublicTenantProvider><PaymentSuccess /></PublicTenantProvider></>} />
        <Route path="/payment-success" element={<><SEO path="/payment-success" /><PublicTenantProvider><PaymentSuccess /></PublicTenantProvider></>} />
        {/* Platform billing return URL - iKhokha redirects here after checkout */}
        <Route path="/billing-success" element={<><SEO path="/billing-success" /><BillingSuccess /></>} />
        <Route path="/book" element={<><SEO path="/book" /><PublicTenantProvider><Book /></PublicTenantProvider></>} />
        {/* Legacy redirects */}
        <Route path="/product" element={<Navigate to="/" replace />} />
        <Route path="/blog" element={<Navigate to="/resources" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </>
);

/* =================================================================
   TENANT ROUTES
   Wrapped in .app-shell which applies position:fixed + overflow:hidden,
   locking the viewport for the native-app-like booking/admin shell.
================================================================= */
const TenantRoutes = () => {
  const { notFound } = usePublicTenant();
  if (notFound) return (
    <Suspense fallback={<TenantShell />}>
      <TenantNotFound hostname={window.location.hostname} />
    </Suspense>
  );
  return (
    <div className="app-shell">
      <Suspense fallback={<TenantShell />}>
        <Routes>
          <Route path="/" element={<Book />} />
          <Route path="/book" element={<Book />} />
          <Route path="/payment" element={<PaymentSuccess />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  const tenantSlug   = getTenantSlug();
  const customDomain = isCustomDomainHost();
  const isSubdomain  = !!tenantSlug || !!customDomain;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <PwaUpdater />
            {isSubdomain ? (
              <PublicTenantProvider>
                <TenantRoutes />
              </PublicTenantProvider>
            ) : (
              <MarketingRoutes />
            )}
          </BrowserRouter>
        </BusinessThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
