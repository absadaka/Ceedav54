import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { cn }       from "@/lib/utils";
import { toast }    from "sonner";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

function getCurrentUserId(): string | undefined {
  try {
    const s = localStorage.getItem("ceeda_session");
    return s ? JSON.parse(s).userId : undefined;
  } catch { return undefined; }
}

const MOVE_TO_SERVICE_KEY = "move_to_service_job";

export const INSPECTION_STATUSES = [
  { key: "new",                 label: "New",                color: "bg-slate-100  text-slate-700  border-slate-300"  },
  { key: "in_progress",         label: "Checked In",         color: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "completed",           label: "Completed",          color: "bg-green-100  text-green-800  border-green-300"  },
  { key: "delivered",           label: "Delivered",          color: "bg-teal-100   text-teal-800   border-teal-300"   },
  { key: MOVE_TO_SERVICE_KEY,   label: "Move to Service Job", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
] as const;

export const JOB_STATUSES = [
  { key: "new",          label: "New",            color: "bg-slate-100  text-slate-700  border-slate-300"  },
  { key: "waiting",      label: "Checked In",     color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { key: "in_progress",  label: "In progress",    color: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "waiting_parts",label: "Waiting parts",  color: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "qc",           label: "QC Check",       color: "bg-blue-100   text-blue-800   border-blue-300"   },
  { key: "completed",    label: "Completed",      color: "bg-green-100  text-green-800  border-green-300"  },
  { key: "delivered",    label: "Delivered",      color: "bg-teal-100   text-teal-800   border-teal-300"   },
] as const;

export type JobStatus = typeof JOB_STATUSES[number]["key"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobRef: string;
  currentStatus: string;
  moduleType?: "inspection" | "service_job";
  onSuccess?: (newStatus: string, data?: unknown) => void;
}

export default function StatusTransitionModal({
  open, onOpenChange, jobId, jobRef, currentStatus, moduleType, onSuccess,
}: Props) {
  const qc       = useQueryClient();
  const [target, setTarget] = useState<string>("");
  const [note,   setNote]   = useState("");

  const statuses = moduleType === "inspection" ? INSPECTION_STATUSES : JOB_STATUSES;

  const findLabel = (key: string) =>
    [...INSPECTION_STATUSES, ...JOB_STATUSES].find(s => s.key === key)?.label ?? key;

  const mutation = useMutation({
    mutationFn: async () => {
      if (target === MOVE_TO_SERVICE_KEY) {
        const r = await fetch(`${API}/api/jobs/${jobId}/convert-to-job?tenant=${TENANT}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error("Conversion failed");
        return { __action: MOVE_TO_SERVICE_KEY, ...(await r.json()) };
      }

      const r = await fetch(`${API}/api/jobs/${jobId}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, note: note.trim() || undefined, changed_by: getCurrentUserId() }),
      });
      if (!r.ok) throw new Error("Status transition failed");
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      qc.invalidateQueries({ queryKey: ["inspections-kanban"] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });

      if (target === MOVE_TO_SERVICE_KEY) {
        toast.success(`Service job ${(data as { job?: { ref?: string } }).job?.ref ?? ""} created`);
      } else {
        toast.success(`${jobRef} moved to ${findLabel(target)}`);
      }

      onSuccess?.(target, data);
      onOpenChange(false);
      setTarget("");
      setNote("");
    },
    onError: () => toast.error(target === MOVE_TO_SERVICE_KEY ? "Could not create service job" : "Could not update status"),
  });

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setTarget(""); setNote(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {jobRef}</DialogTitle>
          <DialogDescription>Select a new status for this job card.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {statuses.map(s => {
            const isCurrent = s.key === currentStatus;
            const isSelected = s.key === target;
            const isConvert  = s.key === MOVE_TO_SERVICE_KEY;
            return (
              <button
                key={s.key}
                disabled={isCurrent}
                onClick={() => setTarget(s.key)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-all",
                  s.color,
                  isSelected && "ring-2 ring-primary ring-offset-1",
                  isCurrent && "opacity-40 cursor-not-allowed",
                  !isCurrent && !isSelected && "hover:opacity-80",
                  isConvert && "col-span-2",
                )}
              >
                {s.label}
                {isCurrent && <span className="ml-1 text-[10px]">(current)</span>}
              </button>
            );
          })}
        </div>

        {target !== MOVE_TO_SERVICE_KEY && (
          <div className="space-y-1.5">
            <Label className="text-sm">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Reason for status change…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!target || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? (target === MOVE_TO_SERVICE_KEY ? "Creating…" : "Saving…")
              : (target === MOVE_TO_SERVICE_KEY ? "Convert" : "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
