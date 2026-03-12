import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarCheck, FileText, Wrench, Receipt,
  Settings, Bell, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  UsersRound, Building2, ShieldCheck, Monitor, Laptop2, Shield,
  Activity, Key, Menu, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";

/* ─── Nav definition ─────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function buildNav(prefix = ""): {
  main: NavItem[];
  workspace: NavItem[];
  admin: NavItem[];
} {
  return {
    main: [
      { label: "Dashboard",  href: `${prefix}/dashboard`,  icon: LayoutDashboard },
      { label: "Customers",  href: `${prefix}/customers`,  icon: Users },
      { label: "Bookings",   href: `${prefix}/bookings`,   icon: CalendarCheck },
      { label: "Quotations", href: `${prefix}/quotations`, icon: FileText },
      { label: "Jobs",       href: `${prefix}/jobs`,       icon: Wrench },
      { label: "Invoices",   href: `${prefix}/invoices`,   icon: Receipt },
    ],
    workspace: [
      { label: "Team",     href: `${prefix}/team`,     icon: UsersRound },
      { label: "Settings", href: `${prefix}/settings`, icon: Settings },
    ],
    admin: [
      { label: "Users",     href: `${prefix}/admin/users`,     icon: Users },
      { label: "SSO",       href: `${prefix}/admin/sso`,       icon: Shield },
      { label: "Audit log", href: `${prefix}/admin/audit`,     icon: Activity },
      { label: "API keys",  href: `${prefix}/admin/api-keys`,  icon: Key },
    ],
  };
}

/* ─── Sidebar link ───────────────────────────────────────────────────────── */

function SidebarLink({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <Link href={item.href}>
      <span
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-md text-sm font-medium transition-colors cursor-pointer select-none",
          collapsed ? "px-2 py-2 justify-center" : "px-3 py-2",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {!collapsed && <span className="truncate leading-none">{item.label}</span>}
      </span>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

function Sidebar({
  collapsed,
  onToggle,
  tenantSlug,
  showAdmin,
  onNavClick,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tenantSlug?: string;
  showAdmin?: boolean;
  onNavClick?: () => void;
}) {
  const [location] = useLocation();
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  const nav = buildNav(prefix);

  function isActive(href: string) {
    if (href === `${prefix}/dashboard`) return location === href;
    return location === href || location.startsWith(href + "/");
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-[width] duration-200 shrink-0 overflow-hidden",
        collapsed ? "w-14" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-[52px] shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-4 gap-2.5"
        )}
      >
        <div className="w-7 h-7 rounded-[6px] bg-primary flex items-center justify-center shrink-0">
          <Wrench className="w-[14px] h-[14px] text-white" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold text-sidebar-primary-foreground tracking-tight">
            CEEDA
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {/* Main */}
        {nav.main.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
            onClick={onNavClick}
          />
        ))}

        {/* Workspace divider */}
        <div className={cn("pt-4 pb-1")}>
          {collapsed
            ? <div className="border-t border-sidebar-border mx-1" />
            : <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Workspace</p>
          }
        </div>
        {nav.workspace.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
            onClick={onNavClick}
          />
        ))}

        {/* Admin */}
        {showAdmin && (
          <>
            <div className={cn("pt-4 pb-1")}>
              {collapsed
                ? <div className="border-t border-sidebar-border mx-1" />
                : <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Admin</p>
              }
            </div>
            {nav.admin.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(item.href)}
                onClick={onNavClick}
              />
            ))}
          </>
        )}
      </nav>

      {/* Desktop collapse toggle */}
      <div className="shrink-0 p-2 border-t border-sidebar-border hidden md:flex justify-center">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 h-7 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40 transition-colors text-xs px-2",
            collapsed ? "w-9 justify-center" : "w-full"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}

/* ─── Top bar ────────────────────────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TopBar({
  tenantName,
  tenantSlug,
  onMobileMenuToggle,
  onSearchOpen,
}: {
  tenantName?: string;
  tenantSlug?: string;
  onMobileMenuToggle: () => void;
  onSearchOpen: () => void;
}) {
  const shopName = tenantName ?? "Demo Workshop";
  const shopInitials = initials(shopName);
  const prefix = tenantSlug ? `/${tenantSlug}` : "";

  return (
    <header className="h-[52px] flex items-center justify-between px-4 bg-background border-b border-border shrink-0 gap-3">
      {/* Left: mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center: command search trigger */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-1 max-w-xs min-w-0"
        aria-label="Open search"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate hidden sm:block">Search…</span>
        <span className="ml-auto shrink-0 hidden sm:flex items-center gap-0.5">
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </span>
      </button>

      {/* Right: shop logo, notifications, user menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Shop avatar */}
        <div className="flex items-center gap-2 mr-1">
          <Avatar className="w-7 h-7 rounded-md">
            <AvatarFallback className="rounded-md text-[10px] font-bold bg-muted text-muted-foreground tracking-tight">
              {shopInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground hidden lg:block truncate max-w-[140px]">
            {shopName}
          </span>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 relative text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell className="w-[17px] h-[17px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
                  DA
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal py-2">
              <p className="text-sm font-semibold text-foreground">Demo Admin</p>
              <p className="text-xs text-muted-foreground mt-0.5">demo@ceeda.io</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/security`}>
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/sessions`}>
                <Monitor className="w-3.5 h-3.5 mr-2" />Sessions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${prefix}/account/devices`}>
                <Laptop2 className="w-3.5 h-3.5 mr-2" />Devices
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
              <Link href={`${prefix}/logout`}>
                <LogOut className="w-3.5 h-3.5 mr-2" />Sign out
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  /* Close mobile drawer on resize to desktop */
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          tenantSlug={tenantSlug}
          showAdmin={showAdmin}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-[220px] shadow-2xl flex flex-col">
            {/* Close button row */}
            <div className="flex items-center justify-between h-[52px] px-4 bg-sidebar border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-primary flex items-center justify-center shrink-0">
                  <Wrench className="w-[14px] h-[14px] text-white" />
                </div>
                <span className="text-[15px] font-semibold text-sidebar-primary-foreground">CEEDA</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar
              collapsed={false}
              onToggle={() => {}}
              tenantSlug={tenantSlug}
              showAdmin={showAdmin}
              onNavClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          onSearchOpen={() => setCmdOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-6">{children}</div>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
