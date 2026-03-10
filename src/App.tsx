import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { BusinessThemeProvider } from "./contexts/BusinessThemeProvider";
import { PublicTenantProvider, usePublicTenant } from "./contexts/PublicTenantContext";
import { getTenantSlug, isCustomDomainHost } from "./lib/tenant-resolver";
import { supabase } from "./integrations/supabase/client";
import Index from "./pages/Index";
import Book from "./pages/Book";
import Product from "./pages/Product";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import Privacy from "./pages/Privacy";
import SiteTerms from "./pages/SiteTerms";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TenantNotFound from "./pages/TenantNotFound";
import DepositSuccessPage from "./pages/DepositSuccessPage";
import FinalPaymentSuccessPage from "./pages/FinalPaymentSuccessPage";

const queryClient = new QueryClient();

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
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/product" element={<Product />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<SiteTerms />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/book" element={<PublicTenantProvider><Book /></PublicTenantProvider>} />
      {/* Success pages — need tenant context for copy */}
      <Route path="/booking/success" element={<PublicTenantProvider><SuccessPageRouter /></PublicTenantProvider>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

/** Route to correct success page based on ?type= param */
const SuccessPageRouter = () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") ?? "deposit";
  if (type === "final") return <FinalPaymentSuccessPage />;
  return <DepositSuccessPage />;
};

const TenantRoutes = () => {
  const { notFound } = usePublicTenant();

  if (notFound) return <TenantNotFound hostname={window.location.hostname} />;

  return (
    <Routes>
      <Route path="/" element={<Book />} />
      <Route path="/book" element={<Book />} />
      <Route path="/booking/success" element={<SuccessPageRouter />} />
      <Route path="/:tenant/book" element={<Book />} />
      <Route path="/:tenant/booking/success" element={<SuccessPageRouter />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
