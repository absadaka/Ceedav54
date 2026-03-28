import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Mail, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";

type Status = "verifying" | "success" | "error" | "resent";

export default function VerifyEmailPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant ?? "";

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [status, setStatus] = useState<Status>("verifying");
  const [email, setEmail] = useState("demo@ceeda.me");

  useEffect(() => {
    resolveTenant(tenantSlug).then(setTenant);
    // Auto-verify from token in URL
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      authService.verifyEmail(token)
        .then(() => setStatus("success"))
        .catch(() => setStatus("error"));
    } else {
      // No token — show "check your email" state
      setStatus("resent");
    }
  }, [tenantSlug]);

  const resend = async () => {
    await authService.sendMagicLink(email, tenantSlug);
    setStatus("resent");
  };

  return (
    <TenantAuthShell tenant={tenant} backToLogin>
      <div className="text-center py-4">
        {status === "verifying" && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-base font-semibold text-foreground mb-1">Verifying your email…</p>
            <p className="text-sm text-muted-foreground">Just a moment</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-base font-semibold text-foreground mb-2">Email verified</p>
            <p className="text-sm text-muted-foreground mb-5">Your email has been confirmed. You can now sign in.</p>
            <Button onClick={() => window.location.href = `/${tenantSlug}/login`} className="gap-2">
              Go to sign in
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-base font-semibold text-foreground mb-2">Link expired or invalid</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              This verification link has expired or already been used. Request a new one.
            </p>
            <Button variant="outline" onClick={resend} className="gap-2">
              <Mail className="w-4 h-4" /> Resend verification email
            </Button>
          </>
        )}
        {status === "resent" && (
          <>
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-base font-semibold text-foreground mb-2">Check your inbox</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1">
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Didn't get it?{" "}
              <button onClick={resend} className="text-primary hover:underline">
                Resend
              </button>
            </p>
          </>
        )}
      </div>
    </TenantAuthShell>
  );
}
