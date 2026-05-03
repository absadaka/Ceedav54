import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable, tenantSettingsTable, integrationsTable, catalogItemsTable,
  planCatalogTable,
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router = Router();

/* ─── helpers ─────────────────────────────────────────────────────────── */

async function getTenant(slug: string) {
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

async function getOrCreateSettings(tenantId: string) {
  const [existing] = await db
    .select()
    .from(tenantSettingsTable)
    .where(eq(tenantSettingsTable.tenant_id, tenantId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(tenantSettingsTable)
    .values({ tenant_id: tenantId })
    .returning();
  return created;
}

/* ─── GET /plans (public) ──────────────────────────────────────────────── */

router.get("/plans", async (_req, res) => {
  const plans = await db
    .select()
    .from(planCatalogTable)
    .where(eq(planCatalogTable.is_active, true))
    .orderBy(asc(planCatalogTable.sort_order));

  return res.json({
    plans: plans.map((p) => ({
      plan_key:       p.plan_key,
      name:           p.name,
      monthly_price:  p.monthly_price ? Number(p.monthly_price) : null,
      annual_price:   p.annual_price ? Number(p.annual_price) : null,
      description:    p.description,
      features:       p.features as string[],
      badge:          p.badge,
    })),
  });
});

/* ─── GET /settings ────────────────────────────────────────────────────── */

router.get("/settings", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const settings = await getOrCreateSettings(tenant.id);

  const integrations = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.tenant_id, tenant.id));

  const integrationMap: Record<string, object> = {};
  for (const intg of integrations) {
    const cfg = (intg.config ?? {}) as Record<string, string>;
    integrationMap[intg.type] = {
      enabled: intg.enabled,
      ...maskSecrets(cfg),
    };
  }

  return res.json({
    tenant: {
      id:          tenant.id,
      name:        tenant.name,
      slug:        tenant.slug,
      phone:       tenant.phone,
      email:       tenant.email,
      address:     tenant.address,
      country:     tenant.country,
      currency:    tenant.currency,
      timezone:    tenant.timezone,
      locale:      tenant.locale,
      logo_url:    tenant.logo_url,
      vat_number:  tenant.vat_number,
      plan:        tenant.plan,
      status:      tenant.status,
      trial_ends_at: tenant.trial_ends_at,
    },
    settings,
    integrations: integrationMap,
  });
});

/* ─── PATCH /settings/business ─────────────────────────────────────────── */

router.patch("/settings/business", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const {
    name, phone, email, address, country, currency, timezone, locale,
    logo_url, vat_number, website, maps_url,
    distance_unit, language,
    social_facebook, social_instagram, social_twitter,
    social_linkedin, social_tiktok, social_youtube,
  } = req.body;

  await db
    .update(tenantsTable)
    .set({
      ...(name       !== undefined && { name }),
      ...(phone      !== undefined && { phone }),
      ...(email      !== undefined && { email }),
      ...(address    !== undefined && { address }),
      ...(country    !== undefined && { country }),
      ...(currency   !== undefined && { currency }),
      ...(timezone   !== undefined && { timezone }),
      ...(locale     !== undefined && { locale }),
      ...(logo_url   !== undefined && { logo_url }),
      ...(vat_number !== undefined && { vat_number }),
      updated_at: new Date(),
    })
    .where(eq(tenantsTable.id, tenant.id));

  await getOrCreateSettings(tenant.id);
  await db
    .update(tenantSettingsTable)
    .set({
      ...(website          !== undefined && { website }),
      ...(maps_url         !== undefined && { maps_url }),
      ...(distance_unit    !== undefined && { distance_unit }),
      ...(language         !== undefined && { language }),
      ...(social_facebook  !== undefined && { social_facebook }),
      ...(social_instagram !== undefined && { social_instagram }),
      ...(social_twitter   !== undefined && { social_twitter }),
      ...(social_linkedin  !== undefined && { social_linkedin }),
      ...(social_tiktok    !== undefined && { social_tiktok }),
      ...(social_youtube   !== undefined && { social_youtube }),
      updated_at: new Date(),
    })
    .where(eq(tenantSettingsTable.tenant_id, tenant.id));

  return res.json({ ok: true });
});

