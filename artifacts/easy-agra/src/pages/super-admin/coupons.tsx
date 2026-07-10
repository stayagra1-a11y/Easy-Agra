import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Tag, Search, ToggleLeft } from "lucide-react";

const BASE = getApiBase();

async function fetchCoupons(search: string, type: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type && type !== "all") params.set("type", type);
  const res = await fetch(`${BASE}/api/admin/coupons?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch coupons");
  return res.json();
}

const APPLICABLE_ON_OPTIONS = ["all", "hotel", "restaurant", "spa"] as const;

const EMPTY_FORM = {
  code: "", name: "", description: "", type: "global", discountType: "percentage",
  discountValue: "", minOrderValue: "", maxDiscount: "", startDate: "", endDate: "",
  maxUses: "", isActive: true, applicableOn: ["all"] as string[],
};

export default function CouponsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", search, typeFilter],
    queryFn: () => fetchCoupons(search, typeFilter),
  });

  const coupons: any[] = data?.coupons ?? [];

  const saveMutation = useMutation({
    mutationFn: async (body: any) => {
      const url = editId ? `${BASE}/api/admin/coupons/${editId}` : `${BASE}/api/admin/coupons`;
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save coupon"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editId ? "Coupon updated" : "Coupon created" });
      setDialogOpen(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/admin/coupons/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); toast({ title: "Coupon deleted" }); },
    onError: () => toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`${BASE}/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: () => toast({ title: "Error", description: "Failed to toggle coupon", variant: "destructive" }),
  });

  const openEdit = (coupon: any) => {
    setEditId(coupon.id);
    setForm({
      code: coupon.code ?? "",
      name: coupon.name ?? "",
      description: coupon.description ?? "",
      type: coupon.type ?? "global",
      discountType: coupon.discountType ?? "percentage",
      discountValue: coupon.discountValue ?? "",
      minOrderValue: coupon.minOrderValue ?? "",
      maxDiscount: coupon.maxDiscount ?? "",
      startDate: coupon.startDate ?? "",
      endDate: coupon.endDate ?? "",
      maxUses: coupon.maxUses ?? "",
      isActive: coupon.isActive ?? true,
      applicableOn: Array.isArray(coupon.applicableOn) && coupon.applicableOn.length ? coupon.applicableOn : ["all"],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code || !form.name || !form.discountValue) {
      toast({ title: "Validation Error", description: "Code, name, and discount value are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      ...form,
      discountValue: parseFloat(form.discountValue),
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
    });
  };

  const typeColors: Record<string, string> = {
    global: "bg-blue-100 text-blue-700",
    festival: "bg-purple-100 text-purple-700",
    first_booking: "bg-green-100 text-green-700",
    seasonal: "bg-orange-100 text-orange-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-primary" />Coupon Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage discount coupons for the platform</p>
          </div>
          <Button onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); }} className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />New Coupon
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by code..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="first_booking">First Booking</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No coupons found. Create your first coupon!</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell><code className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-sm">{c.code}</code></TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[c.type] ?? "bg-gray-100 text-gray-700"}`}>{c.type?.replace("_", " ")}</span></TableCell>
                      <TableCell>
                        {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        {c.maxDiscount ? <span className="text-xs text-muted-foreground ml-1">(max ₹{c.maxDiscount})</span> : null}
                      </TableCell>
                      <TableCell>{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.startDate ? c.startDate : "Any"} – {c.endDate ? c.endDate : "No expiry"}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.isActive} onCheckedChange={v => toggleMutation.mutate({ id: c.id, isActive: v })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Sale" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="first_booking">First Booking</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Applicable On</Label>
              <div className="flex gap-4 flex-wrap pt-1">
                {APPLICABLE_ON_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-primary"
                      checked={form.applicableOn.includes(opt)}
                      onChange={() => {
                        setForm(f => {
                          if (opt === "all") return { ...f, applicableOn: ["all"] };
                          const withoutAll = f.applicableOn.filter(x => x !== "all");
                          const next = withoutAll.includes(opt)
                            ? withoutAll.filter(x => x !== opt)
                            : [...withoutAll, opt];
                          return { ...f, applicableOn: next.length === 0 ? ["all"] : next };
                        });
                      }}
                    />
                    <span className="text-sm capitalize">{opt === "all" ? "All" : opt + "s"}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select which business types this coupon applies to</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Discount Value *</Label>
                <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === "percentage" ? "20" : "500"} />
              </div>
              <div className="space-y-1.5">
                <Label>Min Order (₹)</Label>
                <Input type="number" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Discount (₹)</Label>
                <Input type="number" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Max Uses</Label>
                <Input type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-primary">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editId ? "Update" : "Create"} Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The coupon will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
