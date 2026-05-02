import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LifeBuoy, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTenantSlug } from "@/lib/tenant";

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITIES = [
  { value: "low",    label: "Low — general question" },
  { value: "medium", label: "Medium — affecting work" },
  { value: "high",   label: "High — urgent for the workshop" },
  { value: "urgent", label: "Urgent — system unusable" },
];

const CATEGORIES = [
  { value: "general",         label: "General question" },
  { value: "billing",         label: "Billing & subscription" },
  { value: "technical",       label: "Technical issue" },
  { value: "bug",             label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "account",         label: "Account & access" },
];

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { user } = useAuth();
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState("medium");
  const [category, setCategory]       = useState("general");
  const [submitting, setSubmitting]   = useState(false);
  const [createdRef, setCreatedRef]   = useState<string | null>(null);

  function reset() {
    setSubject("");
    setDescription("");
    setPriority("medium");
    setCategory("general");
    setCreatedRef(null);
    setSubmitting(false);
  }

  function handleClose(next: boolean) {
    if (!next) {
      // Defer reset so the closing animation doesn't flash empty fields.
      setTimeout(reset, 200);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 4) {
      toast.error("Please add a short subject (4+ characters).");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Please describe your issue in a bit more detail.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: getTenantSlug(),
          user_id:     user?.userId,
          contact_name:  user?.name,
          contact_email: user?.email,
          subject, description, priority, category,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not create the ticket.");
      }
      const data = await res.json();
      setCreatedRef(data.ticket?.ref ?? "TK-?");
      toast.success(`Ticket ${data.ticket?.ref} created. Our team will be in touch.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        {createdRef ? (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Ticket {createdRef} submitted</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Our support team has been notified and will reach out by email shortly.
            </p>
            <Button className="mt-5" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-primary" />
                Get help from CEEDA support
              </DialogTitle>
              <DialogDescription>
                Tell us what's going on and we'll get back to you. Your contact details
                are taken from your account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="support-subject">Subject</Label>
                <Input
                  id="support-subject"
                  placeholder="Short summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="support-priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="support-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="support-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="support-description">Describe the issue</Label>
                <Textarea
                  id="support-description"
                  placeholder="What were you trying to do, what happened, and any steps you've already tried…"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={4000}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Tip: include the page you were on and any error message.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Submit ticket"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
