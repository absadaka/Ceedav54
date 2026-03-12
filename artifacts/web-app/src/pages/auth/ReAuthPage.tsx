import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";

export default function ReAuthPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant ?? "";
  const [, navigate] = useLocation();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = new URLSearchParams(window.location.search).get("next") ?? `/${tenantSlug}/account/security`;

  useEffect(() => {
    resolveTenant(tenantSlug).then(setTenant);
  }, [tenantSlug]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.reAuth(password);
      navigate(next);
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TenantAuthShell tenant={tenant} backToLogin>
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Confirm your identity</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              For your security, re-enter your password to continue.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-5">
          <p className="text-xs text-amber-800 leading-relaxed">
            You're about to access a sensitive area. This re-authentication session expires in 10 minutes.
          </p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reauth-pw">Your password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input id="reauth-pw" type={showPw ? "text" : "password"} className="pl-9 pr-10"
                placeholder="Your current password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoFocus autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full gap-2 shadow-sm" disabled={loading}>
            {loading ? "Verifying…" : "Confirm identity"} {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </TenantAuthShell>
  );
}
