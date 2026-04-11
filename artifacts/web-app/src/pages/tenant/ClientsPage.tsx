import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Users, Plus, Search, MoreHorizontal, Building2, User, Car,
  ChevronLeft, ChevronRight, Pencil, Trash2, ExternalLink, CalendarCheck,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CustomerDrawer, { type ClientRow } from "@/components/CustomerDrawer";
import BookingDrawer from "@/components/BookingDrawer";
import { cn } from "@/lib/utils";

import { getTenantSlug } from "@/lib/tenant";
const TENANT = getTenantSlug();

interface ClientListRow extends ClientRow {
  vehicle_count: number;
  last_visit: string | null;
  created_at: string;
}

interface ListResponse {
  data: ClientListRow[];
  total: number;
  page: number;
  limit: number;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

type TypeFilter = "all" | "individual" | "company";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-20" /></div>
            </div>
          </td>
          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-28" /></td>
          <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-3 w-36" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-10 rounded-full" /></td>
          <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-3 w-24" /></td>
          <td className="px-4 py-3 w-10" />
        </tr>
      ))}
    </>
  );
}

export default function ClientsPage() {
  const [, navigate]    = useLocation();
  const qc              = useQueryClient();
  const [search,  setSearch]  = useState("");
  const [deb,     setDeb]     = useState("");
  const [typeF,   setTypeF]   = useState<TypeFilter>("all");
  const [page,    setPage]    = useState(1);
  const [drawerOpen, setDrawer] = useState(false);
  const [editing, setEditing]   = useState<ClientListRow | null>(null);
  const [delTarget, setDelTarget] = useState<ClientListRow | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingClientId, setBookingClientId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDeb(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [typeF]);

  const qs = new URLSearchParams({
    tenant: TENANT,
    ...(deb && { search: deb }),
    ...(typeF !== "all" && { type: typeF }),
    page:  String(page),
    limit: "25",
  });

  const { data, isLoading, error } = useQuery<ListResponse>({
    queryKey: ["clients", deb, typeF, page],
    queryFn: async () => {
      const res = await fetch(`/api/clients?${qs}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}?tenant=${TENANT}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setDelTarget(null); },
  });

  const openCreate  = useCallback(() => { setEditing(null); setDrawer(true); }, []);
  const openEdit    = useCallback((c: ClientListRow) => { setEditing(c); setDrawer(true); }, []);
  const closeDrawer = useCallback(() => { setDrawer(false); setEditing(null); }, []);
  const totalPages  = data ? Math.ceil(data.total / 25) : 1;

  return (
    <div>
      <div className="-mx-6 -mt-6 px-6 pt-6 pb-4 bg-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Customers</h1>
            {data && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.total.toLocaleString()} {data.total === 1 ? "customer" : "customers"}
              </p>
            )}
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />New customer
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search name, phone, email…"
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex border border-border rounded-md overflow-hidden text-sm">
            {(["all", "individual", "company"] as TypeFilter[]).map(t => (
              <button
                key={t} onClick={() => setTypeF(t)}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  typeF === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {t === "all" ? "All" : t === "individual" ? "Individual" : "Company"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="-mx-6 h-6 bg-gradient-to-b from-white to-[#f2f3ff]" />

      <div className="-mx-6 -mb-6 px-6 pb-6 bg-[#f2f3ff] space-y-5">

      {/* Table */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Phone</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Vehicles</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden xl:table-cell">Last visit</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-destructive">
                  Failed to load customers.{" "}
                  <button onClick={() => qc.invalidateQueries({ queryKey: ["clients"] })} className="underline">
                    Retry
                  </button>
                </td>
              </tr>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-[15px] font-medium text-muted-foreground">
                      {deb ? "No customers match your search" : "No customers yet"}
                    </p>
                    {!deb && (
                      <Button size="sm" className="mt-1 gap-1.5" onClick={openCreate}>
                        <Plus className="w-4 h-4" />Add customer
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.data.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-[13px] leading-tight">{c.name}</p>
                        {c.company && <p className="text-[11px] text-muted-foreground leading-tight">{c.company}</p>}
                      </div>
                      <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 hidden sm:flex items-center gap-1 text-muted-foreground">
                        {c.type === "company" ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        {c.type}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-[13px]">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-[13px] truncate max-w-[180px]">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                      <Car className="w-3.5 h-3.5" />{c.vehicle_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-[13px]">
                    {fmtDate(c.last_visit)}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}`)}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2" />View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setBookingClientId(c.id); setBookingOpen(true); }}>
                          <CalendarCheck className="w-3.5 h-3.5 mr-2" />New Booking
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDelTarget(c)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} · {data.total} total</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <CustomerDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        client={editing}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["clients"] })}
      />

      <AlertDialog open={Boolean(delTarget)} onOpenChange={open => !open && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{delTarget?.name}</strong> from your CRM. Their service history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delTarget && deleteMutation.mutate(delTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingDrawer
        open={bookingOpen}
        onClose={() => { setBookingOpen(false); setBookingClientId(null); }}
        defaultClientId={bookingClientId}
      />
      </div>
    </div>
  );
}
