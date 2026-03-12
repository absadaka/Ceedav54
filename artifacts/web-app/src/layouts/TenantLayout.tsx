import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  Wrench,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  Building2,
  ShieldCheck,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",  icon: LayoutDashboard },
  { label: "Clients",     href: "/clients",    icon: Users },
  { label: "Bookings",    href: "/bookings",   icon: CalendarCheck },
  { label: "Quotations",  href: "/quotations", icon: FileText },
  { label: "Jobs",        href: "/jobs",       icon: Wrench },
  { label: "Invoices",    href: "/invoices",   icon: Receipt },
];

const settingsNav: NavItem[] = [
  { label: "Team",     href: "/settings/team", icon: Users },
  { label: "Shop",     href: "/settings/shop", icon: Building2 },
  { label: "Security", href: "/account/security", icon: ShieldCheck },
  { label: "Sessions", href: "/account/sessions", icon: Monitor },
];

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

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [location] = useLocation();

  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-60"
      )}
    >
      <div className={cn("flex items-center h-[52px] px-4 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
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
        {mainNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}

        <div className={cn("pt-4 pb-1", collapsed ? "px-1" : "px-1")}>
          {!collapsed && (
            <p className="px-2 text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1">
              Settings
            </p>
          )}
          {collapsed && <div className="border-t border-sidebar-border mb-2" />}
        </div>

        {settingsNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <div className={cn("p-2 border-t border-sidebar-border", collapsed && "flex justify-center")}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-xs"
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

function TopBar({ collapsed }: { collapsed: boolean }) {
  return (
    <header className={cn(
      "h-[52px] flex items-center justify-between px-6 bg-background border-b border-border shrink-0"
    )}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Demo Workshop
        </span>
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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/security">Security</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/sessions">Sessions</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

interface TenantLayoutProps {
  children: React.ReactNode;
}

export default function TenantLayout({ children }: TenantLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar collapsed={collapsed} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
