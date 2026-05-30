import { getSession } from "@/hooks/useAuth";

export const API = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Wrapper around fetch that:
 * 1. Automatically attaches the x-user-id header from session
 * 2. Injects the tenant slug into query params if not already present
 * 3. Adds the base URL prefix for relative API paths
 *
 * Usage: fetchWithAuth("/api/jobs?tenant=abc", { method: "POST", body: ... })
 */
export async function fetchWithAuth(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init?.headers);

  if (session?.userId) {
    headers.set("x-user-id", session.userId);
  }

  // Build the URL string
  let url: string;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input.url;
  }

  // If it's a relative API path, prepend the base URL
  if (url.startsWith("/api/")) {
    url = `${API}${url}`;
  }

  // Ensure tenant slug is present in query params for API calls
  if (url.startsWith(`${API}/api/`) && !url.includes("/api/auth/") && !url.includes("/api/onboarding") && !url.includes("/api/tenants/") && !url.includes("/api/plans") && !url.includes("/api/healthz") && !url.includes("/api/stripe/")) {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has("tenant")) {
      const tenantSlug = session?.tenantSlug || urlObj.searchParams.get("tenant");
      if (tenantSlug) {
        urlObj.searchParams.set("tenant", tenantSlug);
        url = urlObj.toString();
      }
    }
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * Convenience: builds the full URL for tenant-scoped API endpoints.
 */
export function apiUrl(
  endpoint: string,
  tenantSlug?: string,
  query?: Record<string, string>
): string {
  const url = new URL(`${API}${endpoint}`);
  if (tenantSlug) {
    url.searchParams.set("tenant", tenantSlug);
  }
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  return url.toString();
}
