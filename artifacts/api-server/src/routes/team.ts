import { Router } from "express";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";
import {
  db, tenantsTable, usersTable, userInvitesTable,
} from "@workspace/db";
import { sendEmail, teamInviteEmailHtml } from "../services/email.js";

const router = Router();

async function resolveTenant(slug: string) {
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
  return t ?? null;
}

const TENANT_ROLES = [
  "owner", "admin", "service_advisor", "technician",
  "cashier", "parts_manager", "receptionist",
] as const;

type TenantRole = (typeof TENANT_ROLES)[number];

/* ── GET /team ──────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [members, invites, [stats]] = await Promise.all([
      db
        .select({
          id:            usersTable.id,
          name:          usersTable.name,
          email:         usersTable.email,
          role:          usersTable.role,
          is_active:     usersTable.is_active,
          avatar_url:    usersTable.avatar_url,
          phone:         usersTable.phone,
          last_login_at: usersTable.last_login_at,
          created_at:    usersTable.created_at,
        })
        .from(usersTable)
        .where(and(eq(usersTable.tenant_id, tenant.id), isNull(usersTable.deleted_at)))
        .orderBy(desc(usersTable.created_at)),

      db
        .select({
          id:         userInvitesTable.id,
          email:      userInvitesTable.email,
          role:       userInvitesTable.role,
          status:     userInvitesTable.status,
          expires_at: userInvitesTable.expires_at,
          created_at: userInvitesTable.created_at,
        })
        .from(userInvitesTable)
        .where(and(
          eq(userInvitesTable.tenant_id, tenant.id),
          eq(userInvitesTable.status, "pending"),
        ))
        .orderBy(desc(userInvitesTable.created_at)),

      db
        .select({ total: count() })
        .from(usersTable)
        .where(and(eq(usersTable.tenant_id, tenant.id), isNull(usersTable.deleted_at))),
    ]);

    const active    = members.filter((m) => m.is_active).length;
    const suspended = members.filter((m) => !m.is_active).length;

    return res.json({
      members,
      invites,
      stats: {
        total:          stats.total,
        active,
        suspended,
        pending_invites: invites.length,
      },
    });
  } catch (err) {
    console.error("GET /team", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /team/invite ──────────────────────────────────────────────────── */
router.post("/invite", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { email, role, name, invitedBy } = req.body as {
      email?: string;
      role?: string;
      name?: string;
      invitedBy?: string;
    };

    if (!email || !role) {
      return res.status(400).json({ error: "email and role are required" });
    }

    if (!TENANT_ROLES.includes(role as TenantRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, email.toLowerCase().trim()), isNull(usersTable.deleted_at)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const tokenHash = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(userInvitesTable)
      .values({
        tenant_id:  tenant.id,
        email:      email.toLowerCase().trim(),
        role:       role as TenantRole,
        token_hash: tokenHash,
        invited_by: invitedBy ?? null,
        expires_at: expiresAt,
        status:     "pending",
      })
      .returning();

    let tempPw: string | null = null;
    if (name) {
      tempPw = randomBytes(6).toString("base64url");
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(tempPw, salt, 64).toString("hex");
      await db.insert(usersTable).values({
        tenant_id:     tenant.id,
        email:         email.toLowerCase().trim(),
        name:          name.trim(),
        role:          role as TenantRole,
        password_hash: `${salt}:${hash}`,
        is_active:     true,
        created_by:    invitedBy ?? null,
      });
    }

    const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "ceeda.me";
    const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
    const loginUrl = `${proto}://${host}/auth?tenant=${encodeURIComponent(tenant.slug)}`;

    const emailResult = await sendEmail({
      to: email.toLowerCase().trim(),
      subject: `You've been invited to ${tenant.name}`,
      html: teamInviteEmailHtml({
        shopName: tenant.name,
        userName: name?.trim() || email.split("@")[0],
        role,
        email: email.toLowerCase().trim(),
        tempPassword: tempPw ?? undefined,
        loginUrl,
      }),
      tenantId: tenant.id,
      shopName: tenant.name,
    });

    return res.status(201).json({
      invite,
      inviteUrl: `/accept-invite?token=${tokenHash}`,
      emailSent: emailResult.success,
      emailReason: emailResult.success ? undefined : (emailResult as any).reason,
    });
  } catch (err) {
    console.error("POST /team/invite", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /team/:userId/role ───────────────────────────────────────────── */
router.patch("/:userId/role", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { role } = req.body as { role?: string };
    if (!role || !TENANT_ROLES.includes(role as TenantRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(and(
        eq(usersTable.id, req.params.userId),
        eq(usersTable.tenant_id, tenant.id),
        isNull(usersTable.deleted_at),
      ))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "owner") {
      return res.status(403).json({ error: "Cannot change the owner's role" });
    }

    const [updated] = await db
      .update(usersTable)
      .set({ role: role as TenantRole, updated_at: new Date() })
      .where(eq(usersTable.id, req.params.userId))
      .returning({ id: usersTable.id, role: usersTable.role });

    return res.json({ user: updated });
  } catch (err) {
    console.error("PATCH /team/:userId/role", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── PATCH /team/:userId/status ─────────────────────────────────────────── */
router.patch("/:userId/status", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const { is_active } = req.body as { is_active?: boolean };
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active (boolean) is required" });
    }

    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(and(
        eq(usersTable.id, req.params.userId),
        eq(usersTable.tenant_id, tenant.id),
        isNull(usersTable.deleted_at),
      ))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "owner" && !is_active) {
      return res.status(403).json({ error: "Cannot suspend the account owner" });
    }

    const [updated] = await db
      .update(usersTable)
      .set({ is_active, updated_at: new Date() })
      .where(eq(usersTable.id, req.params.userId))
      .returning({ id: usersTable.id, is_active: usersTable.is_active });

    return res.json({ user: updated });
  } catch (err) {
    console.error("PATCH /team/:userId/status", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /team/:userId ────────────────────────────────────────────────── */
router.delete("/:userId", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(and(
        eq(usersTable.id, req.params.userId),
        eq(usersTable.tenant_id, tenant.id),
        isNull(usersTable.deleted_at),
      ))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "owner") {
      return res.status(403).json({ error: "Cannot remove the account owner" });
    }

    await db
      .update(usersTable)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(eq(usersTable.id, req.params.userId));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /team/:userId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /team/invites/:inviteId ──────────────────────────────────────── */
router.delete("/invites/:inviteId", async (req, res) => {
  try {
    const slug = (req.query.tenant as string) ?? "demo-workshop";
    const tenant = await resolveTenant(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    await db
      .update(userInvitesTable)
      .set({ status: "cancelled" })
      .where(and(
        eq(userInvitesTable.id, req.params.inviteId),
        eq(userInvitesTable.tenant_id, tenant.id),
      ));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /team/invites/:inviteId", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
