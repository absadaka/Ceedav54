import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TenantAuthShell from "./TenantAuthShell";
import { resolveTenant, type TenantInfo } from "@/lib/tenant";
import { authService } from "@/lib/auth";

export default function LogoutPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant ?? "";

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    resolveTenant(tenantSlug).then(setTenant);
    authService.signOut().then(() => setDone(true));
  }, [tenantSlug]);

  return (
    <TenantAuthShell tenant={tenant}>
      <div className="text-center py-8">
        {!done ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-base font-semibold text-foreground">Signing you out…</p>
            <p className="text-sm text-muted-foreground mt-1">Please wait a moment.</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">You've been signed out</p>
            <p className="text-sm text-muted-foreground mb-6">
              Your session has been ended securely.
            </p>
            <Button onClick={() => window.location.href = `/${tenantSlug}/login`} className="gap-2">
              Sign back in
            </Button>
          </>
        )}
      </div>
    </TenantAuthShell>
  );
}
