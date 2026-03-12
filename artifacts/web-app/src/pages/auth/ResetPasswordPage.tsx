import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: "", color: "bg-border", width: "w-0" };
  if (pw.length < 6) return { label: "Too short", color: "bg-destructive", width: "w-1/4" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0) + (pw.length >= 12 ? 1 : 0);
  if (score <= 1) return { label: "Weak", color: "bg-orange-400", width: "w-2/4" };
  if (score === 2) return { label: "Fair", color: "bg-amber-400", width: "w-3/4" };
  return { label: "Strong", color: "bg-green-500", width: "w-full" };
}

export default function ResetPasswordPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant ?? "";
  const [location] = useLocation();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const strength = strengthLabel(password);

  useEffect(() => {
    resolveTenant(tenantSlug).then(setTenant);
  }, [tenantSlug]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    // Token would come from URL params in production: ?token=...
    await authService.confirmPasswordReset("token_stub", password);
    setLoading(false);
    setDone(true);
  };

  return (
    <TenantAuthShell tenant={tenant} backToLogin>
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-base font-semibold text-foreground mb-2">Password updated</p>
          <p className="text-sm text-muted-foreground mb-5">You can now sign in with your new password.</p>
          <Button className="gap-2" onClick={() => window.location.href = `/${tenantSlug}/login`}>
            Go to sign in <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Set a new password</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Choose a strong password for your account.</p>
          </div>
          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="new-pw" type={showPw ? "text" : "password"} className="pl-9 pr-10"
                  placeholder="Min. 8 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" required minLength={8} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-300", strength.color, strength.width)} />
                  </div>
                  <p className="text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="confirm-pw" type="password" className="pl-9"
                  placeholder="Repeat new password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password" required />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2 shadow-sm" disabled={loading}>
              {loading ? "Updating…" : "Set new password"} {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </TenantAuthShell>
  );
}
