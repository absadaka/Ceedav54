import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";
import { ShieldAlert } from "lucide-react";

import AdminLayout, { ROUTE_ROLES } from "@/layouts/AdminLayout";
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

function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-1">Access Denied</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        You don't have permission to view this page. Contact an admin if you need access.
      </p>
    </div>
  );
}

function RoleGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAdminAuth();
  const exactRoles = ROUTE_ROLES[path];
  const parentPath = "/" + path.split("/").filter(Boolean)[0];
  const roles = exactRoles ?? ROUTE_ROLES[parentPath];
  if (roles && user && !roles.includes(user.role as any)) {
    return <AccessDeniedPage />;
  }
  return <>{children}</>;
}

function GuardedRoute({ path, component: Comp }: { path: string; component: React.ComponentType<any> }) {
  return (
    <Route path={path}>
      {(params) => (
        <RoleGuard path={path}>
          <Comp {...params} />
        </RoleGuard>
      )}
    </Route>
  );
}

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
        <GuardedRoute path="/dashboard"   component={DashboardPage} />
        <GuardedRoute path="/tenants"     component={TenantsPage} />
        <GuardedRoute path="/tenants/:id" component={TenantDetailPage} />
        <GuardedRoute path="/billing"     component={BillingPage} />
        <GuardedRoute path="/flags"       component={FlagsPage} />
        <GuardedRoute path="/impersonate" component={ImpersonatePage} />
        <GuardedRoute path="/tickets"     component={SupportTicketsPage} />
        <GuardedRoute path="/health"      component={SystemHealthPage} />
        <GuardedRoute path="/subscriptions/plans"    component={PlansPage} />
        <GuardedRoute path="/subscriptions/coupons"  component={CouponsPage} />
        <GuardedRoute path="/subscriptions/invoices" component={InvoiceHistoryPage} />
        <GuardedRoute path="/subscriptions/failed"   component={FailedPaymentsPage} />
        <GuardedRoute path="/subscriptions/override" component={PlanOverridePage} />
        <GuardedRoute path="/subscriptions/addons"   component={AddOnsPage} />
        <GuardedRoute path="/subscriptions/revenue"  component={RevenueAnalyticsPage} />
        <GuardedRoute path="/subscriptions/churn"    component={ChurnPage} />
        <GuardedRoute path="/settings/general"       component={PlatformSettingsPage} />
        <GuardedRoute path="/settings/users"         component={AdminUsersPage} />
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
