import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { login as apiLogin, type LoginResponse, type SessionTenant, type SessionUser } from "@/lib/api";

type AuthState = {
  user: SessionUser | null;
  tenant: SessionTenant | null;
  loading: boolean;
  signIn: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = "ceeda.session";

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenant, setTenant] = useState<SessionTenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LoginResponse;
          setUser(parsed.user ?? null);
          setTenant(parsed.tenant ?? null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, tenantSlug?: string) => {
      const data = await apiLogin(email, password, tenantSlug);
      if (data.user.role !== "technician" && data.user.role !== "owner" && data.user.role !== "admin" && data.user.role !== "service_advisor") {
        throw new Error("Your account does not have technician access.");
      }
      if (!data.tenant) {
        throw new Error("This account is not linked to a workshop.");
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setUser(data.user);
      setTenant(data.tenant);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setTenant(null);
  }, []);

  const value = useMemo(
    () => ({ user, tenant, loading, signIn, signOut }),
    [user, tenant, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
