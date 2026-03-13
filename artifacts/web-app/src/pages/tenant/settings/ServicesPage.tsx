import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, Tag, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import SettingsLayout from "@/layouts/SettingsLayout";
import { cn } from "@/lib/utils";

const TENANT = new URLSearchParams(window.location.search).get("tenant") ?? "demo-workshop";
const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CatalogItem {
  id: string; type: string; sku?: string; name: string;
  description?: string; unit: string; unit_price: string;
  cost_price?: string; taxable: boolean; is_active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  labour: "Labour", part: "Part", consumable: "Consumable",
  sublet: "Sublet", package: "Package",
};
const TYPE_COLORS: Record<string, string> = {
  labour: "bg-blue-50 text-blue-700 border-blue-200",
  part: "bg-emerald-50 text-emerald-700 border-emerald-200",
  consumable: "bg-amber-50 text-amber-700 border-amber-200",
  sublet: "bg-purple-50 text-purple-700 border-purple-200",
  package: "bg-rose-50 text-rose-700 border-rose-200",
};

const EMPTY_FORM = {
  type: "labour", sku: "", name: "", description: "",
  unit: "each", unit_price: "", cost_price: "", taxable: true,
};

function ItemDialog({ open, onClose, item }: {
  open: boolean; onClose: () => void; item?: CatalogItem | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(item ?? {}) });

  const mutation = useMutation({
    mutationFn: () => {
      if (item) {
        return fetch(`${API}/api/settings/catalog/${item.id}?tenant=${TENANT}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
      }
      return fetch(`${API}/api/settings/catalog?tenant=${TENANT}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog", TENANT] });
      toast.success(item ? "Service updated" : "Service added");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle>{item ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SKU / Code</Label>
              <Input value={form.sku} onChange={set("sku")} placeholder="OIL-CHANGE-5W30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={set("name")} placeholder="Oil Change — 5W-30" required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={set("description")} placeholder="Optional description…" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={set("unit")} placeholder="each" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit price</Label>
              <Input value={form.unit_price} onChange={set("unit_price")} placeholder="0.00" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label>Cost price</Label>
              <Input value={form.cost_price} onChange={set("cost_price")} placeholder="0.00" type="number" min="0" step="0.01" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Taxable</Label>
              <p className="text-xs text-muted-foreground">Apply VAT to this item</p>
            </div>
            <Switch
              checked={form.taxable}
              onCheckedChange={(v) => setForm((p) => ({ ...p, taxable: v }))}
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.name} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : item ? "Save changes" : "Add service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editItem, setEditItem] = useState<CatalogItem | null | undefined>(undefined);

  const { data, isLoading } = useQuery<{ items: CatalogItem[] }>({
    queryKey: ["catalog", TENANT],
    queryFn: () => fetch(`${API}/api/settings/catalog?tenant=${TENANT}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      fetch(`${API}/api/settings/catalog/${id}?tenant=${TENANT}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", TENANT] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/api/settings/catalog/${id}?tenant=${TENANT}`, { method: "DELETE" })
        .then((r) => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog", TENANT] });
      toast.success("Service removed");
    },
    onError: () => toast.error("Failed to remove service"),
  });

  const items = data?.items ?? [];
  const filtered = items.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
      || (item.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || item.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeCounts = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SettingsLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">Services & pricing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Master catalog of services, labour, parts, and packages.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setEditItem(null)}>
            <Plus className="w-4 h-4" />Add service
          </Button>
        </div>

        {/* Type filters */}
        {!isLoading && items.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
                typeFilter === "all"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              All · {items.length}
            </button>
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
                  typeFilter === type
                    ? TYPE_COLORS[type]
                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {TYPE_LABELS[type]} · {count}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full h-8 pl-9 pr-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">SKU</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Price</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Tax</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-8 mx-auto rounded-full" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "No services match your search" : "No services in catalog yet"}
                    </p>
                    {!search && (
                      <Button size="sm" className="mt-3 gap-1.5" onClick={() => setEditItem(null)}>
                        <Plus className="w-3.5 h-3.5" />Add first service
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    !item.is_active && "opacity-50",
                  )}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-foreground">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        TYPE_COLORS[item.type] ?? "bg-muted text-muted-foreground border-border",
                      )}>
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {item.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-sm">
                      {parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-center text-xs text-muted-foreground">
                      {item.taxable ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: item.id, is_active: v })}
                        className="scale-75"
                      />
                    </td>
                    <td className="px-4 py-3 w-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditItem(item)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive.mutate({ id: item.id, is_active: !item.is_active })}
                          >
                            {item.is_active
                              ? <><EyeOff className="w-3.5 h-3.5 mr-2" />Deactivate</>
                              : <><Eye className="w-3.5 h-3.5 mr-2" />Activate</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm(`Remove "${item.name}"?`)) deleteItem.mutate(item.id); }}
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
      </div>

      {editItem !== undefined && (
        <ItemDialog open={true} onClose={() => setEditItem(undefined)} item={editItem} />
      )}
    </SettingsLayout>
  );
}
