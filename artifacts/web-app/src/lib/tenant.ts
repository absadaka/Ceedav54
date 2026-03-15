import type { AuthMethod } from "./auth";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface TenantInfo {
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  allowedAuthMethods: AuthMethod[];
  ssoProviderName?: string;
  ssoEnabled: boolean;
  country?: string;
  currency?: string;
  timezone?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   getTenantSlug()
   Reads the current tenant slug from the URL query param (?tenant=<slug>)
   or from the path prefix (/:slug/…) as a fallback.
   Safe to call anywhere — no hooks needed.
────────────────────────────────────────────────────────────────────────── */
export function getTenantSlug(): string {
  if (typeof window === "undefined") return "demo-workshop";
  // 1. Explicit URL param (admin embeds, dev overrides)
  const fromQuery = new URLSearchParams(window.location.search).get("tenant");
  if (fromQuery) return fromQuery;
  // 2. Active session in localStorage
  try {
    const raw = localStorage.getItem("ceeda_session");
    if (raw) {
      const s = JSON.parse(raw) as { tenantSlug?: string };
      if (s.tenantSlug) return s.tenantSlug;
    }
  } catch {
    // ignore parse errors
  }
  return "demo-workshop";
}

/* ─── Resolver ──────────────────────────────────────────────────────────── */

/**
 * Resolves tenant public info by slug.
 * Calls GET /api/tenants/:slug/public — works for all tenants in the DB.
 * Falls back to a generated placeholder if the API is unreachable.
 */
export async function resolveTenant(slug: string): Promise<TenantInfo | null> {
  if (!slug) return null;

  try {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/public`);
    if (res.ok) {
      const data = await res.json();
      return {
        slug:               data.slug,
        name:               data.name,
        logoUrl:            data.logoUrl,
        country:            data.country,
        currency:           data.currency,
        timezone:           data.timezone,
        allowedAuthMethods: data.allowedAuthMethods ?? ["password", "google", "magic_link"],
        ssoEnabled:         data.ssoEnabled ?? false,
        ssoProviderName:    data.ssoProviderName,
      };
    }
  } catch {
    // Network error — fall through to placeholder
  }

  // Placeholder for unknown slugs (offline / dev fallback)
  const name = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    slug,
    name,
    allowedAuthMethods: ["password", "google", "magic_link"],
    ssoEnabled: false,
  };
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/** Returns 1-2 uppercase initials from a tenant name */
export function tenantInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Extracts the tenant slug from a path like "/:tenant/..."
 * e.g. "/demo-workshop/login" → "demo-workshop"
 */
export function slugFromPath(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "";
}

/** Builds the tenant-scoped base URL path */
export function tenantBase(slug: string): string {
  return `/${slug}`;
}
