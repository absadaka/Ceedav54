import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarCheck, FileText, Wrench, Receipt,
  Settings, Bell, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  UsersRound, Building2, ShieldCheck, Monitor, Laptop2,
  Menu, X, Search, Sun, Moon, ClipboardList,
} from "lucide-react";

function useSidebarTheme() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("workspace-sidebar") === "dark"
  );
  const toggle = () => setDark((v) => {
    const next = !v;
    localStorage.setItem("workspace-sidebar", next ? "dark" : "light");
    return next;
  });
  return { dark, toggle };
}
import { cn } from "@/lib/utils";
import { Logo } from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import { useAuth } from "@/hooks/useAuth";

/* ─── Nav definition ─────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: Omit<NavItem, "children">[];
}

function buildNav(tenantSlug?: string): {
  main: NavItem[];
  workspace: NavItem[];
  admin: NavItem[];
} {
  const q = tenantSlug ? `?tenant=${tenantSlug}` : "";
  return {
    main: [
      { label: "Dashboard",  href: `/dashboard${q}`,  icon: LayoutDashboard },
      { label: "Customers",  href: `/customers${q}`,  icon: Users },
      { label: "Bookings",   href: `/bookings${q}`,   icon: CalendarCheck },
      { label: "Quotations", href: `/quotations${q}`, icon: FileText },
      {
        label: "Jobs", href: `/jobs${q}`, icon: Wrench,
        children: [
          { label: "Services",    href: `/jobs${q}&job_type=service`,    icon: Wrench },
          { label: "Inspections", href: `/jobs${q}&job_type=inspection`, icon: ClipboardList },
        ],
      },
      { label: "Invoices",   href: `/invoices${q}`,   icon: Receipt },
    ],
    workspace: [
      { label: "Team",     href: `/team${q}`,     icon: UsersRound },
      { label: "Settings", href: `/settings${q}`, icon: Settings },
    ],
    admin: [],
  };
}

/* ─── Sidebar link ───────────────────────────────────────────────────────── */

function SidebarLink({
  item,
  collapsed,
  active,
  childActive,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  childActive?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const inner = (
    <Link href={item.href}>
      <span
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg text-[15px] font-normal transition-colors cursor-pointer select-none",
          collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : childActive
            ? "text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
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

function SidebarSubLink({
  item,
  active,
  onClick,
}: {
  item: Omit<NavItem, "children">;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}>
      <span
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-[13px] font-normal transition-colors cursor-pointer select-none pl-8 pr-3 py-1.5",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate leading-none">{item.label}</span>
      </span>
    </Link>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

function Sidebar({
  collapsed,
  onToggle,
  tenantSlug,
  showAdmin,
  onNavClick,
  dark,
  onThemeToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tenantSlug?: string;
  showAdmin?: boolean;
  onNavClick?: () => void;
  dark: boolean;
  onThemeToggle: () => void;
}) {
  const [location] = useLocation();
  const nav = buildNav(tenantSlug);

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split("?");
    const pathMatch = hrefPath === "/dashboard"
      ? location === hrefPath
      : location === hrefPath || location.startsWith(hrefPath + "/");
    if (!pathMatch) return false;
    if (!hrefQuery) return true;
    // For links with query params (sub-nav), match specific params against the current URL
    const hrefParams = new URLSearchParams(hrefQuery);
    const curParams  = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const typeParam = hrefParams.get("job_type");
    if (typeParam) return curParams.get("job_type") === typeParam;
    return true;
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-[width] duration-200 shrink-0 overflow-hidden",
        collapsed ? "w-14" : "w-[220px]",
        dark && "sidebar-dark",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-[52px] shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-4 gap-2.5"
        )}
      >
        {collapsed ? (
          <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 18, fontWeight: 700, lineHeight: 1, color: dark ? "#ffffff" : "#0a0a0a" }}>c&gt;</span>
        ) : (
          <Logo size="sm" light={dark} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {/* Main */}
        {nav.main.map((item) => {
          const itemActive = isActive(item.href);
          const anyChildActive = item.children?.some(c => isActive(c.href)) ?? false;
          return (
            <div key={item.href}>
              <SidebarLink
                item={item}
                collapsed={collapsed}
                active={itemActive}
                childActive={anyChildActive}
                onClick={onNavClick}
              />
              {/* Sub-items — only when sidebar is expanded and this item has children */}
              {!collapsed && item.children && (
                <div className="mt-0.5 mb-0.5 space-y-0.5">
                  {item.children.map(child => (
                    <SidebarSubLink
                      key={child.href}
                      item={child}
                      active={isActive(child.href)}
                      onClick={onNavClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Workspace divider */}
        <div className={cn("pt-4 pb-1")}>
          {collapsed
            ? <div className="border-t border-sidebar-border mx-1" />
            : <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Workspace</p>
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
        {showAdmin && nav.admin.length > 0 && (
          <>
            <div className={cn("pt-4 pb-1")}>
              {collapsed
                ? <div className="border-t border-sidebar-border mx-1" />
                : <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Admin</p>
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

      {/* Sign out */}
      <div className="shrink-0 px-2 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/${tenantSlug ?? ""}/logout`}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg text-[15px] font-normal transition-colors cursor-pointer select-none w-full",
                  collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                  "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate leading-none">Sign out</span>}
              </span>
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
        </Tooltip>
      </div>

      {/* Desktop bottom strip — theme toggle + collapse */}
      <div className="shrink-0 p-2 border-t border-sidebar-border hidden md:flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="flex items-center justify-center w-7 h-7 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40 transition-colors shrink-0"
          aria-label={dark ? "Switch to light sidebar" : "Switch to dark sidebar"}
        >
          {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 h-7 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40 transition-colors text-xs px-2 flex-1",
            collapsed ? "justify-center" : ""
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
  tenantLogoUrl,
  tenantSlug,
  onMobileMenuToggle,
  onSearchOpen,
}: {
  tenantName?: string;
  tenantLogoUrl?: string;
  tenantSlug?: string;
  onMobileMenuToggle: () => void;
  onSearchOpen: () => void;
}) {
  const { user } = useAuth();
  const shopName = tenantName ?? user?.tenantName ?? "My Workshop";
  const shopInitials = initials(shopName);
  const logoUrl = tenantLogoUrl ?? user?.tenantLogoUrl;
  const userName = user?.name ?? "User";
  const userEmail = user?.email ?? "";
  const userInitials = initials(userName);
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
            {logoUrl && <img src={logoUrl} alt={shopName} className="w-full h-full object-cover rounded-md" />}
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
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal py-2">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
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
  tenantLogoUrl?: string;
  showAdmin?: boolean;
}

export default function TenantLayout({
  children,
  tenantSlug,
  tenantName,
  tenantLogoUrl,
  showAdmin,
}: TenantLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const { isManager } = useAuth();
  const adminVisible = showAdmin !== undefined ? showAdmin : isManager;
  const { dark: sidebarDark, toggle: toggleSidebar } = useSidebarTheme();

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
          showAdmin={adminVisible}
          dark={sidebarDark}
          onThemeToggle={toggleSidebar}
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
              <div className="flex items-center">
                <Logo size="sm" />
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
              showAdmin={adminVisible}
              onNavClick={() => setMobileOpen(false)}
              dark={sidebarDark}
              onThemeToggle={toggleSidebar}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          tenantName={tenantName}
          tenantLogoUrl={tenantLogoUrl}
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
