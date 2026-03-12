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
| Payments    | Stripe (planned) |
| Messaging   | WhatsApp Cloud API (planned) |
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

### web-app
- Public routes (in `PublicLayout`): `/`, `/pricing`, `/auth`, `/auth/*`
- Tenant routes (in `TenantLayout`): `/dashboard`, `/clients`, `/bookings`, `/quotations`, `/jobs`, `/invoices`, `/settings/*`, `/account/*`
- Router logic: `isTenantPath()` in `App.tsx` selects layout based on current path

### admin-console
- Login: `/auth`
- Protected admin routes (in `AdminLayout`): `/dashboard`, `/tenants`, `/billing`, `/flags`, `/impersonate`

## DB Schema (26 tables across 7 domain files)

| File | Tables |
|---|---|
| `platform.ts` | tenants, users, audit_logs, feature_flags, sessions |
| `clients.ts` | clients, vehicles |
| `bookings.ts` | bookings |
| `jobs.ts` | quotations, quote_line_items, jobs, job_time_logs |
| `invoices.ts` | invoices, invoice_line_items, payments, deposits |
| `catalog.ts` | catalog_items, notification_logs, whatsapp_threads, deposits |

All monetary values: `numeric(12,2)` — never float.
Sequential human-readable refs (e.g. `BK-2024-0001`) via `seq` + `ref` columns.

## RBAC

11 roles — code-defined `ROLE_PERMISSIONS` map (not stored in DB):

**Platform**: `platform_admin`, `platform_support`, `platform_readonly`, `platform_finance`
**Tenant admin**: `owner`, `admin`
**Tenant staff**: `service_advisor`, `technician`, `cashier`, `parts_manager`, `receptionist`

## Key Files

| File | Purpose |
|---|---|
| `artifacts/web-app/src/App.tsx` | Main routing (public/tenant split) |
| `artifacts/web-app/src/layouts/PublicLayout.tsx` | Marketing site nav + footer |
| `artifacts/web-app/src/layouts/TenantLayout.tsx` | App sidebar + topbar |
| `artifacts/web-app/src/hooks/useTenant.ts` | Tenant/user state hook |
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
