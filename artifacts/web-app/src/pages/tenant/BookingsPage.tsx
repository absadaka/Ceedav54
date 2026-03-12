import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Bookings</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New booking
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CalendarCheck className="w-12 h-12 text-muted-foreground/25 mb-4" />
        <p className="text-[15px] font-semibold text-muted-foreground mb-1">No bookings yet</p>
        <p className="text-sm text-muted-foreground/70 mb-5">Schedule your first appointment to get started.</p>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New booking</Button>
      </div>
    </div>
  );
}
