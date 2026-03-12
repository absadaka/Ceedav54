/**
 * Route guard stubs.
 * Replace the hardcoded booleans with real auth state checks (e.g. from a
 * `useAuth()` hook backed by the auth service) once the backend is live.
 */

import type { UserRole } from "@/lib/auth";

interface GuardProps {
  children: React.ReactNode;
}

/* ─── AuthGuard ─────────────────────────────────────────────────────────── */
/**
 * Renders children only when the user is authenticated.
 * In production: redirect to `/:tenant/login` (or `/auth`) if no session.
 */
export function AuthGuard({ children }: GuardProps) {
  // TODO: const { session, loading } = useAuth();
  // if (loading) return <FullPageSpinner />;
  // if (!session) { navigate(`/${tenantSlug}/login`); return null; }
  const isAuthenticated = true; // stub — always authenticated for UI shell

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

/* ─── GuestGuard ────────────────────────────────────────────────────────── */
/**
 * Renders children only when the user is NOT authenticated (login/register).
 * In production: redirect to `/:tenant/dashboard` if already signed in.
 */
export function GuestGuard({ children }: GuardProps) {
  // TODO: const { session, loading } = useAuth();
  // if (loading) return <FullPageSpinner />;
  // if (session) { navigate(`/${tenantSlug}/dashboard`); return null; }
  const isAuthenticated = false; // stub — always unauthenticated on auth pages

  if (isAuthenticated) return null;
  return <>{children}</>;
}

/* ─── RoleGuard ─────────────────────────────────────────────────────────── */
/**
 * Renders children only when the current user's role is in `allowed`.
 * Otherwise renders the optional `fallback`, or a generic access-denied message.
 */
interface RoleGuardProps extends GuardProps {
  allowed: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowed,
  fallback,
}: RoleGuardProps) {
  // TODO: const { user } = useAuth();
  const currentRole: UserRole = "owner"; // stub — always owner for UI shell

  if (!allowed.includes(currentRole)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">Access restricted</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          You don't have permission to view this page. Contact your workspace admin.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/* ─── TenantGuard ───────────────────────────────────────────────────────── */
/**
 * Ensures the current URL's tenant slug resolves to a valid tenant.
 * In production: fetches tenant public info, shows 404 if not found.
 */
export function TenantGuard({ children }: GuardProps) {
  // TODO: const { tenant, loading, notFound } = useTenantFromSlug();
  // if (loading) return <FullPageSpinner />;
  // if (notFound) return <NotFoundPage />;
  return <>{children}</>;
}