/* ─── PATCH /settings/hours ─────────────────────────────────────────────── */

router.patch("/settings/hours", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { office_hours } = req.body;
  if (!office_hours) return res.status(400).json({ error: "office_hours required" });

  await getOrCreateSettings(tenant.id);
  await db
    .update(tenantSettingsTable)
    .set({ office_hours, updated_at: new Date() })
    .where(eq(tenantSettingsTable.tenant_id, tenant.id));

  return res.json({ ok: true });
});

/* ─── PATCH /settings/sales ─────────────────────────────────────────────── */

router.patch("/settings/sales", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const {
    default_tax_pct, invoice_notes, quote_validity_days,
    payment_terms, auto_invoice, show_cost_on_quote,
  } = req.body;

  await getOrCreateSettings(tenant.id);
  await db
    .update(tenantSettingsTable)
    .set({
      ...(default_tax_pct      !== undefined && { default_tax_pct: String(default_tax_pct) }),
      ...(invoice_notes        !== undefined && { invoice_notes }),
      ...(quote_validity_days  !== undefined && { quote_validity_days: Number(quote_validity_days) }),
      ...(payment_terms        !== undefined && { payment_terms }),
      ...(auto_invoice         !== undefined && { auto_invoice: Boolean(auto_invoice) }),
      ...(show_cost_on_quote   !== undefined && { show_cost_on_quote: Boolean(show_cost_on_quote) }),
      updated_at: new Date(),
    })
    .where(eq(tenantSettingsTable.tenant_id, tenant.id));

  return res.json({ ok: true });
});

/* ─── PATCH /settings/reporting ─────────────────────────────────────────── */

router.patch("/settings/reporting", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { fiscal_year_start } = req.body;

  await getOrCreateSettings(tenant.id);
  await db
    .update(tenantSettingsTable)
    .set({
      ...(fiscal_year_start !== undefined && { fiscal_year_start }),
      updated_at: new Date(),
    })
    .where(eq(tenantSettingsTable.tenant_id, tenant.id));

  return res.json({ ok: true });
});

/* ─── PATCH /settings/comms ─────────────────────────────────────────────── */

router.patch("/settings/comms", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { email_from_name, email_reply_to, sms_sender_id, notifications } = req.body;

  // Light validation for notifications shape
  let notifPayload: object | undefined;
  if (notifications !== undefined) {
    if (typeof notifications !== "object" || notifications === null || Array.isArray(notifications)) {
      return res.status(400).json({ error: "notifications must be an object" });
    }
    const allowedEvents = new Set(["booking_confirmation", "job_status", "invoice", "quote", "reminder"]);
    const allowedChannels = new Set(["email", "sms", "whatsapp"]);
    const cleaned: Record<string, Record<string, boolean>> = {};
    for (const [evt, chs] of Object.entries(notifications)) {
      if (!allowedEvents.has(evt) || typeof chs !== "object" || chs === null) continue;
      cleaned[evt] = {};
      for (const [ch, v] of Object.entries(chs as Record<string, unknown>)) {
        if (allowedChannels.has(ch)) cleaned[evt][ch] = Boolean(v);
      }
    }
    notifPayload = cleaned;
  }

  await getOrCreateSettings(tenant.id);
  await db
    .update(tenantSettingsTable)
    .set({
      ...(email_from_name !== undefined && { email_from_name }),
      ...(email_reply_to  !== undefined && { email_reply_to }),
      ...(sms_sender_id   !== undefined && { sms_sender_id }),
      ...(notifPayload    !== undefined && { notifications: notifPayload }),
      updated_at: new Date(),
    })
    .where(eq(tenantSettingsTable.tenant_id, tenant.id));

  return res.json({ ok: true });
});

