import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, CreditCard, Flag, UserSearch,
  ChevronLeft, ChevronRight, Bell, LogOut, ChevronDown,
  AlertTriangle, Activity, LifeBuoy, Sun, Moon,
} from "lucide-react";

function useTheme() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("admin-theme") === "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("admin-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((v) => !v) };
}
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

interface NavSection {
  title?: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    items: [
      { label: "Dashboard",     href: "/dashboard",   icon: LayoutDashboard },
      { label: "Tenants",       href: "/tenants",     icon: Building2 },
      { label: "Billing",       href: "/billing",     icon: CreditCard },
      { label: "Feature Flags", href: "/flags",       icon: Flag },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Impersonate",   href: "/impersonate", icon: UserSearch },
      { label: "Tickets",       href: "/tickets",     icon: LifeBuoy },
      { label: "System Health", href: "/health",      icon: Activity },
    ],
  },
];

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

function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const isActive = (href: string) => location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-[72px] px-4 border-b border-sidebar-border gap-2.5",
        collapsed && "justify-center px-2",
      )}>
        {collapsed ? (
          <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>c&gt;</span>
        ) : (
          <div className="flex flex-col min-w-0">
            <span style={{ fontFamily: "'Dubai', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: "#ffffff" }}>ceeda&gt;</span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">Platform Admin</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-4">
        {adminSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && !collapsed && (
              <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 py-1">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(item.href)}
              />
            ))}
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

function AdminTopBar({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="h-[52px] flex items-center justify-between px-6 bg-background border-b border-border shrink-0">
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
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8" aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs font-medium bg-primary text-white">SA</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">Super Admin</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminTopBar dark={dark} onToggleTheme={toggle} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
