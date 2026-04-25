import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import PublicLayout from "@/layouts/PublicLayout";
import TenantLayout from "@/layouts/TenantLayout";
import { getSession } from "@/hooks/useAuth";
import { canAccess, type ModuleKey } from "@/lib/permissions";

// Public pages
import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
import FeaturesPage from "@/pages/public/FeaturesPage";
import DocsPage from "@/pages/public/DocsPage";
import AuthPage from "@/pages/public/AuthPage";
import RegisterPage from "@/pages/public/RegisterPage";

// Tenant auth pages (/:tenant/*)
import TenantLoginPage from "@/pages/auth/TenantLoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ReAuthPage from "@/pages/auth/ReAuthPage";
import LogoutPage from "@/pages/auth/LogoutPage";

// Tenant app pages
import DashboardPage        from "@/pages/tenant/DashboardPage";
import ClientsPage          from "@/pages/tenant/ClientsPage";
import CustomerDetailPage   from "@/pages/tenant/CustomerDetailPage";
import VehicleDetailPage    from "@/pages/tenant/VehicleDetailPage";
import BookingsPage       from "@/pages/tenant/BookingsPage";
import BookingDetailPage  from "@/pages/tenant/BookingDetailPage";
import QuotationsPage     from "@/pages/tenant/QuotationsPage";
import QuotationDetailPage from "@/pages/tenant/QuotationDetailPage";
import JobsPage       from "@/pages/tenant/JobsPage";
import JobDetailPage  from "@/pages/tenant/JobDetailPage";
import InspectionsPage     from "@/pages/tenant/InspectionsPage";
import InspectionDetailPage from "@/pages/tenant/InspectionDetailPage";
import QuickRepairsPage       from "@/pages/tenant/QuickRepairsPage";
import QuickRepairDetailPage  from "@/pages/tenant/QuickRepairDetailPage";
import InvoicesPage       from "@/pages/tenant/InvoicesPage";
import InvoiceDetailPage  from "@/pages/tenant/InvoiceDetailPage";
import TeamPage from "@/pages/tenant/TeamPage";
import SettingsPage          from "@/pages/tenant/SettingsPage";
import SettingsBusinessPage  from "@/pages/tenant/settings/BusinessPage";
import SettingsHoursPage     from "@/pages/tenant/settings/HoursPage";
import SettingsServicesPage  from "@/pages/tenant/settings/ServicesPage";
import SettingsSalesPage     from "@/pages/tenant/settings/SalesPage";
import SettingsReportingPage from "@/pages/tenant/settings/ReportingPage";
import SettingsBillingPage   from "@/pages/tenant/settings/BillingPage";
import SettingsCommsPage     from "@/pages/tenant/settings/CommsPage";
import AccountSecurityPage from "@/pages/tenant/account/SecurityPage";
import AccountSessionsPage from "@/pages/tenant/account/SessionsPage";
import AccountDevicesPage from "@/pages/tenant/account/DevicesPage";

// Tenant admin pages
import AdminUsersPage from "@/pages/tenant/admin/UsersPage";

import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/* ─── Route zone detection ───────────────────────────────────────────────── */

const PUBLIC_PATHS = ["/", "/pricing", "/features", "/docs", "/auth", "/register"];

const LEGACY_APP_PREFIXES = [
  "dashboard", "customers", "clients", "vehicles", "bookings", "inspections", "quotations", "jobs",
  "quick-repairs", "invoices", "team", "settings", "account", "logout",
];

const TENANT_AUTH_ACTIONS = [
  "login", "logout", "forgot-password", "reset-password", "verify-email", "re-auth",
];

const TENANT_SLUG_PREFIXES = ["account", "admin"];

type RouteZone =
  | "public"
  | "full-screen-auth"
  | "legacy-tenant-app"
  | "tenant-auth"
  | "tenant-slug-app";

function detectZone(path: string): RouteZone {
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  if (path === "/auth" || path.startsWith("/auth/") || path === "/register") {
    return "full-screen-auth";
  }

  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return "public";
  }

  if (LEGACY_APP_PREFIXES.includes(first)) return "legacy-tenant-app";

  if (segments.length >= 2 && TENANT_AUTH_ACTIONS.includes(second)) {
    return "tenant-auth";
  }

  if (segments.length >= 2 && TENANT_SLUG_PREFIXES.includes(second)) {
    return "tenant-slug-app";
  }

  return "public";
}

/* ─── Tenant slug app router ─────────────────────────────────────────────── */

