import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft, Phone, Mail, MessageCircle, CreditCard, Car, FileText,
  Wrench, ReceiptText, CalendarCheck, Plus, Pencil, Trash2, User,
  Building2, MoreHorizontal, ExternalLink,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomerDrawer, { type ClientRow } from "@/components/CustomerDrawer";
import VehicleDrawer, { type VehicleRow } from "@/components/VehicleDrawer";
import BookingDrawer from "@/components/BookingDrawer";
import { statusClass, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();

/* ─── API shape types ────────────────────────────────────────────────────── */
interface BookingRow {
  id: string; ref: string; status: string; scheduled_at: string;
  source: string; notes: string | null; duration_min: number; created_at: string;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null; vehicle_year: string | null;
  advisor_name: string | null;
}
interface QuotationRow {
  id: string; ref: string; status: string; total: string; created_at: string;
  expires_at: string | null;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null;
  advisor_name: string | null;
}
interface JobRow {
  id: string; ref: string; status: string; priority: string; bay: string | null;
  type: string | null; vehicle_id: string | null;
  created_at: string; completed_at: string | null; customer_concern: string | null;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null;
  advisor_name: string | null; technician_name: string | null;
}
interface InvoiceRow {
  id: string; ref: string; status: string; total: string; paid_amount: string;
  due_at: string | null; created_at: string;
  vehicle_plate: string | null; vehicle_make: string | null; vehicle_model: string | null;
}
interface DetailData {
  client: ClientRow & { id_number?: string | null; created_at: string };
  vehicles: VehicleRow[];
  currency: string;
  history: { bookings: BookingRow[]; quotations: QuotationRow[]; jobs: JobRow[]; invoices: InvoiceRow[] };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", opts ?? { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function vehicleLabel(row: { vehicle_plate?: string | null; vehicle_make?: string | null; vehicle_model?: string | null }) {
  const parts = [row.vehicle_make, row.vehicle_model].filter(Boolean).join(" ");
  return [row.vehicle_plate, parts].filter(Boolean).join(" · ") || "—";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", statusClass(status))}>
      {statusLabel(status)}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className="text-sm">{value}</p>
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

/* ─── Vehicle card ───────────────────────────────────────────────────────── */
function VehicleCard({
  v, jobs, onEdit, onDelete,
}: {
  v: VehicleRow;
  jobs: JobRow[];
  onEdit: (v: VehicleRow) => void;
  onDelete: (v: VehicleRow) => void;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm font-mono tracking-wide">{v.plate}</p>
            <p className="text-sm text-muted-foreground">
              {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown vehicle"}
            </p>
            {v.color && <p className="text-xs text-muted-foreground capitalize">{v.color}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => navigate(`/vehicles/${v.id}`)}>
                <ExternalLink className="w-3.5 h-3.5 mr-2" />View detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(v)}>
                <Pencil className="w-3.5 h-3.5 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(v)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {v.mileage    && <span>🛣 {Number(v.mileage).toLocaleString()} km</span>}
          {v.fuel_type  && <span className="capitalize">⛽ {v.fuel_type}</span>}
          {v.vin        && <span className="font-mono truncate col-span-2">VIN {v.vin}</span>}
        </div>
      </div>

      {/* Job cards for this vehicle */}
      {jobs.length > 0 && (
        <div className="border-t border-border bg-muted/20">
          <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Job cards ({jobs.length})
          </p>
          <div className="divide-y divide-border">
            {jobs.map(j => (
              <button
                key={j.id}
                onClick={() => navigate(j.type === "inspection" ? `/inspections/${j.id}` : `/jobs/${j.id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors group"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-foreground">{j.ref}</span>
                  {j.customer_concern && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{j.customer_concern}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", statusClass(j.status))}>
                    {statusLabel(j.status)}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="border-t border-border bg-muted/10 px-4 py-2.5 flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <Wrench className="w-3 h-3" />No job cards yet
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function CustomerDetailPage() {
  const params    = useParams<{ id: string }>();
  const id        = params.id ?? "";
  const [, navigate] = useLocation();
  const qc        = useQueryClient();

  const [editOpen,    setEditOpen]    = useState(false);
  const [vehDrawer,   setVehDrawer]   = useState(false);
  const [editVeh,     setEditVeh]     = useState<VehicleRow | null>(null);
  const [delOpen,     setDelOpen]     = useState(false);
  const [delVeh,      setDelVeh]      = useState<VehicleRow | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data, isLoading, error } = useQuery<DetailData>({
    queryKey: ["client", id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}?tenant=${TENANT}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const deleteCustomer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${id}?tenant=${TENANT}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); navigate("/customers"); },
  });

  const deleteVehicle = useMutation({
    mutationFn: async (vid: string) => {
      const res = await fetch(`/api/vehicles/${vid}?tenant=${TENANT}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      setDelVeh(null);
    },
  });

  const openAddVehicle  = useCallback(() => { setEditVeh(null); setVehDrawer(true); }, []);
  const openEditVehicle = useCallback((v: VehicleRow) => { setEditVeh(v); setVehDrawer(true); }, []);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3.5 w-32" /></div>
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
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/customers")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />Back to customers
        </Button>
      </div>
    );
  }

  const { client, vehicles, currency, history } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />Customers
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-base bg-primary/10 text-primary font-bold">
                {initials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{client.name}</h1>
                <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 flex items-center gap-1 text-muted-foreground">
                  {client.type === "company" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {client.type}
                </Badge>
              </div>
              {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                Customer since {fmtDate((client as ClientRow & { created_at?: string }).created_at ?? null, { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" onClick={() => setBookingOpen(true)}>
              <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />New Booking
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5 border-destructive/20" onClick={() => setDelOpen(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Vehicles",    value: vehicles.length,               icon: Car },
          { label: "Bookings",    value: history.bookings.length,        icon: CalendarCheck },
          { label: "Jobs",        value: history.jobs.length,            icon: Wrench },
          { label: "Invoices",    value: history.invoices.length,        icon: ReceiptText },
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
        {/* Left: Contact + Notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Phone}         label="Phone"      value={client.phone}    />
              <InfoRow icon={Mail}          label="Email"      value={client.email}    />
              <InfoRow icon={MessageCircle} label="WhatsApp"   value={client.whatsapp} />
              <InfoRow icon={CreditCard}    label="Emirates ID / Passport" value={(client as ClientRow & { id_number?: string | null }).id_number} />
              {!client.phone && !client.email && !client.whatsapp && (
                <p className="text-sm text-muted-foreground">No contact info added yet.</p>
              )}
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="vehicles">
            <TabsList className="mb-4">
              <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
              <TabsTrigger value="bookings">Bookings ({history.bookings.length})</TabsTrigger>
              <TabsTrigger value="quotations">Quotes ({history.quotations.length})</TabsTrigger>
              <TabsTrigger value="jobs">Jobs ({history.jobs.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({history.invoices.length})</TabsTrigger>
            </TabsList>

            {/* Vehicles tab */}
            <TabsContent value="vehicles" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddVehicle}>
                  <Plus className="w-3.5 h-3.5" />Add vehicle
                </Button>
              </div>
              {vehicles.length === 0 ? (
                <EmptyState icon={Car} message="No vehicles registered for this customer" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicles.map(v => (
                    <VehicleCard
                      key={v.id} v={v}
                      jobs={history.jobs.filter(j => j.vehicle_id === v.id)}
                      onEdit={openEditVehicle}
                      onDelete={v => setDelVeh(v)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Bookings tab */}
            <TabsContent value="bookings" className="space-y-2">
              {history.bookings.length === 0 ? (
                <EmptyState icon={CalendarCheck} message="No bookings yet" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Vehicle</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.bookings.map(b => (
                        <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3 font-mono text-xs">{b.ref}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">{fmtDateTime(b.scheduled_at)}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{vehicleLabel(b)}</td>
                          <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Quotations tab */}
            <TabsContent value="quotations" className="space-y-2">
              {history.quotations.length === 0 ? (
                <EmptyState icon={FileText} message="No quotations yet" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Vehicle</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.quotations.map(q => (
                        <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3">
                            <p className="font-mono text-xs">{q.ref}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDate(q.created_at)}</p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{vehicleLabel(q)}</td>
                          <td className="px-3 py-3 font-medium text-[13px]">{Number(q.total).toFixed(2)} {currency}</td>
                          <td className="px-3 py-3"><StatusBadge status={q.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Jobs tab */}
            <TabsContent value="jobs" className="space-y-2">
              {history.jobs.length === 0 ? (
                <EmptyState icon={Wrench} message="No job cards yet" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Vehicle</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Technician</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.jobs.map(j => (
                        <tr
                          key={j.id}
                          onClick={() => navigate(j.type === "inspection" ? `/inspections/${j.id}` : `/jobs/${j.id}`)}
                          className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-3">
                            <p className="font-mono text-xs font-semibold">{j.ref}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDate(j.created_at)}</p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{vehicleLabel(j)}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden md:table-cell">{j.technician_name ?? "—"}</td>
                          <td className="px-3 py-3"><StatusBadge status={j.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Invoices tab */}
            <TabsContent value="invoices" className="space-y-2">
              {history.invoices.length === 0 ? (
                <EmptyState icon={ReceiptText} message="No invoices yet" />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Vehicle</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Paid</th>
                        <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-3">
                            <p className="font-mono text-xs">{inv.ref}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtDate(inv.created_at)}</p>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{vehicleLabel(inv)}</td>
                          <td className="px-3 py-3 font-medium text-[13px]">{Number(inv.total).toFixed(2)} {currency}</td>
                          <td className="px-3 py-3 text-[13px] text-muted-foreground hidden md:table-cell">
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

      {/* Booking drawer */}
      <BookingDrawer
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        defaultClientId={id}
      />

      {/* Edit Customer drawer */}
      <CustomerDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client as ClientRow}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["client", id] })}
      />

      {/* Vehicle drawer */}
      <VehicleDrawer
        open={vehDrawer}
        onClose={() => { setVehDrawer(false); setEditVeh(null); }}
        vehicle={editVeh}
        clientId={id}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["client", id] })}
      />

      {/* Delete customer confirmation */}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the customer. Their service history will be preserved but unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCustomer.mutate()}
              disabled={deleteCustomer.isPending}
            >
              {deleteCustomer.isPending ? "Deleting…" : "Delete customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete vehicle confirmation */}
      <AlertDialog open={Boolean(delVeh)} onOpenChange={open => !open && setDelVeh(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{delVeh?.plate}</strong> from this customer. Service history linked to this vehicle is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delVeh && deleteVehicle.mutate(delVeh.id)}
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
