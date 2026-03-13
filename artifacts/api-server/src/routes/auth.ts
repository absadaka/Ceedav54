import { Router } from "express";
import { scryptSync, timingSafeEqual } from "crypto";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const attempt = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch {
    return false;
  }
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

  const user = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      email:         usersTable.email,
      role:          usersTable.role,
      is_active:     usersTable.is_active,
      password_hash: usersTable.password_hash,
      tenant_id:     usersTable.tenant_id,
      avatar_url:    usersTable.avatar_url,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.email, email.toLowerCase().trim()),
        isNull(usersTable.deleted_at),
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: "Your account has been deactivated. Contact your administrator." });
  }

  const valid = verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  let tenant = null;
  if (user.tenant_id) {
    tenant = await db
      .select({
        id:       tenantsTable.id,
        slug:     tenantsTable.slug,
        name:     tenantsTable.name,
        currency: tenantsTable.currency,
        timezone: tenantsTable.timezone,
        logo_url: tenantsTable.logo_url,
        status:   tenantsTable.status,
      })
      .from(tenantsTable)
      .where(
        and(
          eq(tenantsTable.id, user.tenant_id),
          isNull(tenantsTable.deleted_at),
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  if (tenantSlug && tenant && tenant.slug !== tenantSlug) {
    return res.status(403).json({ error: "This account does not belong to this workshop." });
  }

  if (tenant?.status === "suspended") {
    return res.status(403).json({ error: "This workshop account has been suspended." });
  }

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
