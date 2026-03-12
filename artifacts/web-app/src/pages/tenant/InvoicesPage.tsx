import { Receipt, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New invoice
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Receipt className="w-12 h-12 text-muted-foreground/25 mb-4" />
        <p className="text-[15px] font-semibold text-muted-foreground mb-1">No invoices yet</p>
        <p className="text-sm text-muted-foreground/70 mb-5">Invoices are created automatically when a job is completed.</p>
        <Button variant="outline" size="sm">Create manually</Button>
      </div>
    </div>
  );
}
