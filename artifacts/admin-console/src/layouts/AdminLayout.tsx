import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, CreditCard, Flag, UserSearch,
  ChevronLeft, ChevronRight, Bell, LogOut, ChevronDown,
  AlertTriangle, Activity, LifeBuoy, Sun, Moon,
  Package, Tag, FileText, AlertCircle, Shield, Puzzle,
  BarChart3, UserMinus, Settings, Users, Wrench,
} from "lucide-react";

function useSidebarTheme() {
  const [light, setLight] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("admin-sidebar") === "light"
  );
  const toggle = () => setLight((v) => {
    const next = !v;
    localStorage.setItem("admin-sidebar", next ? "light" : "dark");
    return next;
  });
  return { light, toggle };
}
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type PlatformRole = "platform_admin" | "platform_support" | "platform_finance" | "platform_readonly";

const ALL_ROLES: PlatformRole[] = ["platform_admin", "platform_support", "platform_finance", "platform_readonly"];
const ADMIN_ONLY: PlatformRole[] = ["platform_admin"];
const SUPPORT_ROLES: PlatformRole[] = ["platform_admin", "platform_support"];
const FINANCE_ROLES: PlatformRole[] = ["platform_admin", "platform_finance"];
const NON_SUPPORT: PlatformRole[] = ["platform_admin", "platform_finance", "platform_readonly"];

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: PlatformRole[];
  children?: NavItem[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    items: [
      { label: "Dashboard",     href: "/dashboard",   icon: LayoutDashboard, roles: ALL_ROLES },
      { label: "Tenants",       href: "/tenants",     icon: Building2,       roles: [...SUPPORT_ROLES, "platform_readonly"] },
      { label: "Billing",       href: "/billing",     icon: CreditCard,      roles: [...FINANCE_ROLES, "platform_readonly"] },
      { label: "Feature Flags", href: "/flags",       icon: Flag,            roles: ADMIN_ONLY },
      {
        label: "Subscriptions",
        href: "/subscriptions/plans",
        icon: CreditCard,
        roles: FINANCE_ROLES,
        children: [
          { label: "Plans",            href: "/subscriptions/plans",     icon: Package },
          { label: "Coupons",          href: "/subscriptions/coupons",   icon: Tag },
          { label: "Invoices",         href: "/subscriptions/invoices",  icon: FileText },
          { label: "Failed Payments",  href: "/subscriptions/failed",   icon: AlertCircle },
          { label: "Plan Override",    href: "/subscriptions/override", icon: Shield },
          { label: "Add-Ons",          href: "/subscriptions/addons",   icon: Puzzle },
          { label: "Revenue",          href: "/subscriptions/revenue",  icon: BarChart3 },
          { label: "Churn & Renewals", href: "/subscriptions/churn",    icon: UserMinus },
        ],
      },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Impersonate",   href: "/impersonate", icon: UserSearch, roles: SUPPORT_ROLES },
      { label: "Tickets",       href: "/tickets",     icon: LifeBuoy,   roles: [...SUPPORT_ROLES, "platform_readonly"] },
      { label: "System Health", href: "/health",      icon: Activity,   roles: [...SUPPORT_ROLES, "platform_readonly"] },
    ],
  },
  {
    items: [
      {
        label: "Settings",
        href: "/settings/general",
        icon: Settings,
        roles: ADMIN_ONLY,
        children: [
          { label: "General",     href: "/settings/general", icon: Wrench },
          { label: "Admin Users", href: "/settings/users",   icon: Users },
        ],
      },
    ],
  },
];

function filterByRole(sections: NavSection[], role: string): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role as PlatformRole)),
    }))
    .filter((section) => section.items.length > 0);
}

export const ROUTE_ROLES: Record<string, PlatformRole[]> = {
  "/dashboard":              ALL_ROLES,
  "/tenants":                [...SUPPORT_ROLES, "platform_readonly"],
  "/billing":                [...FINANCE_ROLES, "platform_readonly"],
  "/flags":                  ADMIN_ONLY,
  "/subscriptions/plans":    FINANCE_ROLES,
  "/subscriptions/coupons":  FINANCE_ROLES,
  "/subscriptions/invoices": FINANCE_ROLES,
  "/subscriptions/failed":   FINANCE_ROLES,
  "/subscriptions/override": FINANCE_ROLES,
  "/subscriptions/addons":   FINANCE_ROLES,
  "/subscriptions/revenue":  FINANCE_ROLES,
  "/subscriptions/churn":    FINANCE_ROLES,
  "/impersonate":            SUPPORT_ROLES,
  "/tickets":                [...SUPPORT_ROLES, "platform_readonly"],
  "/health":                 [...SUPPORT_ROLES, "platform_readonly"],
  "/settings/general":       ADMIN_ONLY,
  "/settings/users":         ADMIN_ONLY,
};

