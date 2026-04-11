import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useDistanceUnit } from "@/hooks/useSettings";
import {
  ArrowLeft, Car, CalendarCheck, FileText, Wrench, ReceiptText,
  Pencil, Trash2, User, Hash, Fuel, Gauge,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VehicleDrawer, { type VehicleRow } from "@/components/VehicleDrawer";
import { statusClass, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();

/* ─── API types ──────────────────────────────────────────────────────────── */
interface ClientInfo {
  id: string; name: string; phone: string | null; email: string | null; type: string;
}
interface BookingRow {
  id: string; ref: string; status: string; scheduled_at: string;
  source: string; duration_min: number; created_at: string; advisor_name: string | null;
}
interface QuotationRow {
  id: string; ref: string; status: string; total: string; created_at: string;
  expires_at: string | null; advisor_name: string | null;
}
interface JobRow {
  id: string; ref: string; status: string; priority: string; bay: string | null;
  created_at: string; completed_at: string | null; customer_concern: string | null;
  advisor_name: string | null; technician_name: string | null;
}
interface InvoiceRow {
  id: string; ref: string; status: string; total: string; paid_amount: string;
  due_at: string | null; created_at: string;
}
interface VehicleDetail {
  vehicle: VehicleRow;
  client: ClientInfo | null;
  currency: string;
  history: { bookings: BookingRow[]; quotations: QuotationRow[]; jobs: JobRow[]; invoices: InvoiceRow[] };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", statusClass(status))}>
      {statusLabel(status)}
    </span>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <Icon className="w-8 h-8 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function VehicleDetailPage() {
  const params    = useParams<{ id: string }>();
  const id        = params.id ?? "";
  const [, navigate] = useLocation();
  const qc        = useQueryClient();
  const distanceUnit = useDistanceUnit();

  const [editOpen, setEditOpen] = useState(false);
  const [delOpen,  setDelOpen]  = useState(false);

  const { data, isLoading, error } = useQuery<VehicleDetail>({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${id}?tenant=${TENANT}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const deleteVehicle = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vehicles/${id}?tenant=${TENANT}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      if (data?.client) {
        navigate(`/customers/${data.client.id}`);
      } else {
        navigate("/customers");
      }
    },
  });

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-muted-foreground">Vehicle not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/customers")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />Back
        </Button>
      </div>
    );
  }

  const { vehicle, client, currency, history } = data;
  const vehicleTitle = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Unknown vehicle";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => client ? navigate(`/customers/${client.id}`) : navigate("/customers")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {client ? client.name : "Customers"}
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Car className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold font-mono tracking-wide">{vehicle.plate}</h1>
                {vehicle.color && (
                  <span className="text-sm text-muted-foreground capitalize">{vehicle.color}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{vehicleTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-destructive hover:bg-destructive/5 border-destructive/20"
              onClick={() => setDelOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bookings",   value: history.bookings.length,   icon: CalendarCheck },
          { label: "Quotations", value: history.quotations.length, icon: FileText },
          { label: "Jobs",       value: history.jobs.length,       icon: Wrench },
          { label: "Invoices",   value: history.invoices.length,   icon: ReceiptText },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Vehicle details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Vehicle details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem icon={Car}   label="Make / Model" value={[vehicle.make, vehicle.model].filter(Boolean).join(" ") || null} />
              <DetailItem icon={Hash}  label="Year"         value={vehicle.year} />
              <DetailItem icon={Hash}  label="VIN"          value={vehicle.vin ? <span className="font-mono text-xs">{vehicle.vin}</span> : null} />
              <DetailItem icon={Gauge} label="Mileage"      value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} ${distanceUnit}` : null} />
              <DetailItem icon={Fuel}  label="Fuel type"    value={vehicle.fuel_type ? <span className="capitalize">{vehicle.fuel_type}</span> : null} />
              <DetailItem icon={Car}   label="Transmission" value={vehicle.transmission ? <span className="capitalize">{vehicle.transmission.replace("_", "-")}</span> : null} />
              {vehicle.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{vehicle.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked customer */}
          {client && (
            <Card
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/customers/${client.id}`)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {initials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                    {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: History tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="bookings">
            <TabsList className="mb-4">
              <TabsTrigger value="bookings">Bookings ({history.bookings.length})</TabsTrigger>
              <TabsTrigger value="quotations">Quotes ({history.quotations.length})</TabsTrigger>
              <TabsTrigger value="jobs">Jobs ({history.jobs.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({history.invoices.length})</TabsTrigger>
            </TabsList>

            {/* Bookings */}
            <TabsContent value="bookings">
              {history.bookings.length === 0 ? (
                <EmptyState icon={CalendarCheck} message="No bookings for this vehicle" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Date &amp; time</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Advisor</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.bookings.map(b => (
                        <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 font-mono text-xs">{b.ref}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDateTime(b.scheduled_at)}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell">{b.advisor_name ?? "—"}</td>
                          <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Quotations */}
            <TabsContent value="quotations">
              {history.quotations.length === 0 ? (
                <EmptyState icon={FileText} message="No quotations for this vehicle" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.quotations.map(q => (
                        <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 font-mono text-xs">{q.ref}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(q.created_at)}</td>
                          <td className="px-3 py-3 font-medium text-[13px]">{Number(q.total).toFixed(2)} {currency}</td>
                          <td className="px-3 py-3"><StatusBadge status={q.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Jobs */}
            <TabsContent value="jobs">
              {history.jobs.length === 0 ? (
                <EmptyState icon={Wrench} message="No job cards for this vehicle" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Concern</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Technician</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.jobs.map(j => (
                        <tr key={j.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3">
                            <p className="font-mono text-xs">{j.ref}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDate(j.created_at)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell max-w-[150px] truncate">
                            {j.customer_concern ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                            {j.technician_name ?? "—"}
                          </td>
                          <td className="px-3 py-3"><StatusBadge status={j.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices">
              {history.invoices.length === 0 ? (
                <EmptyState icon={ReceiptText} message="No invoices for this vehicle" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Paid</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 font-mono text-xs">{inv.ref}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{fmtDate(inv.created_at)}</td>
                          <td className="px-3 py-3 font-medium text-[13px]">{Number(inv.total).toFixed(2)} {currency}</td>
                          <td className="px-3 py-3 text-[13px] text-muted-foreground hidden sm:table-cell">
                            {Number(inv.paid_amount).toFixed(2)} {currency}
                          </td>
                          <td className="px-3 py-3"><StatusBadge status={inv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit drawer */}
      <VehicleDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vehicle={vehicle}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["vehicle", id] })}
      />

      {/* Delete confirmation */}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vehicle {vehicle.plate}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this vehicle. All linked service history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVehicle.mutate()}
              disabled={deleteVehicle.isPending}
            >
              {deleteVehicle.isPending ? "Removing…" : "Remove vehicle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
