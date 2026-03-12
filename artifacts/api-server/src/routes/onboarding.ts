import { Router } from "express";
import { scryptSync, randomBytes } from "crypto";
import { db, tenantsTable, usersTable, catalogItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────── */

export type ShopType =
  | "auto_mechanical"
  | "body_fixing"
  | "tires"
  | "electrical_battery"
  | "auto_care";

interface ServiceItem {
  name: string;
  type: "labour" | "part" | "consumable" | "package";
  unit_price: string;
  duration_min: number;
  sku?: string;
  description?: string;
}

interface OnboardingPayload {
  owner: {
    name: string;
    email: string;
    password: string;
  };
  shop: {
    name: string;
    type: ShopType;
    phone?: string;
    address?: string;
    country: string;
    workers?: number;
    technicians?: number;
  };
  locale: {
    currency: string;
    timezone: string;
    locale: string;
  };
  services: ServiceItem[];
  plan: "starter" | "professional" | "enterprise";
  logo_base64?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "workshop";
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    attempt++;
    if (attempt > 99) return `${slug}-${Date.now()}`;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/onboarding
───────────────────────────────────────────────────────────────────────── */

router.post("/onboarding", async (req, res) => {
  const body = req.body as OnboardingPayload;

  /* ── Validate required fields ──────────────────────────────────────── */
  const { owner, shop, locale, services, plan } = body;

  if (!owner?.name || !owner?.email || !owner?.password) {
    return res.status(400).json({ error: "owner.name, owner.email, and owner.password are required" });
  }
  if (!shop?.name || !shop?.type) {
    return res.status(400).json({ error: "shop.name and shop.type are required" });
  }
  if (owner.password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  /* ── Check email not already taken ────────────────────────────────── */
  const existingUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, owner.email.toLowerCase().trim()))
    .limit(1);

  if (existingUser.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  /* ── Generate unique slug ──────────────────────────────────────────── */
  const slug = await uniqueSlug(shop.name);

  /* ── Create tenant ─────────────────────────────────────────────────── */
  const [tenant] = await db
    .insert(tenantsTable)
    .values({
      slug,
      name: shop.name,
      plan: plan ?? "professional",
      status: "trial",
      timezone: locale?.timezone ?? "Asia/Dubai",
      currency: locale?.currency ?? "AED",
      locale: locale?.locale ?? "en",
      country: shop.country ?? "AE",
      phone: shop.phone,
      email: owner.email.toLowerCase().trim(),
      address: shop.address,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning();

  /* ── Create owner user ─────────────────────────────────────────────── */
  const passwordHash = hashPassword(owner.password);

  const [user] = await db
    .insert(usersTable)
    .values({
      tenant_id: tenant.id,
      email: owner.email.toLowerCase().trim(),
      name: owner.name.trim(),
      role: "owner",
      password_hash: passwordHash,
      is_active: true,
      email_verified: false,
    })
    .returning();

  /* ── Seed service catalog ──────────────────────────────────────────── */
  if (services && services.length > 0) {
    const catalogValues = services.map((svc, i) => ({
      tenant_id: tenant.id,
      type: svc.type ?? ("labour" as const),
      sku: svc.sku ?? `SVC-${String(i + 1).padStart(3, "0")}`,
      name: svc.name,
      description: svc.description,
      unit: "each",
      unit_price: svc.unit_price,
      taxable: true,
      is_active: true,
      created_by: user.id,
    }));

    await db.insert(catalogItemsTable).values(catalogValues);
  }

  return res.status(201).json({
    success: true,
    slug: tenant.slug,
    tenantId: tenant.id,
    userId: user.id,
    redirectTo: `/dashboard`,
  });
});

export default router;
