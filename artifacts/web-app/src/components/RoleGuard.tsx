import { type ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/auth";
import type { ModuleKey } from "@/lib/permissions";

interface RoleGuardProps {
  roles?: UserRole[];
  module?: ModuleKey;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RoleGuard({ roles, module, fallback, children }: RoleGuardProps) {
  const { user, can, hasRole } = useAuth();

  const allowed = roles
    ? hasRole(...roles)
    : module
    ? can(module)
    : !!user;

  if (!allowed) {
    return fallback !== undefined ? <>{fallback}</> : (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <ShieldOff className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-semibold text-foreground">Access restricted</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          You don't have permission to view this section. Contact your account owner.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
