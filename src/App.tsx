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

/* ─── Route-level lazy imports ───────────────────────────────────
   Each page becomes its own async chunk — only downloaded when
   the user actually navigates to that route.
──────────────────────────────────────────────────────────────── */
const Index         = lazy(() => import("./pages/Index"));
const About         = lazy(() => import("./pages/About"));
const Book          = lazy(() => import("./pages/Book"));
const Product       = lazy(() => import("./pages/Product"));
const Pricing       = lazy(() => import("./pages/Pricing"));
const Blog          = lazy(() => import("./pages/Blog"));
const Login         = lazy(() => import("./pages/Login"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const Signup        = lazy(() => import("./pages/Signup"));
const Privacy       = lazy(() => import("./pages/Privacy"));
const SiteTerms     = lazy(() => import("./pages/SiteTerms"));
const Admin         = lazy(() => import("./pages/Admin"));
const SuperAdmin    = lazy(() => import("./pages/SuperAdmin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound      = lazy(() => import("./pages/NotFound"));
const TenantNotFound = lazy(() => import("./pages/TenantNotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Demo          = lazy(() => import("./pages/Demo"));

const queryClient = new QueryClient();

/* Minimal fallback — no layout shift, no spinner flash */
const PageShell = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
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

const MarketingRoutes = () => (
  <>
    <AuthRecoveryHandler />
    <Suspense fallback={<PageShell />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/product" element={<Product />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/blog" element={<Blog />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </>
);

const TenantRoutes = () => {
  const { notFound } = usePublicTenant();
  if (notFound) return (
    <Suspense fallback={<PageShell />}>
      <TenantNotFound hostname={window.location.hostname} />
    </Suspense>
  );
  return (
    <Suspense fallback={<PageShell />}>
      <Routes>
        <Route path="/" element={<Book />} />
        <Route path="/book" element={<Book />} />
        <Route path="/payment" element={<PaymentSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  const tenantSlug = getTenantSlug();
  const customDomain = isCustomDomainHost();
  const isSubdomain = !!tenantSlug || !!customDomain;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BusinessThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
