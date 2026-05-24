/**
 * Shared full-screen split layout for all tenant-scoped auth pages.
 * Left panel: form content. Right panel: automotive image carousel.
 */

import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import AuthImageCarousel from "@/components/AuthImageCarousel";
import type { TenantInfo } from "@/lib/tenant";
import { tenantInitials } from "@/lib/tenant";

interface TenantAuthShellProps {
  tenant: TenantInfo | null;
  children: React.ReactNode;
  /** Show a back link to the tenant's login page instead of ceeda.me */
  backToLogin?: boolean;
  className?: string;
}

function TenantBrand({ tenant }: { tenant: TenantInfo }) {
  const initials = tenantInitials(tenant.name);
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
        style={{ backgroundColor: tenant.primaryColor ?? "hsl(239 84% 67%)" }}
      >
        {tenant.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-contain rounded-2xl" />
        ) : (
          initials
        )}
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground leading-tight">{tenant.name}</p>
      </div>
    </div>
  );
}

function TenantSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" />
      <div className="w-32 h-4 bg-muted rounded animate-pulse" />
    </div>
  );
}

export default function TenantAuthShell({
  tenant,
  children,
  backToLogin = false,
  className,
}: TenantAuthShellProps) {
  const backHref = tenant
    ? backToLogin
      ? `/${tenant.slug}/login`
      : "/"
    : "/";
  const backLabel = backToLogin ? "Back to sign in" : "Back to ceeda.me";

  return (
    <div className={cn("h-screen flex overflow-hidden", className)}>
      {/* ─── Left panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-[360px]">
            {/* Back link + CEEDA watermark */}
            <div className="flex items-center justify-between mb-8">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Link>
              <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 16, fontWeight: 700, lineHeight: 1, opacity: 0.4 }}>
                <span style={{ color: "#0a0a0a" }}>ceeda</span>
                <span style={{ color: "#0a0a0a", fontSize: "1.4em", lineHeight: 0.8, position: "relative", top: "0.18em" }}>»</span>
              </span>
            </div>

            {/* Tenant brand */}
            {tenant === null ? (
              <TenantSkeleton />
            ) : (
              <TenantBrand tenant={tenant} />
            )}

            {/* Form content */}
            {children}
          </div>
        </div>

        <div className="text-center pb-6 px-6">
          <p className="text-xs text-muted-foreground">
            Secured by{" "}
            <Link href="/" className="font-medium hover:underline" style={{ fontFamily: "'Dubai', sans-serif", fontWeight: 700 }}>
              ceeda<span style={{ fontSize: "1.4em", lineHeight: 0.8, position: "relative", top: "0.18em" }}>»</span>
            </Link>{" "}
            · <Link href="#privacy" className="hover:underline">Privacy</Link>
            {" "}· <Link href="#terms" className="hover:underline">Terms</Link>
          </p>
        </div>
      </div>

      {/* ─── Right panel ────────────────────────────── */}
      <div className="hidden lg:block lg:w-[480px] xl:w-[540px] shrink-0">
        <AuthImageCarousel className="h-full" />
      </div>
    </div>
  );
}
