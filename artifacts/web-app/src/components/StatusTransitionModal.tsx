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

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API     = import.meta.env.BASE_URL.replace(/\/$/, "");

export const JOB_STATUSES = [
  { key: "waiting",       label: "New",            color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { key: "in_progress",  label: "In progress",    color: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "waiting_parts",label: "Waiting parts",  color: "bg-purple-100 text-purple-800 border-purple-300" },
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
  onSuccess?: (newStatus: string) => void;
}

export default function StatusTransitionModal({
  open, onOpenChange, jobId, jobRef, currentStatus, onSuccess,
}: Props) {
  const qc       = useQueryClient();
  const [target, setTarget] = useState<string>("");
  const [note,   setNote]   = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/jobs/${jobId}/status?tenant=${TENANT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error("Status transition failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-kanban"] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      toast.success(`Job ${jobRef} moved to ${JOB_STATUSES.find(s => s.key === target)?.label}`);
      onSuccess?.(target);
      onOpenChange(false);
      setTarget("");
      setNote("");
    },
    onError: () => toast.error("Could not update status"),
  });

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { setTarget(""); setNote(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {jobRef}</DialogTitle>
          <DialogDescription>Select a new status for this job card.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {JOB_STATUSES.map(s => {
            const isCurrent = s.key === currentStatus;
            const isSelected = s.key === target;
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
                )}
              >
                {s.label}
                {isCurrent && <span className="ml-1 text-[10px]">(current)</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            rows={2}
            placeholder="Reason for status change…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!target || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