function TenantSlugApp() {
  const [location] = useLocation();
  const segments = location.split("/").filter(Boolean);
  const tenantSlug = segments[0] ?? "";
  const session = getSession();

  return (
    <TenantLayout tenantSlug={tenantSlug} tenantName={session?.tenantName} showAdmin>
      <Switch>
        <Route path="/:tenant/account/security" component={AccountSecurityPage} />
        <Route path="/:tenant/account/sessions" component={AccountSessionsPage} />
        <Route path="/:tenant/account/devices" component={AccountDevicesPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </TenantLayout>
  );
}

/* ─── Main router ─────────────────────────────────────────────────────────── */

function AppRouter() {
  const [location] = useLocation();
  const zone = detectZone(location);

  if (zone === "full-screen-auth") {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/:rest*" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
      </Switch>
    );
  }

  if (zone === "tenant-auth") {
    return (
      <Switch>
        <Route path="/:tenant/login" component={TenantLoginPage} />
        <Route path="/:tenant/logout" component={LogoutPage} />
        <Route path="/:tenant/forgot-password" component={ForgotPasswordPage} />
        <Route path="/:tenant/reset-password" component={ResetPasswordPage} />
        <Route path="/:tenant/verify-email" component={VerifyEmailPage} />
        <Route path="/:tenant/re-auth" component={ReAuthPage} />
      </Switch>
    );
  }

  if (zone === "tenant-slug-app") {
    return <TenantSlugApp />;
  }

  if (zone === "legacy-tenant-app") {
    const tenantSlug = new URLSearchParams(window.location.search).get("tenant") ?? undefined;
    const session = getSession();

    // Enforce role-based restrictions: redirect users away from pages they can't access.
    const first = location.split("/").filter(Boolean)[0] ?? "";
    const PATH_TO_MODULE: Record<string, ModuleKey> = {
      dashboard: "dashboard",
      customers: "customers",
      clients: "customers",
      vehicles: "customers",
      bookings: "bookings",
      quotations: "quotations",
      inspections: "jobs",
      jobs: "jobs",
      "quick-repairs": "jobs",
      invoices: "invoices",
      team: "team",
      settings: "settings",
    };
    const needed = PATH_TO_MODULE[first];
    if (needed && session && !canAccess(session.role, needed)) {
      return <RoleRedirect tenantSlug={tenantSlug} role={session.role} />;
    }

    return (
      <TenantLayout tenantSlug={tenantSlug} tenantName={session?.tenantName} tenantLogoUrl={session?.tenantLogoUrl}>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          {/* Customers — canonical; /clients kept for backward compat */}
          <Route path="/customers/:id" component={CustomerDetailPage} />
          <Route path="/customers"     component={ClientsPage} />
          <Route path="/clients"       component={ClientsPage} />
          {/* Vehicles */}
          <Route path="/vehicles/:id"  component={VehicleDetailPage} />
          <Route path="/bookings/:id" component={BookingDetailPage} />
          <Route path="/bookings"    component={BookingsPage} />
          <Route path="/quotations/:id" component={QuotationDetailPage} />
          <Route path="/quotations"     component={QuotationsPage} />
          <Route path="/inspections/:id" component={InspectionDetailPage} />
          <Route path="/inspections"     component={InspectionsPage} />
          <Route path="/jobs/:id">{() => <JobDetailPage />}</Route>
          <Route path="/jobs"    component={JobsPage} />
          <Route path="/quick-repairs/:id">{() => <QuickRepairDetailPage />}</Route>
          <Route path="/quick-repairs" component={QuickRepairsPage} />
          <Route path="/invoices/:id" component={InvoiceDetailPage} />
          <Route path="/invoices"    component={InvoicesPage} />
          {/* Team — top-level section */}
          <Route path="/team" component={TeamPage} />
          {/* Settings hub + sub-pages */}
          <Route path="/settings"              component={SettingsPage} />
          <Route path="/settings/business"     component={SettingsBusinessPage} />
          <Route path="/settings/hours"        component={SettingsHoursPage} />
          <Route path="/settings/services"     component={SettingsServicesPage} />
          <Route path="/settings/team"         component={AdminUsersPage} />
          <Route path="/settings/sales"        component={SettingsSalesPage} />
          <Route path="/settings/reporting"    component={SettingsReportingPage} />
          <Route path="/settings/billing"      component={SettingsBillingPage} />
          <Route path="/settings/comms"        component={SettingsCommsPage} />
          {/* Logout */}
          <Route path="/logout" component={LogoutPage} />
          {/* Account sub-pages */}
          <Route path="/account/security" component={AccountSecurityPage} />
          <Route path="/account/sessions" component={AccountSessionsPage} />
          <Route path="/account/devices" component={AccountDevicesPage} />
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
        <Route path="/features" component={FeaturesPage} />
        <Route path="/docs" component={DocsPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </PublicLayout>
  );
}

/** Redirect a user to their role's default landing page. */
function RoleRedirect({ tenantSlug, role }: { tenantSlug?: string; role?: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const q = tenantSlug ? `?tenant=${tenantSlug}` : "";
    // Technicians land on Jobs; everyone else on Dashboard.
    const target = role === "technician" ? `/jobs${q}` : `/dashboard${q}`;
    setLocation(target, { replace: true });
  }, [tenantSlug, role, setLocation]);
  return null;
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
