import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import NotFoundPage from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRouter() {
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
        <Route component={NotFoundPage} />
      </Switch>
    </AdminLayout>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/auth" component={LoginPage} />
      <Route>{() => <ProtectedRouter />}</Route>
    </Switch>
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