/* ─── PATCH /settings/integrations/:type ───────────────────────────────── */

router.patch("/settings/integrations/:type", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const { type } = req.params;
  if (!["stripe", "whatsapp", "sms"].includes(type)) {
    return res.status(400).json({ error: "Invalid integration type" });
  }

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { enabled, config } = req.body;

  const [existing] = await db
    .select()
    .from(integrationsTable)
    .where(and(eq(integrationsTable.tenant_id, tenant.id), eq(integrationsTable.type, type)))
    .limit(1);

  if (existing) {
    const existingConfig = (existing.config ?? {}) as Record<string, string>;
    const mergedConfig = { ...existingConfig, ...(config ?? {}) };
    await db
      .update(integrationsTable)
      .set({
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        config: mergedConfig,
        updated_at: new Date(),
      })
      .where(and(eq(integrationsTable.tenant_id, tenant.id), eq(integrationsTable.type, type)));
  } else {
    await db.insert(integrationsTable).values({
      tenant_id: tenant.id,
      type,
      enabled: Boolean(enabled ?? false),
      config: config ?? {},
    });
  }

  return res.json({ ok: true });
});

/* ─── GET /settings/catalog ─────────────────────────────────────────────── */

router.get("/settings/catalog", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const items = await db
    .select()
    .from(catalogItemsTable)
    .where(eq(catalogItemsTable.tenant_id, tenant.id))
    .orderBy(catalogItemsTable.type, catalogItemsTable.name);

  return res.json({ items });
});

/* ─── POST /settings/catalog ─────────────────────────────────────────────── */

router.post("/settings/catalog", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { type = "labour", sku, name, description, unit = "each", unit_price = "0.00", cost_price, taxable = true } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const [item] = await db.insert(catalogItemsTable).values({
    tenant_id: tenant.id,
    type, sku, name, description, unit,
    unit_price: String(unit_price),
    cost_price: cost_price ? String(cost_price) : null,
    taxable: Boolean(taxable),
  }).returning();

  return res.status(201).json({ item });
});

/* ─── PATCH /settings/catalog/:id ────────────────────────────────────────── */

router.patch("/settings/catalog/:id", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { type, sku, name, description, unit, unit_price, cost_price, taxable, is_active } = req.body;

  const [updated] = await db
    .update(catalogItemsTable)
    .set({
      ...(type        !== undefined && { type }),
      ...(sku         !== undefined && { sku }),
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(unit        !== undefined && { unit }),
      ...(unit_price  !== undefined && { unit_price: String(unit_price) }),
      ...(cost_price  !== undefined && { cost_price: cost_price ? String(cost_price) : null }),
      ...(taxable     !== undefined && { taxable: Boolean(taxable) }),
      ...(is_active   !== undefined && { is_active: Boolean(is_active) }),
      updated_at: new Date(),
    })
    .where(and(eq(catalogItemsTable.id, req.params.id), eq(catalogItemsTable.tenant_id, tenant.id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Item not found" });
  return res.json({ item: updated });
});

/* ─── DELETE /settings/catalog/:id ──────────────────────────────────────── */

router.delete("/settings/catalog/:id", async (req, res) => {
  const slug = req.query.tenant as string;
  if (!slug) return res.status(400).json({ error: "tenant required" });

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  await db
    .delete(catalogItemsTable)
    .where(and(eq(catalogItemsTable.id, req.params.id), eq(catalogItemsTable.tenant_id, tenant.id)));

  return res.json({ ok: true });
});

/* ─── helper: mask secrets ───────────────────────────────────────────────── */

function maskSecrets(cfg: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (["secret_key", "api_key", "token", "access_token", "private_key"].some((s) => k.includes(s))) {
      out[k] = v ? `${v.slice(0, 8)}••••••••` : "";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default router;
