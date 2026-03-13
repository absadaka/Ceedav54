import type { UserRole } from "./auth";

export type ModuleKey =
  | "dashboard" | "customers" | "bookings" | "quotations"
  | "jobs" | "invoices" | "team" | "settings"
  | "admin_users" | "admin_sso" | "admin_audit" | "admin_api_keys"
  | "account_security" | "account_sessions" | "account_devices";

const ALL_TENANT_ROLES: UserRole[] = [
  "owner", "admin", "service_advisor", "technician",
  "cashier", "parts_manager", "receptionist",
];

const MANAGERS: UserRole[] = ["owner", "admin"];

export const MODULE_ROLES: Record<ModuleKey, UserRole[]> = {
  dashboard:       ALL_TENANT_ROLES,
  customers:       ALL_TENANT_ROLES,
  bookings:        ALL_TENANT_ROLES,
  quotations:      ALL_TENANT_ROLES,
  jobs:            ALL_TENANT_ROLES,
  invoices:        ["owner", "admin", "cashier", "service_advisor", "parts_manager"],
  team:            MANAGERS,
  settings:        MANAGERS,
  admin_users:     MANAGERS,
  admin_sso:       MANAGERS,
  admin_audit:     MANAGERS,
  admin_api_keys:  MANAGERS,
  account_security: ALL_TENANT_ROLES,
  account_sessions: ALL_TENANT_ROLES,
  account_devices:  ALL_TENANT_ROLES,
};

export function canAccess(role: UserRole | undefined, module: ModuleKey): boolean {
  if (!role) return false;
  if (role === "platform_admin") return true;
  return MODULE_ROLES[module]?.includes(role) ?? false;
}

export const ROLE_COLORS: Record<string, string> = {
  owner:           "bg-violet-50 text-violet-700 border-violet-200",
  admin:           "bg-indigo-50 text-indigo-700 border-indigo-200",
  service_advisor: "bg-blue-50 text-blue-700 border-blue-200",
  technician:      "bg-amber-50 text-amber-700 border-amber-200",
  cashier:         "bg-green-50 text-green-700 border-green-200",
  parts_manager:   "bg-purple-50 text-purple-700 border-purple-200",
  receptionist:    "bg-rose-50 text-rose-700 border-rose-200",
  platform_admin:  "bg-red-50 text-red-700 border-red-200",
};

export const TENANT_ROLES_FOR_INVITE: UserRole[] = [
  "admin", "service_advisor", "technician", "cashier", "parts_manager", "receptionist",
];
