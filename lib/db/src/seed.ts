/**
 * CEEDA — Database seed script
 *
 * Populates:
 *   - Feature flags
 *   - Permissions (resource × action matrix)
 *   - Role → permission mappings
 *   - Demo tenant + owner user
 *   - Demo workshop data (clients, vehicles, bookings, jobs, invoices)
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @workspace/db run seed
 */

import { scryptSync, randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import {
  tenantsTable, usersTable, permissionsTable, rolePermissionsTable,
  featureFlagsTable, clientsTable, vehiclesTable, bookingsTable,
  quotationsTable, quoteLineItemsTable, jobsTable, jobStatusHistoryTable,
  invoicesTable, invoiceLineItemsTable, paymentsTable, catalogItemsTable,
} from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

/* ─────────────────────────────────────────────────────────────────────────
   PERMISSIONS MATRIX
───────────────────────────────────────────────────────────────────────── */

const RESOURCES_ACTIONS: { resource: string; actions: string[]; description?: string }[] = [
  {
    resource: "bookings",
    actions: ["create", "read", "update", "delete", "confirm", "cancel"],
  },
  {
    resource: "clients",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "vehicles",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "quotations",
    actions: ["create", "read", "update", "delete", "send", "approve", "reject"],
  },
  {
    resource: "jobs",
    actions: ["create", "read", "update", "delete", "assign", "complete", "qc"],
  },
  {
    resource: "invoices",
    actions: ["create", "read", "update", "delete", "send", "void"],
  },
  {
    resource: "payments",
    actions: ["create", "read", "delete"],
  },
  {
    resource: "catalog",
    actions: ["create", "read", "update", "delete"],
  },
  {
    resource: "team",
    actions: ["invite", "read", "update", "suspend", "remove"],
  },
  {
    resource: "settings",
    actions: ["read", "update"],
  },
  {
    resource: "audit_logs",
    actions: ["read"],
  },
  {
    resource: "api_keys",
    actions: ["create", "read", "revoke"],
  },
  {
    resource: "sso",
    actions: ["read", "update"],
  },
  {
    resource: "platform_tenants",
    actions: ["create", "read", "update", "suspend", "impersonate"],
  },
  {
    resource: "platform_billing",
    actions: ["read", "update"],
  },
  {
    resource: "platform_flags",
    actions: ["read", "update"],
  },
  {
    resource: "platform_users",
    actions: ["read", "update", "suspend"],
  },
];

/* Role → resources they can access */
const ROLE_RESOURCE_MAP: Record<schema.User["role"], string[]> = {
  owner: [
    "bookings", "clients", "vehicles", "quotations", "jobs",
    "invoices", "payments", "catalog", "team", "settings",
    "audit_logs", "api_keys", "sso",
  ],
  admin: [
    "bookings", "clients", "vehicles", "quotations", "jobs",
    "invoices", "payments", "catalog", "team", "settings",
    "audit_logs", "api_keys",
  ],
  service_advisor: [
    "bookings", "clients", "vehicles", "quotations", "jobs",
    "invoices", "payments",
  ],
  technician: ["jobs", "clients", "vehicles"],
  cashier: ["invoices", "payments", "clients"],
  parts_manager: ["catalog", "clients", "vehicles"],
  receptionist: ["bookings", "clients", "vehicles"],
  platform_admin: [
    "platform_tenants", "platform_billing", "platform_flags",
    "platform_users", "audit_logs",
  ],
  platform_support: ["platform_tenants", "platform_users", "audit_logs"],
  platform_finance: ["platform_billing", "platform_tenants"],
  platform_readonly: ["platform_tenants", "platform_users", "audit_logs", "platform_billing"],
};

/* ─────────────────────────────────────────────────────────────────────────
   FEATURE FLAGS
───────────────────────────────────────────────────────────────────────── */

const FEATURE_FLAGS = [
  { key: "whatsapp_outbound",     label: "WhatsApp Outbound",     description: "Send WhatsApp messages to clients", enabled: false },
  { key: "whatsapp_inbound",      label: "WhatsApp Inbound",       description: "Receive WhatsApp messages", enabled: false },
  { key: "online_booking",        label: "Online Booking Portal",  description: "Public customer booking page", enabled: false },
  { key: "digital_signatures",    label: "Digital Signatures",     description: "eSign quotations and job cards", enabled: false },
  { key: "parts_inventory",       label: "Parts Inventory",        description: "Track parts stock levels", enabled: false },
  { key: "ai_diagnosis",          label: "AI Diagnosis Assistant", description: "AI-powered diagnosis suggestions", enabled: false, rollout_pct: "0" },
  { key: "payment_links",         label: "Payment Links",          description: "Generate online payment links", enabled: true },
  { key: "multi_branch",          label: "Multi-Branch",           description: "Manage multiple workshop locations", enabled: false },
  { key: "custom_branding",       label: "Custom Branding",        description: "Tenant logo and colour customisation", enabled: true },
  { key: "api_access",            label: "API Access",             description: "REST API access for integrations", enabled: true },
];

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEMO_PASSWORD = hashPassword("Admin@123");

/* ─────────────────────────────────────────────────────────────────────────
   SEED RUNNER
───────────────────────────────────────────────────────────────────────── */

async function seed() {
  console.log("🌱  Starting CEEDA database seed…\n");

  /* ── Feature flags ─────────────────────────────────────────────────── */
  console.log("  → Seeding feature flags…");
  for (const flag of FEATURE_FLAGS) {
    await db.insert(featureFlagsTable)
      .values({ ...flag, rollout_pct: flag.rollout_pct ?? "0" })
      .onConflictDoUpdate({
        target: featureFlagsTable.key,
        set: { label: flag.label, description: flag.description, enabled: flag.enabled },
      });
  }
  console.log(`     ${FEATURE_FLAGS.length} flags ✓`);

  /* ── Permissions ───────────────────────────────────────────────────── */
  console.log("  → Seeding permissions…");
  const permRecords: { resource: string; action: string; description: string }[] = [];
  for (const { resource, actions } of RESOURCES_ACTIONS) {
    for (const action of actions) {
      permRecords.push({
        resource,
        action,
        description: `${action} ${resource}`,
      });
    }
  }

  const insertedPerms = await db.insert(permissionsTable)
    .values(permRecords)
    .onConflictDoNothing()
    .returning();

  // Build lookup: "resource:action" → id
  // Also reload all existing ones (idempotent re-runs)
  const allPerms = await db.select().from(permissionsTable);
  const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));
  console.log(`     ${allPerms.length} permissions ✓`);

  /* ── Role permissions ─────────────────────────────────────────────── */
  console.log("  → Seeding role permissions…");
  let rpCount = 0;
  for (const [role, resources] of Object.entries(ROLE_RESOURCE_MAP)) {
    const resourceSet = new Set(resources);
    for (const { resource, actions } of RESOURCES_ACTIONS) {
      if (!resourceSet.has(resource)) continue;
      for (const action of actions) {
        const permId = permMap.get(`${resource}:${action}`);
        if (!permId) continue;
        await db.insert(rolePermissionsTable)
          .values({ role: role as schema.User["role"], permission_id: permId })
          .onConflictDoNothing();
        rpCount++;
      }
    }
  }
  console.log(`     ${rpCount} role-permission mappings ✓`);

  /* ── Demo tenant ───────────────────────────────────────────────────── */
  console.log("  → Seeding demo tenant…");
  const [tenant] = await db.insert(tenantsTable)
    .values({
      slug:       "demo-workshop",
      name:       "Demo Workshop",
      plan:       "professional",
      status:     "active",
      timezone:   "Asia/Dubai",
      currency:   "AED",
      locale:     "en",
      country:    "AE",
      email:      "demo@workshop.ae",
      phone:      "+971501234567",
    })
    .onConflictDoUpdate({
      target: tenantsTable.slug,
      set: { name: "Demo Workshop", updated_at: new Date() },
    })
    .returning();

  console.log(`     Tenant: ${tenant.name} (${tenant.id}) ✓`);

  /* ── Owner user ────────────────────────────────────────────────────── */
  console.log("  → Seeding demo owner user…");
  const [owner] = await db.insert(usersTable)
    .values({
      tenant_id:      tenant.id,
      email:          "ahmed@workshop.ae",
      name:           "Ahmed Al-Rashidi",
      role:           "owner",
      is_active:      true,
      email_verified: true,
      password_hash:  DEMO_PASSWORD,
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { name: "Ahmed Al-Rashidi", password_hash: DEMO_PASSWORD, updated_at: new Date() },
    })
    .returning();

  /* ── Additional staff ──────────────────────────────────────────────── */
  const staffData = [
    { email: "khalid@workshop.ae", name: "Khalid Hassan",     role: "service_advisor" as const },
    { email: "omar@workshop.ae",   name: "Omar Al-Farsi",     role: "technician" as const },
    { email: "rami@workshop.ae",   name: "Rami Khalil",       role: "technician" as const },
    { email: "sara@workshop.ae",   name: "Sara Al-Nasser",    role: "receptionist" as const },
    { email: "faisal@workshop.ae", name: "Faisal Al-Mutairi", role: "cashier" as const },
  ];

  const staffMap: Record<string, string> = { [owner.email]: owner.id };
  for (const s of staffData) {
    const [user] = await db.insert(usersTable)
      .values({ tenant_id: tenant.id, is_active: true, email_verified: true, password_hash: DEMO_PASSWORD, ...s })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: { name: s.name, password_hash: DEMO_PASSWORD, updated_at: new Date() },
      })
      .returning();
    staffMap[s.email] = user.id;
  }
  console.log(`     ${Object.keys(staffMap).length} users ✓`);

  /* ── Service catalog ───────────────────────────────────────────────── */
  console.log("  → Seeding service catalog…");
  const catalogData = [
    { sku: "LAB-001", name: "Standard Labour (per hour)", type: "labour" as const, unit: "hr",   unit_price: "75.00" },
    { sku: "LAB-002", name: "Specialised Labour (per hour)", type: "labour" as const, unit: "hr",   unit_price: "120.00" },
    { sku: "SVC-001", name: "Oil Change – Full Synthetic",    type: "labour" as const, unit: "each", unit_price: "150.00" },
    { sku: "SVC-002", name: "AC Service & Regas",             type: "labour" as const, unit: "each", unit_price: "250.00" },
    { sku: "SVC-003", name: "Brake Pad Replacement (axle)",   type: "labour" as const, unit: "axle", unit_price: "200.00" },
    { sku: "SVC-004", name: "Tyre Rotation & Balance",        type: "labour" as const, unit: "set",  unit_price: "80.00" },
    { sku: "SVC-005", name: "Full Vehicle Inspection",        type: "labour" as const, unit: "each", unit_price: "350.00" },
    { sku: "PRT-001", name: "Engine Air Filter",              type: "part" as const,   unit: "each", unit_price: "45.00",  cost_price: "22.00" },
    { sku: "PRT-002", name: "Cabin Air Filter",               type: "part" as const,   unit: "each", unit_price: "35.00",  cost_price: "15.00" },
    { sku: "PRT-003", name: "Engine Oil (5L) – 5W-30",       type: "part" as const,   unit: "5L",   unit_price: "90.00",  cost_price: "55.00" },
    { sku: "PRT-004", name: "Front Brake Pads (pair)",        type: "part" as const,   unit: "pair", unit_price: "180.00", cost_price: "90.00" },
    { sku: "PRT-005", name: "Rear Brake Pads (pair)",         type: "part" as const,   unit: "pair", unit_price: "150.00", cost_price: "75.00" },
    { sku: "CON-001", name: "Engine Flush",                   type: "consumable" as const, unit: "each", unit_price: "30.00" },
    { sku: "CON-002", name: "Brake Cleaner Spray",            type: "consumable" as const, unit: "each", unit_price: "15.00" },
  ];

  for (const item of catalogData) {
    await db.insert(catalogItemsTable)
      .values({ tenant_id: tenant.id, created_by: owner.id, ...item })
      .onConflictDoNothing();
  }
  console.log(`     ${catalogData.length} catalog items ✓`);

  /* ── Demo clients & vehicles ────────────────────────────────────────── */
  console.log("  → Seeding demo clients & vehicles…");

  const clientsData = [
    {
      name: "Mohammed Al-Rashidi", phone: "+971501112222", email: "moh@example.com",
      whatsapp: "+971501112222", type: "individual" as const,
    },
    {
      name: "Al Baraka Trading LLC", phone: "+97142334455", email: "fleet@albaraka.ae",
      type: "company" as const, company: "Al Baraka Trading LLC",
    },
    {
      name: "Fatima Al-Zaabi", phone: "+971509988776", email: "fatima@example.com",
      whatsapp: "+971509988776", type: "individual" as const,
    },
    {
      name: "Samir Khalil", phone: "+971555678901", email: "samir@example.com",
      type: "individual" as const,
    },
  ];

  const insertedClients = await db.insert(clientsTable)
    .values(clientsData.map((c) => ({ tenant_id: tenant.id, created_by: owner.id, ...c })))
    .onConflictDoNothing()
    .returning();

  if (insertedClients.length === 0) {
    console.log("     Clients already exist, skipping vehicles…");
  } else {
    const vehiclesData = [
      { client_id: insertedClients[0].id, plate: "DXB-A-12345", make: "Toyota",  model: "Camry",      year: "2022", color: "White", fuel_type: "petrol", vin: "1HGBH41JXMN109186" },
      { client_id: insertedClients[0].id, plate: "DXB-B-67890", make: "Nissan",  model: "Patrol",     year: "2020", color: "Silver", fuel_type: "petrol" },
      { client_id: insertedClients[1].id, plate: "SHJ-C-11111", make: "Toyota",  model: "Land Cruiser",year: "2023", color: "Black",  fuel_type: "petrol" },
      { client_id: insertedClients[1].id, plate: "SHJ-C-22222", make: "Ford",    model: "F-150",       year: "2021", color: "Red",    fuel_type: "petrol" },
      { client_id: insertedClients[2].id, plate: "ABU-D-33333", make: "BMW",     model: "5 Series",   year: "2023", color: "Blue",   fuel_type: "petrol", vin: "WBAXG5C5XDD123456" },
      { client_id: insertedClients[3].id, plate: "AJM-E-44444", make: "Mercedes",model: "C-Class",     year: "2022", color: "Grey",   fuel_type: "petrol" },
    ];

    await db.insert(vehiclesTable)
      .values(vehiclesData.map((v) => ({ tenant_id: tenant.id, created_by: owner.id, ...v })))
      .onConflictDoNothing();

    console.log(`     ${insertedClients.length} clients, ${vehiclesData.length} vehicles ✓`);

    /* ── Sample booking ─────────────────────────────────────────────── */
    const [booking] = await db.insert(bookingsTable)
      .values({
        tenant_id:    tenant.id,
        seq:          1,
        ref:          "BK-2024-0001",
        client_id:    insertedClients[0].id,
        vehicle_id:   vehiclesData[0] ? (await db.select().from(vehiclesTable).limit(1))[0]?.id : null,
        advisor_id:   staffMap["khalid@workshop.ae"],
        status:       "confirmed",
        source:       "phone",
        scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        duration_min: 90,
        notes:        "Customer reports AC not cooling well. Check refrigerant and compressor.",
        created_by:   staffMap["khalid@workshop.ae"],
      })
      .onConflictDoNothing()
      .returning();

    /* ── Sample quotation ───────────────────────────────────────────── */
    if (booking) {
      const [quote] = await db.insert(quotationsTable)
        .values({
          tenant_id:  tenant.id,
          seq:        1,
          ref:        "QT-2024-0001",
          booking_id: booking.id,
          client_id:  insertedClients[0].id,
          advisor_id: staffMap["khalid@workshop.ae"],
          status:     "approved",
          subtotal:   "430.00",
          discount:   "0.00",
          tax_rate:   "5.00",
          tax_amount: "21.50",
          total:      "451.50",
          approved_at: new Date(),
          expires_at:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          created_by:  staffMap["khalid@workshop.ae"],
        })
        .onConflictDoNothing()
        .returning();

      if (quote) {
        await db.insert(quoteLineItemsTable).values([
          { quotation_id: quote.id, sort_order: 1, description: "AC Service & Regas", type: "labour", qty: "1.00", unit_price: "250.00", line_total: "250.00" },
          { quotation_id: quote.id, sort_order: 2, description: "Engine Air Filter",   type: "part",   qty: "1.00", unit_price: "45.00",  line_total: "45.00" },
          { quotation_id: quote.id, sort_order: 3, description: "Cabin Air Filter",    type: "part",   qty: "1.00", unit_price: "35.00",  line_total: "35.00" },
          { quotation_id: quote.id, sort_order: 4, description: "Standard Labour",     type: "labour", qty: "1.33", unit_price: "75.00",  line_total: "100.00" },
        ]).onConflictDoNothing();

        /* ── Sample job card ─────────────────────────────────────────── */
        const [job] = await db.insert(jobsTable)
          .values({
            tenant_id:     tenant.id,
            seq:           1,
            ref:           "JC-2024-0001",
            quotation_id:  quote.id,
            booking_id:    booking.id,
            client_id:     insertedClients[0].id,
            advisor_id:    staffMap["khalid@workshop.ae"],
            technician_id: staffMap["omar@workshop.ae"],
            status:        "completed",
            priority:      "normal",
            bay:           "Bay 2",
            customer_concern: "AC not cooling, filter change due",
            started_at:    new Date(Date.now() - 6 * 60 * 60 * 1000),
            completed_at:  new Date(Date.now() - 1 * 60 * 60 * 1000),
            mileage_in:    "54,200",
            mileage_out:   "54,203",
            technician_note: "AC re-gassed, both filters replaced. Unit cooling well on test drive.",
            created_by:    staffMap["khalid@workshop.ae"],
          })
          .onConflictDoNothing()
          .returning();

        if (job) {
          // Job status history
          await db.insert(jobStatusHistoryTable).values([
            { job_id: job.id, tenant_id: tenant.id, from_status: null, to_status: "waiting", changed_by: staffMap["khalid@workshop.ae"] },
            { job_id: job.id, tenant_id: tenant.id, from_status: "waiting", to_status: "in_progress", changed_by: staffMap["omar@workshop.ae"] },
            { job_id: job.id, tenant_id: tenant.id, from_status: "in_progress", to_status: "qc", changed_by: staffMap["omar@workshop.ae"] },
            { job_id: job.id, tenant_id: tenant.id, from_status: "qc", to_status: "completed", changed_by: staffMap["khalid@workshop.ae"] },
          ]).onConflictDoNothing();

          /* ── Sample invoice ──────────────────────────────────────── */
          const [invoice] = await db.insert(invoicesTable)
            .values({
              tenant_id:   tenant.id,
              seq:         1,
              ref:         "INV-2024-0001",
              job_id:      job.id,
              quotation_id: quote.id,
              client_id:   insertedClients[0].id,
              cashier_id:  staffMap["faisal@workshop.ae"],
              status:      "paid",
              subtotal:    "430.00",
              discount:    "0.00",
              tax_rate:    "5.00",
              tax_amount:  "21.50",
              total:       "451.50",
              paid_amount: "451.50",
              sent_at:     new Date(Date.now() - 2 * 60 * 60 * 1000),
              paid_at:     new Date(Date.now() - 1 * 60 * 60 * 1000),
              created_by:  staffMap["faisal@workshop.ae"],
            })
            .onConflictDoNothing()
            .returning();

          if (invoice) {
            await db.insert(invoiceLineItemsTable).values([
              { invoice_id: invoice.id, sort_order: 1, description: "AC Service & Regas", type: "labour", qty: "1.00", unit_price: "250.00", line_total: "250.00" },
              { invoice_id: invoice.id, sort_order: 2, description: "Engine Air Filter",   type: "part",   qty: "1.00", unit_price: "45.00",  line_total: "45.00" },
              { invoice_id: invoice.id, sort_order: 3, description: "Cabin Air Filter",    type: "part",   qty: "1.00", unit_price: "35.00",  line_total: "35.00" },
              { invoice_id: invoice.id, sort_order: 4, description: "Standard Labour",     type: "labour", qty: "1.33", unit_price: "75.00",  line_total: "100.00" },
            ]).onConflictDoNothing();

            await db.insert(paymentsTable)
              .values({
                tenant_id:  tenant.id,
                invoice_id: invoice.id,
                method:     "card",
                amount:     "451.50",
                reference:  "POS-TXN-887712",
                paid_at:    new Date(Date.now() - 1 * 60 * 60 * 1000),
                created_by: staffMap["faisal@workshop.ae"],
              })
              .onConflictDoNothing();

            console.log("     1 booking, 1 quotation, 1 job, 1 invoice, 1 payment ✓");
          }
        }
      }
    }
  }

  console.log("\n✅  Seed complete!\n");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  pool.end().finally(() => process.exit(1));
});
