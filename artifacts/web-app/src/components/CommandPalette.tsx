import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarCheck, FileText,
  Wrench, Receipt, UsersRound, Building2, Shield, ClipboardCheck,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface NavEntry {
  label: string;
  href: string;
  icon: React.ElementType;
  group: string;
}

function buildEntries(prefix = ""): NavEntry[] {
  return [
    { label: "Dashboard",    href: `${prefix}/dashboard`,    icon: LayoutDashboard, group: "Navigate" },
    { label: "Customers",    href: `${prefix}/customers`,    icon: Users,           group: "Navigate" },
    { label: "Bookings",     href: `${prefix}/bookings`,     icon: CalendarCheck,   group: "Navigate" },
    { label: "Inspections",  href: `${prefix}/inspections`,  icon: ClipboardCheck,  group: "Navigate" },
    { label: "Quotations",   href: `${prefix}/quotations`,   icon: FileText,        group: "Navigate" },
    { label: "Service Jobs", href: `${prefix}/jobs`,         icon: Wrench,          group: "Navigate" },
    { label: "Invoices",     href: `${prefix}/invoices`,     icon: Receipt,         group: "Navigate" },
    { label: "Team",         href: `${prefix}/team`,        icon: UsersRound,      group: "Workspace" },
    { label: "Shop settings",href: `${prefix}/settings`,    icon: Building2,       group: "Workspace" },
    { label: "Security",     href: `${prefix}/account/security`,  icon: Shield,   group: "Account" },
  ];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug?: string;
}

export default function CommandPalette({ open, onOpenChange, tenantSlug }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const prefix = tenantSlug ? `/${tenantSlug}` : "";
  const entries = buildEntries(prefix);

  const groups = Array.from(new Set(entries.map((e) => e.group)));

  function run(href: string) {
    onOpenChange(false);
    navigate(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, gi) => (
          <span key={group}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {entries
                .filter((e) => e.group === group)
                .map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <CommandItem
                      key={entry.href}
                      value={entry.label}
                      onSelect={() => run(entry.href)}
                      className="gap-2.5 cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {entry.label}
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </span>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook to open the palette globally with Cmd+K / Ctrl+K */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
