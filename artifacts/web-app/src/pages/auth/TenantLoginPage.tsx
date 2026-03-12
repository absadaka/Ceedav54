import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Smartphone,
  Fingerprint, Building2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";
import type { AuthMethod } from "@/lib/auth";

/* ─── Small components ────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

type SignInMode = "password" | "magic" | "phone";

function ModeTab({
  id, label, active, onClick,
}: { id: SignInMode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
        active
          ? "bg-white text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/* ─── Password form ───────────────────────────────────────────────────────── */
function PasswordForm({ tenant, onSuccess }: { tenant: TenantInfo; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.signIn(email, password, tenant.slug);
      onSuccess();
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input id="email" type="email" className="pl-9" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href={`/${tenant.slug}/forgot-password`} className="text-xs text-primary hover:underline">
            Forgot?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input id="password" type={showPw ? "text" : "password"} className="pl-9 pr-10"
            placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-md">{error}</p>}
      <Button type="submit" className="w-full gap-2 shadow-sm" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"} {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}

/* ─── Magic link form ─────────────────────────────────────────────────────── */
function MagicLinkForm({ tenant }: { tenant: TenantInfo }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.sendMagicLink(email, tenant.slug);
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1.5">Check your inbox</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
        </p>
        <button onClick={() => setSent(false)} className="text-xs text-primary hover:underline mt-4">
          Send again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <p className="text-xs text-muted-foreground">Enter your email to receive a one-click sign-in link. No password needed.</p>
      <div className="space-y-1.5">
        <Label htmlFor="magic-email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input id="magic-email" type="email" className="pl-9" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
      </div>
      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading ? "Sending…" : "Email me a sign-in link"} {!loading && <Mail className="w-4 h-4" />}
      </Button>
    </form>
  );
}

/* ─── Phone OTP form ──────────────────────────────────────────────────────── */
function PhoneOtpForm({ tenant, onSuccess }: { tenant: TenantInfo; onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.sendPhoneOtp(phone);
    setLoading(false);
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.verifyPhoneOtp(phone, code, tenant.slug);
    setLoading(false);
    onSuccess();
  };

  return step === "phone" ? (
    <form onSubmit={sendCode} className="space-y-4">
      <p className="text-xs text-muted-foreground">Enter your phone number to receive a one-time code.</p>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <div className="relative">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input id="phone" type="tel" className="pl-9" placeholder="+971 50 XXX XXXX"
            value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
        </div>
      </div>
      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading ? "Sending…" : "Send code"} {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium">{phone}</span>.{" "}
        <button type="button" onClick={() => setStep("phone")} className="text-primary hover:underline">Change</button>
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="otp">Verification code</Label>
        <Input id="otp" type="text" inputMode="numeric" maxLength={6} className="text-center text-lg tracking-[0.4em] font-mono"
          placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={loading || code.length < 6}>
        {loading ? "Verifying…" : "Verify & sign in"} {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function TenantLoginPage() {
  const params = useParams<{ tenant: string }>();
  const [, navigate] = useLocation();
  const tenantSlug = params.tenant ?? "";

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [mode, setMode] = useState<SignInMode>("password");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveTenant(tenantSlug).then((t) => {
      setTenant(t);
      setLoading(false);
    });
  }, [tenantSlug]);

  const onSuccess = () => navigate("/dashboard");

  const hasMethod = (m: AuthMethod) =>
    !tenant || tenant.allowedAuthMethods.includes(m);

  const showModeTabs = hasMethod("magic_link") || hasMethod("phone_otp");

  return (
    <TenantAuthShell tenant={tenant}>
      {loading ? (
        <div className="space-y-3">
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to{" "}
              <span className="font-medium text-foreground">{tenant?.name}</span>
            </p>
          </div>

          {/* Google */}
          {hasMethod("google") && (
            <Button variant="outline" className="w-full gap-2.5 mb-4 h-10" type="button"
              onClick={() => authService.signInWithGoogle(tenantSlug)}>
              <GoogleIcon /> Continue with Google
            </Button>
          )}

          {/* SSO */}
          {hasMethod("sso") && tenant?.ssoEnabled && (
            <Button variant="outline" className="w-full gap-2.5 mb-4 h-10" type="button"
              onClick={() => authService.initiateSSO(tenantSlug)}>
              <Building2 className="w-4 h-4 text-muted-foreground" />
              {tenant.ssoProviderName ? `Continue with ${tenant.ssoProviderName}` : "Continue with SSO"}
            </Button>
          )}

          {(hasMethod("google") || (hasMethod("sso") && tenant?.ssoEnabled)) && (
            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>
          )}

          {/* Mode tabs */}
          {showModeTabs && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mb-5">
              <ModeTab id="password" label="Password" active={mode === "password"} onClick={() => setMode("password")} />
              {hasMethod("magic_link") && (
                <ModeTab id="magic" label="Magic link" active={mode === "magic"} onClick={() => setMode("magic")} />
              )}
              {hasMethod("phone_otp") && (
                <ModeTab id="phone" label="Phone" active={mode === "phone"} onClick={() => setMode("phone")} />
              )}
            </div>
          )}

          {mode === "password" && <PasswordForm tenant={tenant!} onSuccess={onSuccess} />}
          {mode === "magic" && <MagicLinkForm tenant={tenant!} />}
          {mode === "phone" && <PhoneOtpForm tenant={tenant!} onSuccess={onSuccess} />}

          {/* Passkey */}
          {hasMethod("passkey") && mode === "password" && (
            <div className="mt-4">
              <button type="button"
                onClick={() => authService.signInWithPasskey("")}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-border/80 transition-colors">
                <Fingerprint className="w-4 h-4" />
                Use a passkey instead
                <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-muted rounded font-medium">Beta</span>
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing in you agree to{" "}
            <Link href="/" className="hover:underline">{tenant?.name}</Link>'s policies.
          </p>
        </div>
      )}
    </TenantAuthShell>
  );
}
