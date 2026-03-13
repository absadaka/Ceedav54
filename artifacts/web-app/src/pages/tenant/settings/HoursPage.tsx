import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";
import SettingsLayout from "@/layouts/SettingsLayout";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

const DAY_LABELS: Record<Day, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ["00", "30"]) {
    TIMES.push(`${String(h).padStart(2, "0")}:${m}`);
  }
}

interface DaySchedule { enabled: boolean; open: string; close: string; }
type Schedule = Record<Day, DaySchedule>;

const DEFAULT_SCHEDULE: Schedule = {
  monday:    { enabled: true,  open: "08:00", close: "18:00" },
  tuesday:   { enabled: true,  open: "08:00", close: "18:00" },
  wednesday: { enabled: true,  open: "08:00", close: "18:00" },
  thursday:  { enabled: true,  open: "08:00", close: "18:00" },
  friday:    { enabled: true,  open: "08:00", close: "14:00" },
  saturday:  { enabled: false, open: "09:00", close: "13:00" },
  sunday:    { enabled: false, open: "09:00", close: "13:00" },
};

export default function HoursPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["settings", TENANT],
    queryFn: () => fetch(`${API}/api/settings?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);

  useEffect(() => {
    if (data?.settings?.office_hours) {
      setSchedule(data.settings.office_hours as Schedule);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => fetch(`${API}/api/settings/hours?tenant=${TENANT}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ office_hours: schedule }),
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => toast.success("Office hours saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  function setDay(day: Day, patch: Partial<DaySchedule>) {
    setSchedule((p) => ({ ...p, [day]: { ...p[day], ...patch } }));
  }

  const enabledCount = DAYS.filter((d) => schedule[d]?.enabled).length;

  return (
    <SettingsLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Office hours</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set when your workshop is open. Shown to customers on the public site.
            </p>
          </div>
          <Button
            size="sm" className="gap-1.5 shrink-0"
            onClick={() => mutation.mutate()} disabled={mutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Summary badge */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            Open {enabledCount} day{enabledCount !== 1 ? "s" : ""} per week
          </span>
        </div>

        {/* Schedule table */}
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 ml-auto" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))
          ) : (
            DAYS.map((day) => {
              const d = schedule[day] ?? DEFAULT_SCHEDULE[day];
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 transition-colors",
                    !d.enabled && "bg-muted/20",
                  )}
                >
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={(v) => setDay(day, { enabled: v })}
                    className="shrink-0"
                  />
                  <span className={cn(
                    "w-24 text-sm font-medium",
                    d.enabled ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {DAY_LABELS[day]}
                  </span>

                  {d.enabled ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <select
                        value={d.open}
                        onChange={(e) => setDay(day, { open: e.target.value })}
                        className="h-8 text-sm border border-border rounded-md bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-muted-foreground text-xs">to</span>
                      <select
                        value={d.close}
                        onChange={(e) => setDay(day, { close: e.target.value })}
                        className="h-8 text-sm border border-border rounded-md bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground/60 italic">Closed</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button className="gap-1.5" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
}
