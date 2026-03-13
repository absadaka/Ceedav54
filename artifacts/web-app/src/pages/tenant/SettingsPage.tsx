import { Link } from "wouter";
import {
  Building2, Clock, Tag, UsersRound, ShoppingCart, BarChart2,
  CreditCard, MessageSquare, Plug2, Shield, Monitor, Laptop2,
  Key, Activity, ChevronRight,
} from "lucide-react";

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const GROUPS: { label: string; sections: SettingsSection[] }[] = [
  {
    label: "Workshop",
    sections: [
      { title: "Business profile",   description: "Name, logo, address, phone, website, social links", href: "/settings/business",    icon: Building2 },
      { title: "Office hours",       description: "Opening times displayed to customers",              href: "/settings/hours",       icon: Clock },
      { title: "Services & pricing", description: "Master catalog of services, parts and packages",    href: "/settings/services",    icon: Tag },
      { title: "Users & roles",      description: "Manage team members and role permissions",          href: "/settings/team",        icon: UsersRound },
    ],
  },
  {
    label: "Sales & Finance",
    sections: [
      { title: "Sales",          description: "Tax rates, invoice defaults and quote settings",        href: "/settings/sales",      icon: ShoppingCart },
      { title: "Reporting",      description: "Fiscal year, dashboard widgets and exports",            href: "/settings/reporting",  icon: BarChart2 },
      { title: "Billing & plan", description: "Subscription, payment methods and invoice history",     href: "/settings/billing",    icon: CreditCard },
    ],
  },
  {
    label: "Communication",
    sections: [
      { title: "Comms setup",   description: "Email, SMS and notification trigger configuration", href: "/settings/comms",        icon: MessageSquare },
      { title: "Integrations",  description: "Stripe, WhatsApp, SMS and more",                   href: "/settings/integrations", icon: Plug2 },
    ],
  },
  {
    label: "Account",
    sections: [
      { title: "Security",        description: "Password and two-factor authentication",          href: "/account/security", icon: Shield },
      { title: "Sessions",        description: "Active browser and device sessions",              href: "/account/sessions", icon: Monitor },
      { title: "Trusted devices", description: "Remembered browsers and devices",                href: "/account/devices",  icon: Laptop2 },
    ],
  },
  {
    label: "Developer",
    sections: [
      { title: "API keys",   description: "Manage API keys for external integrations", href: "/admin/api-keys", icon: Key },
      { title: "Audit log",  description: "Full history of team and system activity",  href: "/admin/audit",   icon: Activity },
    ],
  },
];

function SettingsRow({ section }: { section: SettingsSection }) {
  const Icon = section.icon;
  return (
    <Link href={section.href}>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors cursor-pointer group">
        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{section.title}</p>
            {section.badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {section.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your workshop profile, integrations and account preferences.
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 px-0.5">
            {group.label}
          </p>
          <div className="bg-background border border-border rounded-lg overflow-hidden divide-y divide-border">
            {group.sections.map((section) => (
              <SettingsRow key={section.href} section={section} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
