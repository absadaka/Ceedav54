import { Request, Response, NextFunction } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
  locale: string;
}

export interface UserContext {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
  isActive: boolean;
  avatarUrl?: string;
}

export interface AuthRequest extends Request {
  tenant?: TenantContext;
  user?: UserContext;
}

/**
 * Public API paths that do NOT require tenant membership.
 * Paths are relative to the /api mount point.
 */
function isPublicPath(path: string): boolean {
  // Exact matches
  if (path === "/healthz") return true;
  if (path === "/plans") return true;
  if (path === "/stripe/webhook") return true;
  if (path === "/payment-success") return true;
  if (path === "/advance-success") return true;

  // Prefix matches
  if (path.startsWith("/auth/")) return true;
  if (path.startsWith("/onboarding")) return true;
  if (path.startsWith("/tenants/")) return true;

  return false;
}

/**
 * Core middleware: validates tenant parameter and user membership.
 *
 * 1. Checks if tenant slug is present (query param for GET/DELETE, body for POST/PUT/PATCH)
 * 2. Validates the user is authenticated via x-user-id header
 * 3. Verifies the tenant exists and is not suspended
 * 4. Verifies the user is a member of that tenant
 * 5. Attaches tenant and user context to the request for downstream handlers
 */
export async function requireTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract tenant slug from query param (GET/DELETE) or body (POST/PUT/PATCH)
    const tenantSlug =
      (req.query["tenant"] as string | undefined) ||
      (req.body?.tenant as string | undefined);

    if (!tenantSlug || typeof tenantSlug !== "string") {
      res.status(400).json({
        error: "Missing tenant parameter. Add ?tenant=<slug> to your request.",
      });
      return;
    }

    // 2. Extract user ID from x-user-id header and validate UUID format
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) {
      res.status(401).json({
        error: "Not authenticated. Include x-user-id header.",
      });
      return;
    }
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(userId)) {
      res.status(401).json({
        error: "Invalid user identifier.",
      });
      return;
    }

    // 3. Resolve tenant by slug
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, tenantSlug))
      .limit(1);

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found." });
      return;
    }
    if (tenant.status === "suspended") {
      res.status(403).json({
        error: "This workshop account has been suspended.",
      });
      return;
    }

    // 4. Verify user belongs to tenant
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, userId),
          eq(usersTable.tenant_id, tenant.id),
          isNull(usersTable.deleted_at)
        )
      )
      .limit(1);

    if (!user) {
      res.status(403).json({
        error: "You are not authorized to access this workshop.",
      });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({
        error: "Your account has been deactivated. Contact your administrator.",
      });
      return;
    }

    // 5. Attach to request for downstream handlers
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      currency: tenant.currency,
      timezone: tenant.timezone,
      locale: tenant.locale,
    };
    req.user = {
      id: user.id,
      tenantId: user.tenant_id as string,
      role: user.role,
      email: user.email,
      name: user.name,
      isActive: user.is_active,
      avatarUrl: user.avatar_url ?? undefined,
    };

    next();
  } catch (err) {
    console.error("[requireTenant] error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Wrapper that skips tenant validation for public endpoints.
 */
export function tenantMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Promise<void> {
  if (isPublicPath(req.path)) {
    return next();
  }
  return requireTenant(req, res, next);
}
