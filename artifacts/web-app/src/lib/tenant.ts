import type { AuthMethod } from "./auth";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface TenantInfo {
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  allowedAuthMethods: AuthMethod[];
  ssoProviderName?: string; // e.g. "Microsoft Entra ID", "Okta"
  ssoEnabled: boolean;
  country?: string;
  currency?: string;
  timezone?: string;
}

/* ─── Mock data ─────────────────────────────────────────────────────────── */

const MOCK_TENANTS: Record<string, TenantInfo> = {
  "demo-workshop": {
    slug: "demo-workshop",
    name: "Demo Workshop",
    allowedAuthMethods: ["password", "google", "magic_link", "passkey", "phone_otp"],
    ssoEnabled: false,
    country: "AE",
    currency: "AED",
    timezone: "Asia/Dubai",
  },
  "al-harbi-auto": {
    slug: "al-harbi-auto",
    name: "Al-Harbi Auto Centre",
    allowedAuthMethods: ["password", "google", "magic_link", "sso"],
    ssoEnabled: true,
    ssoProviderName: "Microsoft Entra ID",
    country: "SA",
    currency: "SAR",
    timezone: "Asia/Riyadh",
  },
  "fastfix-dubai": {
    slug: "fastfix-dubai",
    name: "FastFix Dubai",
    allowedAuthMethods: ["password", "google", "phone_otp"],
    ssoEnabled: false,
    country: "AE",
    currency: "AED",
    timezone: "Asia/Dubai",
  },
};

/* ─── Resolver ──────────────────────────────────────────────────────────── */

/**
 * Resolves tenant public info by slug.
 * In production: GET /api/tenants/:slug/public (unauthenticated endpoint).
 */
export async function resolveTenant(slug: string): Promise<TenantInfo | null> {
  // Simulate network latency
  await new Promise<void>((r) => setTimeout(r, 80));

  if (!slug) return null;

  if (MOCK_TENANTS[slug]) return MOCK_TENANTS[slug];

  // Fallback: generate info from slug for any unknown tenant
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
