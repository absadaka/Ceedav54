import { Link } from "wouter";
import {
  Building2, Shield, Monitor, Laptop2, Key, Activity,
  ChevronRight, Bell, Globe, CreditCard,
} from "lucide-react";

interface SettingsSection {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const sections: SettingsSection[][] = [
  [
    {
      title: "Shop profile",
      description: "Name, address, currency, contact details",
      href: "/settings/shop",
      icon: Building2,
    },
    {
      title: "Notifications",
      description: "WhatsApp, email and in-app alerts",
      href: "/settings/notifications",
      icon: Bell,
    },
    {
      title: "Localization",
      description: "Language, timezone and date format",
      href: "/settings/locale",
      icon: Globe,
    },
    {
      title: "Billing & plan",
      description: "Subscription, invoices and payment methods",
      href: "/settings/billing",
      icon: CreditCard,
    },
  ],
  [
    {
      title: "Security",
      description: "Password, two-factor authentication",
      href: "/account/security",
      icon: Shield,
    },
    {
      title: "Sessions",
      description: "Active browser and device sessions",
      href: "/account/sessions",
      icon: Monitor,
    },
    {
      title: "Devices",
      description: "Trusted devices and remembered browsers",
      href: "/account/devices",
      icon: Laptop2,
    },
  ],
  [
    {
      title: "API keys",
      description: "Manage keys for external integrations",
      href: "/admin/api-keys",
      icon: Key,
    },
    {
      title: "Audit log",
      description: "Full history of team activity",
      href: "/admin/audit",
      icon: Activity,
    },
  ],
];

const groupLabels = ["Workshop", "Account", "Developer"];

function SettingsRow({ section }: { section: SettingsSection }) {
  const Icon = section.icon;
  return (
    <Link href={section.href}>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors cursor-pointer group">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{section.title}</p>
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
          Manage your workshop preferences and account configuration.
        </p>
      </div>

      {sections.map((group, gi) => (
        <div key={gi}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 px-0.5">
            {groupLabels[gi]}
          </p>
          <div className="bg-background border border-border rounded-lg overflow-hidden divide-y divide-border">
            {group.map((section) => (
              <SettingsRow key={section.href} section={section} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