function SidebarLink({ item, collapsed, active }: {
  item: NavItem; collapsed: boolean; active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer select-none",
          collapsed ? "justify-center px-2" : "",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
    </Link>
  );
}

function CollapsibleNavItem({ item, collapsed, location }: {
  item: NavItem; collapsed: boolean; location: string;
}) {
  const Icon = item.icon;
  const isChildActive = item.children?.some(c => location === c.href || location.startsWith(c.href + "/")) ?? false;
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  if (collapsed) {
    return (
      <Link href={item.href}>
        <span
          className={cn(
            "flex items-center justify-center px-2 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer select-none",
            isChildActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          title={item.label}
        >
          <Icon className="w-5 h-5 shrink-0" />
        </span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer select-none",
          isChildActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border/30 space-y-0.5">
          {item.children?.map(child => {
            const ChildIcon = child.icon;
            const childActive = location === child.href || location.startsWith(child.href + "/");
            return (
              <Link key={child.href} href={child.href}>
                <span
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer select-none",
                    childActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminSidebar({ collapsed, onToggle, light }: { collapsed: boolean; onToggle: () => void; light: boolean }) {
  const [location] = useLocation();
  const { user } = useAdminAuth();
  const isActive = (href: string) => location === href || (href !== "/dashboard" && location.startsWith(href));
  const visibleSections = filterByRole(adminSections, user?.role ?? "");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-60",
        light && "sidebar-light",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-[72px] px-4 border-b border-sidebar-border gap-2.5",
        collapsed && "justify-center px-2",
      )}>
        {collapsed ? (
          <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
            <span style={{ color: light ? "#0a0a0a" : "#ffffff" }}>c</span>
            <span style={{ color: light ? "#0a0a0a" : "#ffffff" }}>»</span>
          </span>
        ) : (
          <div className="flex flex-col min-w-0">
            <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
              <span style={{ color: light ? "#0a0a0a" : "#ffffff" }}>ceeda</span>
              <span style={{ color: light ? "#0a0a0a" : "#ffffff", marginLeft: 1 }}>»</span>
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">Platform Admin</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-4">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && !collapsed && (
              <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 py-1">
                {section.title}
              </p>
            )}
            {section.items.map((item) =>
              item.children ? (
                <CollapsibleNavItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  location={location}
                />
              ) : (
                <SidebarLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.href)}
                />
              )
            )}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className={cn("p-2 border-t border-sidebar-border", collapsed && "flex justify-center")}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-xs"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function AdminTopBar({ sidebarLight, onToggleTheme }: { sidebarLight: boolean; onToggleTheme: () => void }) {
  const { user, logout } = useAdminAuth();
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "SA";
  const displayName = user?.name ?? "Admin";
  const [, navigate] = useLocation();
  const { data: notif } = useQuery<{ open: number; in_progress: number; waiting: number; unread: number }>({
    queryKey: ["admin-support-notifications"],
    queryFn: () => fetch("/api/admin/support/notifications", {
      headers: user ? { "X-Admin-Id": user.id } : {},
    }).then((r) => (r.ok ? r.json() : { unread: 0, open: 0, in_progress: 0, waiting: 0 })),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = notif?.unread ?? 0;

  return (
    <header className="h-[72px] flex items-center justify-between px-6 bg-background border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Internal Admin
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label={sidebarLight ? "Switch to dark sidebar" : "Switch to light sidebar"}
          onClick={onToggleTheme}
        >
          {sidebarLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 relative"
          aria-label={unread > 0 ? `${unread} new support tickets` : "Notifications"}
          onClick={() => navigate("/tickets")}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs font-medium bg-primary text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">{displayName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>{user?.email ?? "Admin"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { light, toggle } = useSidebarTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} light={light} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminTopBar sidebarLight={light} onToggleTheme={toggle} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
