import { Router } from "express";
import { scrypt, timingSafeEqual } from "crypto";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [salt, hash] = stored.split(":");
      if (!salt || !hash) return resolve(false);
      scrypt(password, salt, 64, (err, derived) => {
        if (err) return resolve(false);
        try {
          resolve(timingSafeEqual(Buffer.from(hash, "hex"), derived));
        } catch {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password, tenantSlug? }
   Returns: { user, tenant }
───────────────────────────────────────────────────────────────────────── */
router.post("/auth/login", async (req, res) => {
  const { email, password, tenantSlug } = req.body as {
    email?: string;
    password?: string;
    tenantSlug?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const row = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      email:         usersTable.email,
      role:          usersTable.role,
      is_active:     usersTable.is_active,
      password_hash: usersTable.password_hash,
      avatar_url:    usersTable.avatar_url,
      tenant_id:     tenantsTable.id,
      tenant_slug:   tenantsTable.slug,
      tenant_name:   tenantsTable.name,
      tenant_currency: tenantsTable.currency,
      tenant_timezone: tenantsTable.timezone,
      tenant_logo:   tenantsTable.logo_url,
      tenant_status: tenantsTable.status,
    })
    .from(usersTable)
    .leftJoin(
      tenantsTable,
      and(eq(tenantsTable.id, usersTable.tenant_id), isNull(tenantsTable.deleted_at)),
    )
    .where(
      and(
        eq(usersTable.email, email.toLowerCase().trim()),
        isNull(usersTable.deleted_at),
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row || !row.password_hash) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  if (!row.is_active) {
    return res.status(403).json({ error: "Your account has been deactivated. Contact your administrator." });
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const tenant = row.tenant_id
    ? {
        id:       row.tenant_id,
        slug:     row.tenant_slug!,
        name:     row.tenant_name!,
        currency: row.tenant_currency!,
        timezone: row.tenant_timezone,
        logo_url: row.tenant_logo,
        status:   row.tenant_status!,
      }
    : null;

  if (tenantSlug && tenant && tenant.slug !== tenantSlug) {
    return res.status(403).json({ error: "This account does not belong to this workshop." });
  }

  if (tenant?.status === "suspended") {
    return res.status(403).json({ error: "This workshop account has been suspended." });
  }

  const user = row;

  return res.json({
    user: {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      avatarUrl: user.avatar_url,
      tenantId:  user.tenant_id,
    },
    tenant: tenant
      ? {
          id:       tenant.id,
          slug:     tenant.slug,
          name:     tenant.name,
          currency: tenant.currency,
          timezone: tenant.timezone,
          logoUrl:  tenant.logo_url,
        }
      : null,
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/auth/me  — read session from X-Session header (localStorage token)
───────────────────────────────────────────────────────────────────────── */
router.get("/auth/me", async (req, res) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const user = await db
    .select({
      id:        usersTable.id,
      name:      usersTable.name,
      email:     usersTable.email,
      role:      usersTable.role,
      is_active: usersTable.is_active,
      tenant_id: usersTable.tenant_id,
      avatar_url: usersTable.avatar_url,
    })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), isNull(usersTable.deleted_at)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!user || !user.is_active) return res.status(401).json({ error: "Session expired." });

  return res.json({ user });
});

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/tenants/:slug/public  — unauthenticated tenant info for login page
───────────────────────────────────────────────────────────────────────── */
router.get("/tenants/:slug/public", async (req, res) => {
  const { slug } = req.params;
  const tenant = await db
    .select({
      id:       tenantsTable.id,
      slug:     tenantsTable.slug,
      name:     tenantsTable.name,
      currency: tenantsTable.currency,
      country:  tenantsTable.country,
      timezone: tenantsTable.timezone,
      logo_url: tenantsTable.logo_url,
      status:   tenantsTable.status,
    })
    .from(tenantsTable)
    .where(and(eq(tenantsTable.slug, slug), isNull(tenantsTable.deleted_at)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!tenant) return res.status(404).json({ error: "Workshop not found." });

  return res.json({
    slug:               tenant.slug,
    name:               tenant.name,
    currency:           tenant.currency,
    country:            tenant.country,
    timezone:           tenant.timezone,
    logoUrl:            tenant.logo_url,
    allowedAuthMethods: ["password", "google", "magic_link"],
    ssoEnabled:         false,
  });
});

export default router;
