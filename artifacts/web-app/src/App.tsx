import { Switch, Route, Router as WouterRouter, useLocation, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import PublicLayout from "@/layouts/PublicLayout";
import TenantLayout from "@/layouts/TenantLayout";

// Public pages
import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
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
import AccountDevicesPage from "@/pages/tenant/account/DevicesPage";

// Tenant admin pages
import AdminUsersPage from "@/pages/tenant/admin/UsersPage";
import AdminSsoPage from "@/pages/tenant/admin/SsoPage";
import AdminAuditPage from "@/pages/tenant/admin/AuditPage";
import AdminApiKeysPage from "@/pages/tenant/admin/ApiKeysPage";

import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/* ─── Route zone detection ───────────────────────────────────────────────── */

const PUBLIC_PATHS = ["/", "/pricing", "/auth", "/register"];
const LEGACY_APP_PREFIXES = [
  "dashboard", "clients", "bookings", "quotations", "jobs",
  "invoices", "settings", "account",
];
const TENANT_AUTH_ACTIONS = [
  "login", "logout", "forgot-password", "reset-password", "verify-email", "re-auth",
];
const TENANT_SLUG_PREFIXES = ["account", "admin"];

type RouteZone =
  | "public"
  | "full-screen-auth"
  | "legacy-tenant-app"
  | "tenant-auth"        // /:tenant/(login|logout|etc.)
  | "tenant-slug-app";   // /:tenant/account/* or /:tenant/admin/*

function detectZone(path: string): RouteZone {
  const segments = path.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  // Global auth (full-screen, no layout)
  if (path === "/auth" || path.startsWith("/auth/") || path === "/register") {
    return "full-screen-auth";
  }

  // Public paths
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return "public";
  }

  // Legacy tenant app paths (no slug prefix)
  if (LEGACY_APP_PREFIXES.includes(first)) return "legacy-tenant-app";

  // /:tenant/(login|logout|forgot-password|etc.)
  if (segments.length >= 2 && TENANT_AUTH_ACTIONS.includes(second)) {
    return "tenant-auth";
  }

  // /:tenant/account/* or /:tenant/admin/*
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

  return (
    <TenantLayout tenantSlug={tenantSlug} tenantName={undefined} showAdmin>
      <Switch>
        <Route path="/:tenant/account/security" component={AccountSecurityPage} />
        <Route path="/:tenant/account/sessions" component={AccountSessionsPage} />
        <Route path="/:tenant/account/devices" component={AccountDevicesPage} />
        <Route path="/:tenant/admin/users" component={AdminUsersPage} />
        <Route path="/:tenant/admin/sso" component={AdminSsoPage} />
        <Route path="/:tenant/admin/audit" component={AdminAuditPage} />
        <Route path="/:tenant/admin/api-keys" component={AdminApiKeysPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </TenantLayout>
  );
}

/* ─── Main router ─────────────────────────────────────────────────────────── */

function AppRouter() {
  const [location] = useLocation();
  const zone = detectZone(location);

  // Global full-screen auth (no nav/layout)
  if (zone === "full-screen-auth") {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/:rest*" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
      </Switch>
    );
  }

  // Tenant-scoped auth pages (/:tenant/login etc.)
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

  // Tenant slug app pages (/:tenant/account/* etc.)
  if (zone === "tenant-slug-app") {
    return <TenantSlugApp />;
  }

  // Legacy tenant app (paths without slug)
  if (zone === "legacy-tenant-app") {
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
          <Route path="/account/devices" component={AccountDevicesPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </TenantLayout>
    );
  }

  // Public
  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/pricing" component={PricingPage} />
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
