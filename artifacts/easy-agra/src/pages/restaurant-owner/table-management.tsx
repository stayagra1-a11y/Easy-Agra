import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useGetRestaurant,
  useGetRestaurantTables,
  useAddTable,
  useUpdateTable,
  useDeleteTable,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reserved: "bg-amber-100 text-amber-800 border-amber-200",
  occupied: "bg-red-100 text-red-800 border-red-200",
};

interface TableForm {
  tableNumber: string;
  capacity: string;
  status: "available" | "reserved" | "occupied";
}

const EMPTY_FORM: TableForm = { tableNumber: "", capacity: "2", status: "available" };

export default function TableManagement() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = parseInt(params.restaurantId, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TableForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const restaurantQuery = useGetRestaurant(restaurantId);
  const tablesQuery = useGetRestaurantTables(restaurantId);
  const addMut = useAddTable();
  const updateMut = useUpdateTable();
  const deleteMut = useDeleteTable();

  const tables = tablesQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getRestaurantTables"] });
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(t: any) {
    setEditId(t.id);
    setForm({ tableNumber: t.tableNumber, capacity: String(t.capacity), status: t.status });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.tableNumber.trim()) { toast({ title: "Table number required", variant: "destructive" }); return; }
    const payload = {
      tableNumber: form.tableNumber.trim(),
      capacity: parseInt(form.capacity, 10) || 2,
      status: form.status,
    };
    if (editId) {
      updateMut.mutate(
        { id: editId, data: payload },
        {
          onSuccess: () => { toast({ title: "Table updated ✓" }); setDialogOpen(false); invalidate(); },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    } else {
      addMut.mutate(
        { id: restaurantId, data: payload },
        {
          onSuccess: () => { toast({ title: "Table added ✓" }); setDialogOpen(false); invalidate(); },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    }
  }

  function handleDelete() {
    if (deleteId === null) return;
    deleteMut.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast({ title: "Table removed" }); setDeleteId(null); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
      },
    );
  }

  const available = tables.filter((t) => t.status === "available").length;
  const reserved = tables.filter((t) => t.status === "reserved").length;
  const occupied = tables.filter((t) => t.status === "occupied").length;

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/restaurant-owner/restaurants")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Table Management</h1>
            <p className="text-xs text-muted-foreground truncate">{restaurantQuery.data?.name ?? "Loading…"}</p>
          </div>
          <Button size="sm" className="bg-primary flex-shrink-0" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Table
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Available", count: available, color: "text-emerald-700 bg-emerald-50" },
            { label: "Reserved", count: reserved, color: "text-amber-700 bg-amber-50" },
            { label: "Occupied", count: occupied, color: "text-red-700 bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <div className="text-xl font-bold">{s.count}</div>
              <div className="text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tables grid */}
        {tablesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : tables.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-3">No tables added yet</p>
              <Button size="sm" className="bg-primary" onClick={openAdd}>
                <Plus className="w-3 h-3 mr-1" /> Add First Table
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t) => (
              <Card key={t.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-2xl font-black text-primary">{t.tableNumber}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.capacity} seats
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[11px] ${STATUS_COLORS[t.status] ?? ""}`}>
                      {t.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(t)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Table" : "Add Table"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Table Number *</label>
              <Input placeholder="e.g. T-01, A1, 5" value={form.tableNumber} onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Seating Capacity</label>
              <Input type="number" min="1" max="20" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={addMut.isPending || updateMut.isPending} className="bg-primary">
              {addMut.isPending || updateMut.isPending ? "Saving…" : editId ? "Update" : "Add Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Table?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This table will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
