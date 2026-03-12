import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarCheck, FileText, Wrench, Receipt,
  Settings, ChevronLeft, ChevronRight, Bell, LogOut, Building2,
  ShieldCheck, Monitor, ChevronDown, Laptop2, Shield, Activity, Key,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function buildNav(prefix = ""): {
  main: NavItem[];
  settings: NavItem[];
  admin: NavItem[];
} {
  return {
    main: [
      { label: "Dashboard",  href: `${prefix}/dashboard`,  icon: LayoutDashboard },
      { label: "Clients",    href: `${prefix}/clients`,    icon: Users },
      { label: "Bookings",   href: `${prefix}/bookings`,   icon: CalendarCheck },
      { label: "Quotations", href: `${prefix}/quotations`, icon: FileText },
      { label: "Jobs",       href: `${prefix}/jobs`,       icon: Wrench },
      { label: "Invoices",   href: `${prefix}/invoices`,   icon: Receipt },
    ],
    settings: [
      { label: "Team",     href: `${prefix}/settings/team`,     icon: UsersRound },
      { label: "Shop",     href: `${prefix}/settings/shop`,     icon: Building2 },
      { label: "Security", href: `${prefix}/account/security`,  icon: ShieldCheck },
      { label: "Sessions", href: `${prefix}/account/sessions`,  icon: Monitor },
      { label: "Devices",  href: `${prefix}/account/devices`,   icon: Laptop2 },
    ],
    admin: [
      { label: "Users",    href: `${prefix}/admin/users`,     icon: Users },
      { label: "SSO",      href: `${prefix}/admin/sso`,       icon: Shield },
      { label: "Audit log",href: `${prefix}/admin/audit`,     icon: Activity },
      { label: "API keys", href: `${prefix}/admin/api-keys`,  icon: Key },
    ],
  };
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}

function SidebarLink({ item, collapsed, active }: SidebarLinkProps) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer select-none",
          collapsed ? "justify-center px-2" : "",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  tenantSlug?: string;
  showAdmin?: boolean;
}

function Sidebar({ collapsed, onToggle, tenantSlug, showAdmin = true }: SidebarProps) {
  const [location] = useLocation();
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  const nav = buildNav(prefix);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
      collapsed ? "w-14" : "w-60"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-[52px] px-4 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-[15px] font-semibold text-sidebar-primary-foreground truncate">
            CEEDA
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Main nav */}
        {nav.main.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}

        {/* Settings */}
        <div className={cn("pt-4 pb-1")}>
          {!collapsed && (
            <p className="px-2 text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1">
              Account
            </p>
          )}
          {collapsed && <div className="border-t border-sidebar-border mb-2" />}
        </div>
        {nav.settings.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}

        {/* Admin section */}
        {showAdmin && (
          <>
            <div className={cn("pt-4 pb-1")}>
              {!collapsed && (
                <p className="px-2 text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1">
                  Admin
                </p>
              )}
              {collapsed && <div className="border-t border-sidebar-border mb-2" />}
            </div>
            {nav.admin.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className={cn("p-2 border-t border-sidebar-border", collapsed && "flex justify-center")}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-xs"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          )}
        </button>
      </div>
    </aside>
  );
}

interface TopBarProps {
  tenantName?: string;
  tenantSlug?: string;
}

function TopBar({ tenantName, tenantSlug }: TopBarProps) {
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  return (
    <header className="h-[52px] flex items-center justify-between px-6 bg-background border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground truncate">
          {tenantName ?? "Demo Workshop"}
        </span>
        {tenantSlug && (
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">
            / {tenantSlug}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="w-8 h-8 relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs font-medium bg-primary text-white">DA</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">Demo Admin</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium text-foreground text-sm">Demo Admin</p>
              <p className="text-xs text-muted-foreground">demo@ceeda.io</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/security`}>Security</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/sessions`}>Sessions</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/devices`}>Devices</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <Link href={`${prefix}/logout`}>
                <LogOut className="w-4 h-4 mr-2" />Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────────────── */

interface TenantLayoutProps {
  children: React.ReactNode;
  tenantSlug?: string;
  tenantName?: string;
  showAdmin?: boolean;
}

export default function TenantLayout({
  children,
  tenantSlug,
  tenantName,
  showAdmin = true,
}: TenantLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        tenantSlug={tenantSlug}
        showAdmin={showAdmin}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar tenantName={tenantName} tenantSlug={tenantSlug} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
