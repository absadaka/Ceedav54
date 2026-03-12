import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import PublicLayout from "@/layouts/PublicLayout";
import TenantLayout from "@/layouts/TenantLayout";

import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
import AuthPage from "@/pages/public/AuthPage";
import DashboardPage from "@/pages/tenant/DashboardPage";
import ClientsPage from "@/pages/tenant/ClientsPage";
import BookingsPage from "@/pages/tenant/BookingsPage";
import QuotationsPage from "@/pages/tenant/QuotationsPage";
import JobsPage from "@/pages/tenant/JobsPage";
import InvoicesPage from "@/pages/tenant/InvoicesPage";
import SettingsTeamPage from "@/pages/tenant/settings/TeamPage";
import SettingsShopPage from "@/pages/tenant/settings/ShopPage";
import AccountSecurityPage from "@/pages/tenant/account/SecurityPage";
import AccountSessionsPage from "@/pages/tenant/account/SessionsPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const TENANT_PATHS = [
  "/dashboard",
  "/clients",
  "/bookings",
  "/quotations",
  "/jobs",
  "/invoices",
  "/settings",
  "/account",
];

function isTenantPath(path: string) {
  return TENANT_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

function AppRouter() {
  const [location] = useLocation();

  if (isTenantPath(location)) {
    return (
      <TenantLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/bookings" component={BookingsPage} />
          <Route path="/quotations" component={QuotationsPage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/invoices" component={InvoicesPage} />
          <Route path="/settings/team" component={SettingsTeamPage} />
          <Route path="/settings/shop" component={SettingsShopPage} />
          <Route path="/account/security" component={AccountSecurityPage} />
          <Route path="/account/sessions" component={AccountSessionsPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </TenantLayout>
    );
  }

  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/invite" component={AuthPage} />
        <Route path="/auth/reset-password" component={AuthPage} />
        <Route path="/auth/verify-email" component={AuthPage} />
        <Route path="/auth/magic" component={AuthPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </PublicLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
