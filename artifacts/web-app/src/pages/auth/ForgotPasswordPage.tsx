import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant ?? "";

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    resolveTenant(tenantSlug).then(setTenant);
  }, [tenantSlug]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await authService.sendPasswordReset(email, tenantSlug);
    setLoading(false);
    setSent(true);
  };

  return (
    <TenantAuthShell tenant={tenant} backToLogin>
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-base font-semibold text-foreground mb-2">Check your email</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-1">
            If <span className="font-medium text-foreground">{email}</span> is registered, you'll receive a reset link shortly.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Didn't get it?{" "}
            <button onClick={() => setSent(false)} className="text-primary hover:underline">
              Try again
            </button>
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Enter the email address associated with your account and we'll send you a secure reset link.
            </p>
          </div>
          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input id="reset-email" type="email" className="pl-9" placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2 shadow-sm" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"} {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </TenantAuthShell>
  );
}
