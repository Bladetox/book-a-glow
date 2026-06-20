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

const Index            = lazy(() => import("./pages/Index"));
const About            = lazy(() => import("./pages/About"));
const Resources        = lazy(() => import("./pages/Resources"));
const Book             = lazy(() => import("./pages/Book"));
const Pricing          = lazy(() => import("./pages/Pricing"));
const Login            = lazy(() => import("./pages/Login"));
const Onboarding       = lazy(() => import("./pages/Onboarding"));
const Signup           = lazy(() => import("./pages/Signup"));
const Privacy          = lazy(() => import("./pages/Privacy"));
const SiteTerms        = lazy(() => import("./pages/SiteTerms"));
const Admin            = lazy(() => import("./pages/Admin"));
const SuperAdmin       = lazy(() => import("./pages/SuperAdmin"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const TenantNotFound   = lazy(() => import("./pages/TenantNotFound"));
const PaymentSuccess   = lazy(() => import("./pages/PaymentSuccess"));
const Demo             = lazy(() => import("./pages/Demo"));
const PayshapProof     = lazy(() => import("./pages/PayshapProof"));
const PayshapSubmitted = lazy(() => import("./pages/PayshapSubmitted"));

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
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<SiteTerms />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/payment" element={<PublicTenantProvider><PaymentSuccess /></PublicTenantProvider>} />
        <Route path="/payment-success" element={<PublicTenantProvider><PaymentSuccess /></PublicTenantProvider>} />
        <Route path="/book" element={<PublicTenantProvider><Book /></PublicTenantProvider>} />
        <Route path="/pay/:bookingId" element={<PayshapProof />} />
        <Route path="/payshap-submitted" element={<PublicTenantProvider><PayshapSubmitted /></PublicTenantProvider>} />
        {/* Legacy redirects */}
        <Route path="/product" element={<Navigate to="/" replace />} />
        <Route path="/blog" element={<Navigate to="/resources" replace />} />
        <Route path="/case-study/phenomebeauty" element={<Navigate to="/about" replace />} />
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
          <Route path="/pay/:bookingId" element={<PayshapProof />} />
          <Route path="/payshap-submitted" element={<PayshapSubmitted />} />
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
