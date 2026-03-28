import { useState, useCallback } from "react";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "trial" | "suspended";
  timezone: string;
  currency: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "service_advisor" | "technician" | "cashier" | "parts_manager" | "receptionist";
  avatarUrl?: string;
}

export interface TenantState {
  tenant: Tenant | null;
  user: TenantUser | null;
  isLoading: boolean;
  error: string | null;
}

const MOCK_TENANT: Tenant = {
  id: "t_demo_001",
  slug: "demo-workshop",
  name: "Demo Workshop",
  plan: "professional",
  status: "trial",
  timezone: "Asia/Dubai",
  currency: "AED",
};

const MOCK_USER: TenantUser = {
  id: "u_demo_001",
  tenantId: "t_demo_001",
  email: "admin@demo-workshop.ceeda.me",
  name: "Demo Admin",
  role: "owner",
};

export function useTenant(): TenantState & { signOut: () => void } {
  const [state] = useState<TenantState>({
    tenant: MOCK_TENANT,
    user: MOCK_USER,
    isLoading: false,
    error: null,
  });

  const signOut = useCallback(() => {
    window.location.href = "/auth";
  }, []);

  return { ...state, signOut };
}
