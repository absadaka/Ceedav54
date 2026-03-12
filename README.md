# CEEDA — Automotive Workshop Management Platform

Multi-tenant B2B SaaS platform for automotive workshops covering bookings, quotations, job cards, invoices, WhatsApp notifications, and team management.

## Architecture

```
ceeda/
├── artifacts/
│   ├── web-app/          # Public site + tenant app (React + Vite, port $PORT)
│   ├── admin-console/    # Platform admin portal (React + Vite, port $PORT)
│   └── api-server/       # Express 5 REST API
├── lib/
│   ├── db/               # Drizzle ORM schema + migrations (PostgreSQL)
│   ├── api-spec/         # OpenAPI 3.1 contract (source of truth)
│   └── api-zod/          # Auto-generated Zod schemas + typed fetch client
└── .env.example
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/Radix UI, wouter, TanStack Query |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | JWT + HTTP-only cookies, Google OAuth, Magic links |
| Payments | Stripe |
| Messaging | WhatsApp Cloud API |
| Monorepo | pnpm workspaces |

## Design System

- **Font**: Inter (all weights via Google Fonts)
- **Accent**: Indigo `#6366F1` (`--primary: 239 84% 67%`)
- **Border**: `#EAECF0` (`--border: 221 13% 91%`)
- **Admin sidebar**: Gray-900 dark (`--sidebar: 221 39% 11%`)
- **Tenant sidebar**: White with border
- **Radius**: 8px base (`--radius: 0.5rem`)

## Roles & Permissions

11 roles across 3 levels:

**Platform level**: `platform_admin`, `platform_support`, `platform_readonly`, `platform_finance`

**Tenant admin**: `owner`, `admin`

**Tenant staff**: `service_advisor`, `technician`, `cashier`, `parts_manager`, `receptionist`

Permissions are code-defined in `ROLE_PERMISSIONS` map (not stored in DB).

## DB Schema (26 tables)

Domain groups:
- **platform**: tenants, users, sessions, audit_logs, feature_flags
- **clients**: clients, vehicles
- **bookings**: bookings
- **jobs**: quotations, quote_line_items, jobs, job_time_logs
- **invoices**: invoices, invoice_line_items, payments, deposits
- **catalog**: catalog_items, notification_logs, whatsapp_threads

All monetary values use `numeric(12,2)`. Sequential human-readable refs (e.g. `BK-2024-0001`) via atomic DB counter + seq column.

## Document IDs

| Type | Format |
|---|---|
| Booking | `BK-YYYY-NNNN` |
| Quotation | `QT-YYYY-NNNN` |
| Job card | `JC-YYYY-NNNN` |
| Invoice | `INV-YYYY-NNNN` |

## Getting Started

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Push DB schema (requires DATABASE_URL in .env)
pnpm --filter @workspace/db run push

# 4. Start development servers
# Each workflow starts automatically in Replit
```

## URL Structure

| App | Path | Description |
|---|---|---|
| Web app | `/` | Public marketing site + tenant app |
| Admin console | `/admin-console/` | Platform admin portal |
| API | Configured separately | REST API |

## Tenant App Pages

| Page | Path | Min. role |
|---|---|---|
| Dashboard | `/dashboard` | Any |
| Clients | `/clients` | receptionist |
| Bookings | `/bookings` | receptionist |
| Quotations | `/quotations` | service_advisor |
| Jobs | `/jobs` | technician |
| Invoices | `/invoices` | cashier |
| Team settings | `/settings/team` | admin |
| Shop settings | `/settings/shop` | admin |

## Admin Console Pages

| Page | Path |
|---|---|
| Platform dashboard | `/dashboard` |
| Tenants | `/tenants` |
| Billing | `/billing` |
| Feature flags | `/flags` |
| Impersonate | `/impersonate` |
