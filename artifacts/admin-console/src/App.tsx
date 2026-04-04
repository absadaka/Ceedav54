import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";

import AdminLayout from "@/layouts/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import BillingPage from "@/pages/BillingPage";
import FlagsPage from "@/pages/FlagsPage";
import ImpersonatePage from "@/pages/ImpersonatePage";
import SystemHealthPage from "@/pages/SystemHealthPage";
import SupportTicketsPage from "@/pages/SupportTicketsPage";
import PlansPage from "@/pages/subscriptions/PlansPage";
import CouponsPage from "@/pages/subscriptions/CouponsPage";
import InvoiceHistoryPage from "@/pages/subscriptions/InvoiceHistoryPage";
import FailedPaymentsPage from "@/pages/subscriptions/FailedPaymentsPage";
import PlanOverridePage from "@/pages/subscriptions/PlanOverridePage";
import AddOnsPage from "@/pages/subscriptions/AddOnsPage";
import RevenueAnalyticsPage from "@/pages/subscriptions/RevenueAnalyticsPage";
import ChurnPage from "@/pages/subscriptions/ChurnPage";
import PlatformSettingsPage from "@/pages/settings/PlatformSettingsPage";
import AdminUsersPage from "@/pages/settings/AdminUsersPage";
import NotFoundPage from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRouter() {
  const { user, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/"            component={DashboardPage} />
        <Route path="/dashboard"   component={DashboardPage} />
        <Route path="/tenants"     component={TenantsPage} />
        <Route path="/tenants/:id" component={TenantDetailPage} />
        <Route path="/billing"     component={BillingPage} />
        <Route path="/flags"       component={FlagsPage} />
        <Route path="/impersonate" component={ImpersonatePage} />
        <Route path="/tickets"     component={SupportTicketsPage} />
        <Route path="/health"      component={SystemHealthPage} />
        <Route path="/subscriptions/plans"    component={PlansPage} />
        <Route path="/subscriptions/coupons"  component={CouponsPage} />
        <Route path="/subscriptions/invoices" component={InvoiceHistoryPage} />
        <Route path="/subscriptions/failed"   component={FailedPaymentsPage} />
        <Route path="/subscriptions/override" component={PlanOverridePage} />
        <Route path="/subscriptions/addons"   component={AddOnsPage} />
        <Route path="/subscriptions/revenue"  component={RevenueAnalyticsPage} />
        <Route path="/subscriptions/churn"    component={ChurnPage} />
        <Route path="/settings/general"       component={PlatformSettingsPage} />
        <Route path="/settings/users"         component={AdminUsersPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AdminLayout>
  );
}

function AuthRouter() {
  const { user, loading } = useAdminAuth();

  if (loading) return null;
  if (user) return <Redirect to="/" />;
  return <LoginPage />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={AuthRouter} />
      <Route>{() => <ProtectedRouter />}</Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminAuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster position="bottom-right" richColors />
        </AdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
