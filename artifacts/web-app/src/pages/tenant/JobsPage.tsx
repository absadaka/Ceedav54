import { Wrench } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">Jobs</h1>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wrench className="w-12 h-12 text-muted-foreground/25 mb-4" />
        <p className="text-[15px] font-semibold text-muted-foreground mb-1">No active jobs</p>
        <p className="text-sm text-muted-foreground/70">Jobs are created when a quotation is approved or from a booking.</p>
      </div>
    </div>
  );
}
