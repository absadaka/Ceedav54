import { Link } from "wouter";
import {
  Building2, Wrench, CalendarClock, Tag, CreditCard,
  UsersRound, MessageSquare, BarChart2, LifeBuoy,
} from "lucide-react";

interface Card {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const CARDS: Card[] = [
  {
    title: "Business setup",
    description: "Customize business details, logo, address and contact information.",
    href: "/settings/business",
    icon: Building2,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Services",
    description: "Manage your automotive services catalog, pricing, and categories.",
    href: "/settings/services",
    icon: Wrench,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
  },
  {
    title: "Scheduling",
    description: "Set your opening hours, manage bookable resources and online booking preferences.",
    href: "/settings/hours",
    icon: CalendarClock,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Sales",
    description: "Configure payment methods, taxes, receipts, service charges and gift cards.",
    href: "/settings/sales",
    icon: Tag,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Billing",
    description: "Manage invoices, messaging balance, add-ons and your subscription plan.",
    href: "/settings/billing",
    icon: CreditCard,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    title: "Users",
    description: "Manage permissions, team members and their roles.",
    href: "/settings/team",
    icon: UsersRound,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    title: "Communications",
    description: "Email, SMS and notification trigger configuration.",
    href: "/settings/comms",
    icon: MessageSquare,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
  },
  {
    title: "Reporting",
    description: "Fiscal year settings, dashboard widgets and data exports.",
    href: "/settings/reporting",
    icon: BarChart2,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  {
    title: "Support tickets",
    description: "Track conversations with CEEDA support and reply to ongoing tickets.",
    href: "/settings/support",
    icon: LifeBuoy,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
];

function SettingsCard({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <Link href={card.href}>
      <div className="bg-white border border-border rounded-2xl p-6 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-150 h-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
            <Icon className={`w-5 h-5 ${card.iconColor}`} />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground leading-snug">{card.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Workspace settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage settings for your workshop.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <SettingsCard key={card.href} card={card} />
        ))}
      </div>
    </div>
  );
}
