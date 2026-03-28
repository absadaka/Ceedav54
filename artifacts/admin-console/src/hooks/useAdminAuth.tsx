import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API = "";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthCtx {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mustSetPassword?: boolean; userId?: string; email?: string }>;
  setPassword: (userId: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("admin_user");
    if (!stored) { setLoading(false); return; }
    try {
      const parsed = JSON.parse(stored) as AdminUser;
      fetch(`${API}/api/admin/auth/me`, { headers: { "X-Admin-Id": parsed.id } })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { setUser(d.user); localStorage.setItem("admin_user", JSON.stringify(d.user)); })
        .catch(() => { localStorage.removeItem("admin_user"); setUser(null); })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem("admin_user");
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    if (data.mustSetPassword) {
      return { mustSetPassword: true, userId: data.userId, email: data.email };
    }
    setUser(data.user);
    localStorage.setItem("admin_user", JSON.stringify(data.user));
    return {};
  }, []);

  const setPasswordFn = useCallback(async (userId: string, email: string, password: string) => {
    const res = await fetch(`${API}/api/admin/auth/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to set password");
    setUser({ id: data.user.id, name: "Platform Admin", email: data.user.email, role: data.user.role });
    localStorage.setItem("admin_user", JSON.stringify({ id: data.user.id, name: "Platform Admin", email: data.user.email, role: data.user.role }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, setPassword: setPasswordFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
