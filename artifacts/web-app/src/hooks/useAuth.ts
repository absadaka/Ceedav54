import { useMemo } from "react";
import type { UserRole } from "@/lib/auth";
import { canAccess, type ModuleKey } from "@/lib/permissions";

export interface SessionData {
  userId:        string;
  tenantId:      string;
  tenantSlug:    string;
  name:          string;
  email:         string;
  role:          UserRole;
  avatarUrl?:    string;
  tenantName?:   string;
  tenantLogoUrl?: string;
}

const SESSION_KEY = "ceeda_session";

export function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function useAuth() {
  const session = useMemo(() => getSession(), []);

  const can = (module: ModuleKey) => canAccess(session?.role, module);
  const hasRole = (...roles: UserRole[]) => !!session && roles.includes(session.role);
  const isManager = hasRole("owner", "admin");

  return { user: session, can, hasRole, isManager };
}
