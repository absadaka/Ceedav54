import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-level billing overview and subscription management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["MRR", "Active subscriptions", "Churn rate"].map((label) => (
          <Card key={label} className="border-border shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
              <p className="text-3xl font-semibold text-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-1">No data yet</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">Subscription ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No billing events</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Subscription activity will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
