import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { cn }       from "@/lib/utils";
import { toast }    from "sonner";
import { AlertTriangle, Car } from "lucide-react";

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
  { key: "new",          label: "New",                color: "bg-slate-100  text-slate-700  border-slate-300"  },
  { key: "waiting",      label: "Checked-in",         color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { key: "on_hold",      label: "Inspection",         color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { key: "qc",           label: "Estimation",         color: "bg-blue-100   text-blue-800   border-blue-300"   },
  { key: "in_progress",  label: "Work Started",       color: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "waiting_parts",label: "Waiting for Parts",  color: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "completed",    label: "Work Done",          color: "bg-green-100  text-green-800  border-green-300"  },
  { key: "delivered",    label: "Delivered",          color: "bg-teal-100   text-teal-800   border-teal-300"   },
] as const;

export type JobStatus = typeof JOB_STATUSES[number]["key"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobRef: string;
  currentStatus: string;
  moduleType?: "inspection" | "service_job";
  vehicleVin?: string | null;
  vehicleId?: string | null;
  vehicleMileage?: string | null;
  onSuccess?: (newStatus: string, data?: unknown) => void;
  initialTarget?: string;
}

export default function StatusTransitionModal({
  open, onOpenChange, jobId, jobRef, currentStatus, moduleType,
  vehicleVin, vehicleId, vehicleMileage, onSuccess, initialTarget,
}: Props) {
  const qc = useQueryClient();

  const [target,     setTarget]     = useState<string>("");
  const [note,       setNote]       = useState("");
  const [vinWarning, setVinWarning] = useState(false);

  const [inputVin,     setInputVin]     = useState("");
  const [inputMileage, setInputMileage] = useState("");

  useEffect(() => {
    if (open && initialTarget) setTarget(initialTarget);
  }, [open, initialTarget]);

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
      setVinWarning(false);
      setInputVin("");
      setInputMileage("");
    },
    onError: () => toast.error(target === MOVE_TO_SERVICE_KEY ? "Could not create service job" : "Could not update status"),
  });

  const saveVehicleMutation = useMutation({
    mutationFn: async () => {
      if (!vehicleId) throw new Error("No vehicle id");
      const body: Record<string, string> = {};
      if (inputVin.trim())     body.vin     = inputVin.trim();
      if (inputMileage.trim()) body.mileage = inputMileage.trim();
      const r = await fetch(`${API}/api/vehicles/${vehicleId}?tenant=${TENANT}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Vehicle save failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle details saved");
      mutation.mutate();
    },
    onError: () => toast.error("Could not save vehicle details"),
  });

  const needsVin = moduleType !== "inspection" && currentStatus === "new" && target === "waiting" && !vehicleVin;

  const handleConfirm = () => {
    if (needsVin) { setVinWarning(true); return; }
    mutation.mutate();
  };

  const handleSaveAndCheckIn = () => {
    const vinOk = !!vehicleVin || !!inputVin.trim();
    if (!vinOk) {
      toast.error("Please enter the VIN number");
      return;
    }
    if (inputVin.trim() || inputMileage.trim()) {
      saveVehicleMutation.mutate();
    } else {
      mutation.mutate();
    }
  };

  const isBusy = mutation.isPending || saveVehicleMutation.isPending;

  const missingVin     = !vehicleVin;
  const missingMileage = !vehicleMileage;

  return (
    <Dialog open={open} onOpenChange={v => {
      onOpenChange(v);
      if (!v) {
        setTarget(""); setNote(""); setVinWarning(false);
        setInputVin(""); setInputMileage("");
      }
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move {jobRef}</DialogTitle>
          <DialogDescription>Select a new status for this job card.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {statuses.map(s => {
            const isCurrent  = s.key === currentStatus;
            const isSelected = s.key === target;
            const isConvert  = s.key === MOVE_TO_SERVICE_KEY;
            const isNew      = s.key === "new";
            const disabled   = isCurrent || (isNew && currentStatus !== "new");
            return (
              <button
                key={s.key}
                disabled={disabled}
                onClick={() => { if (!disabled) { setTarget(s.key); setVinWarning(false); } }}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-all",
                  s.color,
                  isSelected && "ring-2 ring-primary ring-offset-1",
                  disabled && "opacity-40 cursor-not-allowed",
                  !disabled && !isSelected && "hover:opacity-80",
                  isConvert && "col-span-2",
                )}
              >
                {s.label}
                {isCurrent && <span className="ml-1 text-[10px] opacity-70">(current)</span>}
              </button>
            );
          })}
        </div>

        {/* ── Missing vehicle details form ── */}
        {vinWarning && vehicleId && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
            <div className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong>Missing vehicle details.</strong> Fill in the fields below to save them to the vehicle record and continue check-in.
              </span>
            </div>

            <div className="space-y-2">
              {missingVin && (
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Car className="w-3 h-3" /> VIN number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 1HGBH41JXMN109186"
                    value={inputVin}
                    onChange={e => setInputVin(e.target.value.toUpperCase())}
                    className="h-8 text-xs font-mono uppercase"
                    maxLength={17}
                  />
                </div>
              )}

              {missingMileage && (
                <div className="space-y-1">
                  <Label className="text-xs">Current mileage (km) <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="number"
                    placeholder="e.g. 45000"
                    value={inputMileage}
                    onChange={e => setInputMileage(e.target.value)}
                    className="h-8 text-xs"
                    min={0}
                  />
                </div>
              )}

              {!missingVin && missingMileage && (
                <p className="text-[11px] text-amber-700">VIN is already on file — you can add the mileage or skip.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                disabled={isBusy}
                onClick={() => mutation.mutate()}
              >
                Skip & check in anyway
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                disabled={isBusy || (missingVin && !inputVin.trim())}
                onClick={handleSaveAndCheckIn}
              >
                {isBusy ? "Saving…" : "Save & check in"}
              </Button>
            </div>
          </div>
        )}

        {target !== MOVE_TO_SERVICE_KEY && !vinWarning && (
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

        {!vinWarning && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!target || isBusy}
              onClick={handleConfirm}
            >
              {isBusy
                ? (target === MOVE_TO_SERVICE_KEY ? "Creating…" : "Saving…")
                : (target === MOVE_TO_SERVICE_KEY ? "Convert" : "Confirm")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
