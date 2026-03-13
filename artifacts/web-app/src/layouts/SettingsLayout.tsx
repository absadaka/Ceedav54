import { Link, useLocation } from "wouter";
import {
  Building2, Clock, Tag, UsersRound, ShoppingCart, BarChart2,
  CreditCard, MessageSquare, Plug2, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroup {
  label: string;
  items: { label: string; href: string; icon: React.ElementType }[];
}

const NAV: NavGroup[] = [
  {
    label: "Workshop",
    items: [
      { label: "Business profile",   href: "/settings/business",   icon: Building2 },
      { label: "Office hours",       href: "/settings/hours",      icon: Clock },
      { label: "Services & pricing", href: "/settings/services",   icon: Tag },
      { label: "Users & roles",      href: "/settings/team",       icon: UsersRound },
    ],
  },
  {
    label: "Sales & Finance",
    items: [
      { label: "Sales",     href: "/settings/sales",     icon: ShoppingCart },
      { label: "Reporting", href: "/settings/reporting", icon: BarChart2 },
      { label: "Billing",   href: "/settings/billing",   icon: CreditCard },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Comms setup",   href: "/settings/comms",        icon: MessageSquare },
      { label: "Integrations",  href: "/settings/integrations", icon: Plug2 },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  function isActive(href: string) {
    return location === href || location.startsWith(href + "/");
  }

  return (
    <div className="flex gap-0 -mx-6 -my-5 min-h-[calc(100vh-52px)]">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-background flex flex-col py-4 px-3 overflow-y-auto sticky top-0 self-start max-h-[calc(100vh-52px)]">
        <Link href="/settings">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 px-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />Settings
          </button>
        </Link>

        <nav className="space-y-5">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <span className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                        isActive(item.href)
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                      )}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {children}
      </main>
    </div>
  );
}
