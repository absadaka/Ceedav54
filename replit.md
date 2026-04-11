# CEEDA — Automotive Workshop Management Platform

Multi-tenant B2B SaaS for automotive workshops. Covers bookings, quotations, job cards, invoices, WhatsApp, team management, public site, and platform admin.

## Architecture

```
ceeda/
├── artifacts/
│   ├── web-app/          # Public site + tenant app  (React+Vite, port $PORT, path: /)
│   ├── admin-console/    # Platform admin portal     (React+Vite, port $PORT, path: /admin-console/)
│   └── api-server/       # Express 5 REST API        (port 8080, path: /api/)
├── lib/
│   ├── db/               # Drizzle ORM schema + migrations (PostgreSQL)
│   ├── api-spec/         # OpenAPI 3.1 contract (source of truth)
│   ├── api-zod/          # Auto-generated Zod schemas + typed fetch client
│   └── api-client-react/ # Generated React Query hooks
├── scripts/              # Utility scripts
├── .env.example          # Environment variable template
└── README.md
```

## Stack

| Layer       | Tech |
|---|---|
| Frontend    | React 19, Vite, Tailwind CSS v4, shadcn/Radix UI, wouter, TanStack Query |
| Backend     | Express 5, TypeScript, tsx |
| Database    | PostgreSQL 16, Drizzle ORM |
| Auth        | JWT + HTTP-only cookies, Google OAuth, Magic links (planned) |
| Payments    | Stripe (Checkout Sessions) — via Replit integration (`stripeClient.ts`), auto-creates payment link on invoice creation, webhook at `/api/stripe/webhook` |
| Email       | Resend SDK — sends from `info@ceeda.me` (env: `RESEND_API_KEY`, `EMAIL_FROM_DOMAIN`) |
| SMS/WhatsApp | Twilio SDK — SMS & WhatsApp via `api-server/src/services/sms.ts` (env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`). Per-tenant config in `integrations` table. |
| Monorepo    | pnpm workspaces |

## Design System

- **Font**: Inter via Google Fonts (`index.html` preconnect + stylesheet link)
- **Accent**: Indigo `#6366F1` — `--primary: 239 84% 67%`
- **Border**: `#EAECF0` — `--border: 221 13% 91%`
- **Tenant sidebar**: White with border (`--sidebar: 0 0% 100%`)
- **Admin sidebar**: Gray-900 dark (`--sidebar: 221 39% 11%`)
- **Radius**: 8px base (`--radius: 0.5rem`)
- Design tokens in both `artifacts/web-app/src/index.css` and `artifacts/admin-console/src/index.css`

## Routing

`App.tsx` uses `detectZone(path)` to split into 5 zones:

### web-app zones

| Zone | Paths | Layout |
|---|---|---|
| `public` | `/`, `/pricing` | `PublicLayout` (nav + footer) |
| `full-screen-auth` | `/auth`, `/register` | None (full screen, CEEDA branding) |
| `tenant-auth` | `/:tenant/login`, `/:tenant/logout`, `/:tenant/forgot-password`, `/:tenant/reset-password`, `/:tenant/verify-email`, `/:tenant/re-auth` | `TenantAuthShell` (split: form + carousel) |
| `tenant-slug-app` | `/:tenant/account/*`, `/:tenant/admin/*` | `TenantLayout` with `tenantSlug` prop |
| `legacy-tenant-app` | `/dashboard`, `/clients`, `/bookings`, etc. | `TenantLayout` (no slug prefix) |

### admin-console
- Login: `/auth` — email + password form, first-time login redirects to set-password page
- Auth context: `src/hooks/useAdminAuth.tsx` — `AdminAuthProvider` wrapping the app, stores session in localStorage
- Protected admin routes (in `AdminLayout`): `/dashboard`, `/tenants`, `/billing`, `/flags`, `/impersonate`, `/tickets`, `/health`
- Auth guard: `App.tsx` `ProtectedRouter` checks `useAdminAuth().user`, redirects to `/auth` if not logged in
- Logout: via user dropdown in `AdminLayout` top bar
- **Subscriptions section** (sidebar dropdown): Plans (`/subscriptions/plans`), Coupons (`/subscriptions/coupons`), Invoices (`/subscriptions/invoices`), Failed Payments (`/subscriptions/failed`), Plan Override (`/subscriptions/override`), Add-Ons (`/subscriptions/addons`), Revenue Analytics (`/subscriptions/revenue`), Churn & Renewals (`/subscriptions/churn`)
- **Settings section** (sidebar dropdown): General (`/settings/general`), Admin Users (`/settings/users`)
- **Admin user management**: API endpoints `GET/POST /admin/users`, `PATCH/DELETE /admin/users/:id`. Platform roles: `platform_admin`, `platform_support`, `platform_finance`, `platform_readonly`. All platform roles can log into admin console.
- **Login accepts all platform roles** (not just `platform_admin`): any user with `tenant_id = null` and a `platform_*` role can log in

## Auth Service Abstraction

`artifacts/web-app/src/lib/auth.ts`:
- `IAuthService` interface with all auth methods (signIn, Google, passkey, magicLink, phoneOTP, SSO, signOut, sessions, password reset, email verify, reAuth)
- `StubAuthService` — mock implementation (swap for real backend)
- `authService` singleton export

`artifacts/web-app/src/lib/tenant.ts`:
- `TenantInfo` type — slug, name, logo, allowedAuthMethods, ssoEnabled
- `resolveTenant(slug)` — async fetch (stub returns mock for known slugs, generates from slug for unknown)
- `tenantInitials()`, `slugFromPath()`, `tenantBase()` helpers

`artifacts/web-app/src/guards/RouteGuard.tsx`:
- `AuthGuard`, `GuestGuard`, `RoleGuard`, `TenantGuard` — all stubs, replace with real `useAuth()` hook

## Modules Built & Live

| Module | Status | Notes |
|---|---|---|
| Quick Repair | Live | Simplified 4-status flow (New→Work Done→Invoiced→Paid), no quotation/inspection. Uses `jobs` table with `type="quick_repair"`, ref prefix "QR-". Kanban + list views, detail page with parts CRUD. |
| Bookings | Live | Full CRUD, 7-status flow, advisor meta, stat strip, booking detail page |
| Quotations | Live | Full CRUD, line items CRUD with auto-recalc, advance payments (value/percentage, Stripe checkout), send/approve/reject/convert-to-job flow |
| Jobs | Live | Kanban + list views (7-lane incl. Delivered), job detail: live Start/Stop timer, assign-technician dialog, parts CRUD, photo URL upload, status history, QC section, Mark as delivered flow |
| Clients/Vehicles | Live | Customer table, detail page, vehicle detail page |
| Dashboard | Live | KPI strip, 7 live data sections |
| Invoices | Live | Full CRUD, line items, payments, stats strip, detail page, advance payment deduction from quotation (UI/PDF/email/SMS/WhatsApp) |

### Invoice API Endpoints (`/api/invoices?tenant=<slug>`)
- `GET /stats` — dashboard KPIs (draft/sent/partial/paid/overdue/void counts + totals)
- `GET /` — paginated list with status/search filter
- `POST /` — create blank invoice
- `POST /from-job/:jobId` — create invoice pre-populated from job's parts list; includes technician notes + report notes (divider `--- Job Report ---`) in `notes` field
- `GET /:id` — full detail (invoice + line items + payments + jobReport[]), uses Drizzle `alias()` for cashier joins
- `PATCH /:id` — update fields (triggers recalc)
- `DELETE /:id` — delete (draft/void only)
- `GET /:id/lines` — list line items
- `POST /:id/lines` — add line item (auto-recalcs subtotal/tax/total)
- `PATCH /:id/lines/:lineId` — update line item (auto-recalcs)
- `DELETE /:id/lines/:lineId` — remove line item (auto-recalcs)
- `POST /:id/payments` — record payment (auto-updates paid_amount, sets partial/paid status)
- `POST /:id/send` — draft → sent; email includes job report section if report notes exist
- `POST /:id/void` — void invoice
- `GET /:id/pdf` — server-rendered printable HTML page (use browser Print → Save as PDF)
- `POST /:id/sync` — sync draft/sent invoice line items from linked quotation/job

**Key patterns**: `vehiclesTable.plate` (not `plate_number`), `alias(usersTable, "inv_cashier")` for multi-user joins

### Quotation API Endpoints (`/api/quotations?tenant=<slug>`)
- `GET /` — paginated list with status filter
- `POST /` — create draft
- `GET /:id` — full detail (lines, advance payments, balance)
- `PATCH /:id` — update draft fields
- `DELETE /:id` — delete draft only
- `GET /:id/lines` — list line items
- `POST /:id/lines` — add line item (auto-recalcs totals)
- `PUT /:id/lines/:lineId` — update line item (auto-recalcs)
- `DELETE /:id/lines/:lineId` — delete line item (auto-recalcs)
- `POST /:id/advance` — record advance payment
- `DELETE /:id/advance/:paymentId` — remove advance payment
- `POST /:id/set-advance` — set advance payment (type: none/value/percentage, value)
- `POST /:id/send` — draft → sent; email includes advance payment info if set
- `POST /:id/approve` — sent/viewed → approved
- `POST /:id/reject` — sent/viewed → rejected
- `POST /:id/convert` — approved only → creates job card, sets `converted_job_id`
- `GET /:id/pdf` — server-rendered printable HTML page (use browser Print → Save as PDF)

### Booking API Endpoints (`/api/bookings?tenant=<slug>`)
- `GET /` — paginated list with date/status filter
- `POST /` — create booking
- `GET /meta/advisors` — list advisors
- `GET /:id` — full detail
- `PATCH /:id` — update
- `DELETE /:id` — delete pending only
- `POST /:id/status` — status transition with guard

## DB Schema (26 tables across 6 domain files) — MIGRATED + SEEDED

| File | Tables |
|---|---|
| `platform.ts` | tenants, users, permissions, role_permissions, user_invites, sessions, devices, audit_logs, feature_flags, api_keys |
| `clients.ts` | clients, vehicles |
| `bookings.ts` | bookings |
| `jobs.ts` | quotations, quote_line_items, jobs, job_status_history, job_assignments, job_time_logs |
| `invoices.ts` | invoices, invoice_line_items, payments, deposits |
| `catalog.ts` | catalog_items, notification_logs, whatsapp_threads |

- Migration file: `lib/db/migrations/0000_right_red_wolf.sql`
- All monetary values: `numeric(12,2)` — never float
- Sequential human-readable refs (e.g. `BK-2024-0001`) via `seq` + `ref` columns
- Seed: 1 demo tenant, 6 users, 66 permissions, 237 role-permission mappings, 14 catalog items, 4 clients, 6 vehicles, 1 booking, 1 quotation, 1 job, 1 invoice, 1 payment

### DB Scripts
```bash
pnpm --filter @workspace/db run generate   # Regenerate migration files
pnpm --filter @workspace/db run migrate    # Apply pending migrations
pnpm --filter @workspace/db run seed       # Seed demo data
pnpm --filter @workspace/db run push       # Push schema directly (dev only)
pnpm --filter @workspace/db run studio     # Open Drizzle Studio
```

## RBAC

11 roles — stored in `roles` enum + `permissions` / `role_permissions` tables (seeded):

**Platform**: `platform_admin`, `platform_support`, `platform_readonly`, `platform_finance`
**Tenant admin**: `owner`, `admin`
**Tenant staff**: `service_advisor`, `technician`, `cashier`, `parts_manager`, `receptionist`

66 permissions across 17 resources (bookings, clients, vehicles, quotations, jobs, invoices, payments, catalog, team, settings, audit_logs, api_keys, sso, platform_tenants, platform_billing, platform_flags, platform_users)

## Tenant App Shell

**Layout**: `artifacts/web-app/src/layouts/TenantLayout.tsx`
- Left: collapsible sidebar (220px ↔ 56px on desktop; overlay drawer on mobile via hamburger)
- Sidebar groups: **Main** (Dashboard, Customers, Bookings, Service Jobs, Quick Repair, Quotations, Invoices) → **Workspace** (Team, Settings) → **Admin** (Users, SSO, Audit log, API keys)
- Top bar: hamburger (mobile), Search/Cmd+K trigger (center), shop avatar + name (right), notification bell, user dropdown
- CEEDA logo (wrench icon + text) anchors the sidebar top
- Collapse toggle at sidebar bottom (desktop only)

**Command palette**: `src/components/CommandPalette.tsx` — triggered by ⌘K / Ctrl+K, searchable nav items using shadcn Command dialog

**Pages + loading states** (`src/hooks/usePageLoad.ts`): all section pages show a skeleton for ~350ms on mount then resolve to their empty state. Pattern is ready for real API data fetching.

| Route | Component |
|---|---|
| `/dashboard` | DashboardPage — live KPI strip, bookings/jobs/quotations/invoices tables, technician workload, revenue summary, activity feed |
| `/customers`     | ClientsPage — live table: search, All/Individual/Company filter, vehicle count, last visit, kebab menu (view/edit/delete), pagination |
| `/customers/:id` | CustomerDetailPage — stats strip, contact card, Vehicles/Bookings/Quotes/Jobs/Invoices tabs, edit/delete actions |
| `/vehicles/:id`  | VehicleDetailPage — plate/make/year header, details card (VIN/mileage/fuel/transmission), owner card, history tabs |
| `/jobs/:id`      | JobDetailPage — full job card: stats strip, customer/vehicle/team cards, mileage, timeline, 5-tab panel (Work/Parts/Time/Photos/History), status transition modal, technician notes, parts CRUD, time logs table, photo gallery |
| `/bookings` | BookingsPage — table with filter toolbar |
| `/quotations` | QuotationsPage — table with filter toolbar |
| `/jobs`          | JobsPage — live Kanban (6-lane) + List toggle, real-time lane counts, job cards with priority badges/elapsed time/tech initials, debounced search, New job drawer |
| `/invoices`     | InvoicesPage — live list with stats strip (Draft/Overdue/Outstanding/Total paid), status filter tabs, search |
| `/invoices/:id` | InvoiceDetailPage — customer/vehicle card, line items CRUD table, totals panel with discount+VAT, payment history, RecordPaymentDialog, SendPaymentLinkDialog (Stripe placeholder), void/delete actions |
| `/team` | TeamPage — member table with role badges, stats strip |
| `/settings` | SettingsPage — grouped hub (Workshop / Sales & Finance / Communication / Account / Developer) |
| `/settings/business` | BusinessPage — logo upload, identity, contact, social links; PATCH /settings/business |
| `/settings/hours` | HoursPage — per-day toggle + open/close time selectors; PATCH /settings/hours |
| `/settings/services` | ServicesPage — catalog CRUD table with type filter chips, Add/Edit/Delete dialog, active toggle |
| `/settings/team` | SettingsTeamPage — wrapped in SettingsLayout |
| `/settings/sales` | SalesPage — VAT rate, quote validity, payment terms, auto-invoice, invoice notes |
| `/settings/reporting` | ReportingPage — fiscal year start, coming-soon dashboard widgets, exports |
| `/settings/billing` | BillingPage — current plan status, 3-plan comparison cards, payment method, invoice history |
| `/settings/comms` | CommsPage — email sender, SMS sender ID, notification trigger toggles |
| `/settings/integrations` | IntegrationsPage — Stripe / WhatsApp / Twilio cards with enable+config dialogs |

**Routing**: `/clients` kept as backward-compat alias for `/customers`.

## Onboarding API

`POST /api/onboarding` — Creates a new tenant with full setup in a single request.

**Payload**:
```json
{
  "owner": { "name": "...", "email": "...", "password": "..." },
  "shop": { "name": "...", "type": "auto_mechanical|body_fixing|tires|electrical_battery|auto_care", "phone": "...", "address": "...", "country": "AE", "technicians": 3, "workers": 6 },
  "locale": { "currency": "AED", "timezone": "Asia/Dubai", "locale": "en" },
  "services": [{ "name": "...", "type": "labour", "unit_price": "150.00", "duration_min": 45 }],
  "plan": "starter|professional|enterprise",
  "logo_base64": "data:image/png;base64,..."
}
```

**Returns**: `{ success: true, slug: "shop-name", tenantId: "uuid", userId: "uuid", redirectTo: "/dashboard" }`

**Operations**: generates unique slug → creates tenant → hashes password (scryptSync) → creates owner user → seeds catalog items

## Dashboard API

`GET /api/dashboard?tenant=<slug>` — Returns all dashboard data in a single request (7 parallel DB queries).

**Response shape**:
```json
{
  "currency": "AED",
  "kpis": { "bookings_today": 0, "active_jobs": 0, "revenue_month": "451.50", "unpaid_invoices_count": 0, "unpaid_invoices_total": "0.00" },
  "revenue": { "today": "451.50", "week": "451.50", "month": "451.50" },
  "bookings_today": [],
  "active_jobs": [],
  "pending_quotations": [],
  "unpaid_invoices": [],
  "technician_workload": [{ "id": "uuid", "name": "...", "active_count": "0", "completed_today": "1" }],
  "recent_activity": [{ "id": "uuid", "from_status": null, "to_status": "waiting", "created_at": "...", "job_ref": "Insp-2026-0001", "changed_by_name": "..." }]
}
```

**Auth**: Uses `?tenant=<slug>` for now; will use session when auth is wired.
**Caching**: `staleTime: 60_000`, `refetchInterval: 120_000` on the client.
**Route file**: `artifacts/api-server/src/routes/dashboard.ts` (mounted at `/dashboard` inside `/api` router)

## Key Files

| File | Purpose |
|---|---|
| `artifacts/web-app/src/App.tsx` | 5-zone routing via `detectZone()` |
| `artifacts/web-app/src/lib/auth.ts` | `IAuthService` interface + `StubAuthService` mock |
| `artifacts/web-app/src/lib/tenant.ts` | Tenant resolution + helpers |
| `artifacts/web-app/src/guards/RouteGuard.tsx` | Auth/role guard stubs |
| `artifacts/web-app/src/layouts/PublicLayout.tsx` | Marketing site nav + footer |
| `artifacts/web-app/src/layouts/TenantLayout.tsx` | App sidebar (Account + Admin sections) + topbar |
| `artifacts/web-app/src/pages/auth/TenantAuthShell.tsx` | Split-screen layout for tenant auth pages |
| `artifacts/web-app/src/pages/auth/TenantLoginPage.tsx` | Multi-method login (password/magic/phone/Google/SSO/passkey) |
| `artifacts/web-app/src/pages/tenant/admin/UsersPage.tsx` | Team member management with invite dialog |
| `artifacts/web-app/src/pages/tenant/admin/SsoPage.tsx` | SAML 2.0 SSO configuration |
| `artifacts/web-app/src/pages/tenant/admin/AuditPage.tsx` | Filterable audit event log |
| `artifacts/web-app/src/pages/tenant/admin/ApiKeysPage.tsx` | API key create/revoke with scope picker |
| `artifacts/web-app/src/pages/tenant/account/DevicesPage.tsx` | Trusted devices with revoke |
| `artifacts/admin-console/src/App.tsx` | Admin routing (login/protected split) |
| `artifacts/admin-console/src/layouts/AdminLayout.tsx` | Dark sidebar + topbar |
| `lib/db/src/schema/index.ts` | Schema barrel export |
| `lib/api-spec/openapi.yaml` | API contract (source of truth) |

## TypeScript & Monorepo

- Every package extends `tsconfig.base.json` (`composite: true`)
- Typecheck from root: `pnpm run typecheck`
- DB push (dev): `pnpm --filter @workspace/db run push`
- API codegen: `pnpm --filter @workspace/api-spec run codegen`

## Node.js Version

24

## Package Manager

pnpm
