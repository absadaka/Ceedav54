// Auth service abstraction — swap StubAuthService for a real implementation
// when backend is live. All callers only reference IAuthService.

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type AuthMethod =
  | "password"
  | "google"
  | "passkey"
  | "magic_link"
  | "phone_otp"
  | "sso";

export type UserRole =
  | "owner"
  | "admin"
  | "service_advisor"
  | "technician"
  | "cashier"
  | "parts_manager"
  | "receptionist"
  | "platform_admin"
  | "platform_support"
  | "platform_finance"
  | "platform_readonly";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  userAgent: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  city?: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface AuthResult {
  user: AuthUser;
  session: AuthSession;
  redirectTo?: string;
}

/* ─── Interface ─────────────────────────────────────────────────────────── */

export interface IAuthService {
  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
  // Sign-in methods
  signIn(email: string, password: string, tenantSlug?: string): Promise<AuthResult>;
  signInWithGoogle(tenantSlug?: string): Promise<AuthResult>;
  signInWithPasskey(email: string): Promise<AuthResult>;
  sendMagicLink(email: string, tenantSlug?: string): Promise<void>;
  sendPhoneOtp(phone: string): Promise<void>;
  verifyPhoneOtp(phone: string, code: string, tenantSlug?: string): Promise<AuthResult>;
  initiateSSO(tenantSlug: string): Promise<void>;
  // Session management
  signOut(): Promise<void>;
  listSessions(): Promise<AuthSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllOtherSessions(): Promise<void>;
  // Password
  sendPasswordReset(email: string, tenantSlug?: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  // Email verification
  verifyEmail(token: string): Promise<AuthResult>;
  // Re-authentication (for sensitive actions)
  reAuth(password: string): Promise<void>;
}

/* ─── Stub implementation ───────────────────────────────────────────────── */

function delay(ms = 700): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const MOCK_USER: AuthUser = {
  id: "usr_01HXQ",
  email: "demo@ceeda.me",
  name: "Demo Admin",
  role: "owner",
  tenantId: "ten_01HXQ",
  tenantSlug: "demo-workshop",
};

const MOCK_SESSION: AuthSession = {
  id: "sess_current",
  userId: MOCK_USER.id,
  deviceInfo: {
    browser: "Chrome 124",
    os: "macOS 14",
    deviceType: "desktop",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  },
  ipAddress: "86.12.34.56",
  city: "Dubai, AE",
  lastActiveAt: new Date(),
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  isCurrent: true,
};

const MOCK_SESSIONS: AuthSession[] = [
  MOCK_SESSION,
  {
    id: "sess_02",
    userId: MOCK_USER.id,
    deviceInfo: { browser: "Safari 17", os: "iOS 17", deviceType: "mobile", userAgent: "" },
    ipAddress: "86.12.34.88",
    city: "Dubai, AE",
    lastActiveAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isCurrent: false,
  },
  {
    id: "sess_03",
    userId: MOCK_USER.id,
    deviceInfo: { browser: "Firefox 125", os: "Windows 11", deviceType: "desktop", userAgent: "" },
    ipAddress: "92.168.1.100",
    city: "Riyadh, SA",
    lastActiveAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    isCurrent: false,
  },
  {
    id: "sess_04",
    userId: MOCK_USER.id,
    deviceInfo: { browser: "Chrome 123", os: "Android 14", deviceType: "mobile", userAgent: "" },
    ipAddress: "45.200.11.5",
    city: "Abu Dhabi, AE",
    lastActiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    isCurrent: false,
  },
];

const SESSION_KEY = "ceeda_session";

interface StoredSession {
  userId:        string;
  tenantSlug:    string;
  tenantId:      string;
  name:          string;
  email:         string;
  role:          UserRole;
  avatarUrl?:    string;
  tenantName?:   string;
  tenantLogoUrl?: string;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function storedToUser(s: StoredSession): AuthUser {
  return {
    id:          s.userId,
    email:       s.email,
    name:        s.name,
    avatarUrl:   s.avatarUrl,
    role:        s.role,
    tenantId:    s.tenantId,
    tenantSlug:  s.tenantSlug,
  };
}

class StubAuthService implements IAuthService {
  async getSession(): Promise<AuthSession | null> {
    const stored = readStoredSession();
    if (!stored) return null;
    return { ...MOCK_SESSION, userId: stored.userId };
  }

  async getUser(): Promise<AuthUser | null> {
    const stored = readStoredSession();
    if (!stored) return null;
    return storedToUser(stored);
  }

  async signIn(email: string, password: string, tenantSlug?: string): Promise<AuthResult> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenantSlug }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed.");

    const user: AuthUser = {
      id:         data.user.id,
      email:      data.user.email,
      name:       data.user.name,
      role:       data.user.role,
      avatarUrl:  data.user.avatarUrl,
      tenantId:   data.user.tenantId ?? "",
      tenantSlug: data.tenant?.slug ?? tenantSlug ?? "",
    };

    writeSession({
      userId:        user.id,
      tenantSlug:    user.tenantSlug,
      tenantId:      user.tenantId,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      avatarUrl:     user.avatarUrl,
      tenantName:    data.tenant?.name,
      tenantLogoUrl: data.tenant?.logoUrl,
    });

    return { user, session: { ...MOCK_SESSION, userId: user.id } };
  }

  async signInWithGoogle() { await delay(); return { user: MOCK_USER, session: MOCK_SESSION }; }
  async signInWithPasskey() { await delay(); return { user: MOCK_USER, session: MOCK_SESSION }; }
  async sendMagicLink() { await delay(); }
  async sendPhoneOtp() { await delay(); }
  async verifyPhoneOtp() { await delay(); return { user: MOCK_USER, session: MOCK_SESSION }; }
  async initiateSSO(slug: string) { await delay(); window.location.href = `/${slug}/dashboard`; }

  async signOut(): Promise<void> {
    clearSession();
  }

  async listSessions() { await delay(); return MOCK_SESSIONS; }
  async revokeSession() { await delay(); }
  async revokeAllOtherSessions() { await delay(); }
  async sendPasswordReset() { await delay(); }
  async confirmPasswordReset() { await delay(); }
  async verifyEmail() { await delay(); return { user: MOCK_USER, session: MOCK_SESSION }; }
  async reAuth() { await delay(); }
}

export const authService: IAuthService = new StubAuthService();

/* ─── Helpers ───────────────────────────────────────────────────────────── */

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  service_advisor: "Service Advisor",
  technician: "Technician",
  cashier: "Cashier",
  parts_manager: "Parts Manager",
  receptionist: "Receptionist",
  platform_admin: "Platform Admin",
  platform_support: "Platform Support",
  platform_finance: "Platform Finance",
  platform_readonly: "Platform Readonly",
};

export const ADMIN_ROLES: UserRole[] = ["owner", "admin"];
