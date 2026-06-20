import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useGetRestaurant,
  useGetRestaurantMenu,
  useAddMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Camera, X, Leaf, Drumstick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "starters", label: "Starters" },
  { value: "main_course", label: "Main Course" },
  { value: "fast_food", label: "Fast Food" },
  { value: "desserts", label: "Desserts" },
  { value: "beverages", label: "Beverages" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

const CATEGORY_COLORS: Record<string, string> = {
  starters: "bg-orange-100 text-orange-700",
  main_course: "bg-teal-100 text-teal-700",
  fast_food: "bg-red-100 text-red-700",
  desserts: "bg-pink-100 text-pink-700",
  beverages: "bg-blue-100 text-blue-700",
};

interface ItemForm {
  name: string;
  category: Category;
  description: string;
  price: string;
  itemPhoto: string;
  isVeg: boolean;
  isAvailable: boolean;
}

const EMPTY_FORM: ItemForm = {
  name: "",
  category: "main_course",
  description: "",
  price: "",
  itemPhoto: "",
  isVeg: true,
  isAvailable: true,
};

export default function MenuManagement() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = parseInt(params.restaurantId, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photoRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const restaurantQuery = useGetRestaurant(restaurantId);
  const menuQuery = useGetRestaurantMenu(restaurantId);
  const addMut = useAddMenuItem();
  const updateMut = useUpdateMenuItem();
  const deleteMut = useDeleteMenuItem();

  const allItems = menuQuery.data ?? [];
  const filtered = activeCategory === "all" ? allItems : allItems.filter((i) => i.category === activeCategory);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getRestaurantMenu"] });
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      price: String(item.price),
      itemPhoto: item.itemPhoto ?? "",
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
    });
    setDialogOpen(true);
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, itemPhoto: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSave() {
    if (!form.name.trim() || !form.price) { toast({ title: "Name and price required", variant: "destructive" }); return; }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      itemPhoto: form.itemPhoto || undefined,
      isVeg: form.isVeg,
      isAvailable: form.isAvailable,
    };

    if (editId) {
      updateMut.mutate(
        { id: editId, data: payload },
        {
          onSuccess: () => { toast({ title: "Item updated ✓" }); setDialogOpen(false); invalidate(); },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    } else {
      addMut.mutate(
        { id: restaurantId, data: payload },
        {
          onSuccess: () => { toast({ title: "Item added ✓" }); setDialogOpen(false); invalidate(); },
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
        onSuccess: () => { toast({ title: "Item removed" }); setDeleteId(null); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
      },
    );
  }

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/restaurant-owner/restaurants")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Menu Management</h1>
            <p className="text-xs text-muted-foreground truncate">{restaurantQuery.data?.name ?? "Loading…"}</p>
          </div>
          <Button size="sm" className="bg-primary flex-shrink-0" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const count = allItems.filter((i) => i.category === c.value).length;
            return (
              <div key={c.value} className="bg-muted/40 rounded-xl p-2 text-center">
                <div className="text-base font-bold text-foreground">{count}</div>
                <div className="text-[11px] text-muted-foreground">{c.label}</div>
              </div>
            );
          })}
        </div>

        {/* Items */}
        {menuQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No items in this category</p>
              <Button size="sm" className="mt-3 bg-primary" onClick={openAdd}>
                <Plus className="w-3 h-3 mr-1" /> Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {item.itemPhoto ? (
                      <img src={item.itemPhoto} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        {item.isVeg ? <Leaf className="w-6 h-6 text-green-600" /> : <Drumstick className="w-6 h-6 text-red-600" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-sm truncate">{item.name}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] ?? "bg-muted text-muted-foreground"}`}>
                          {CATEGORIES.find((c) => c.value === item.category)?.label}
                        </span>
                        {item.isVeg
                          ? <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1">VEG</span>
                          : <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-1">NON-VEG</span>}
                        {!item.isAvailable && <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1">Unavailable</span>}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{item.description}</p>}
                      <div className="font-bold text-primary">₹{typeof item.price === "number" ? item.price.toFixed(2) : item.price}</div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Item Name *</label>
              <Input placeholder="e.g. Paneer Tikka" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Price (₹) *</label>
                <Input type="number" min="0" step="0.50" placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Textarea placeholder="Brief description…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.isVeg} onCheckedChange={(v) => setForm((f) => ({ ...f, isVeg: v }))} />
                <span className="text-sm">{form.isVeg ? "🌿 Veg" : "🍗 Non-Veg"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))} />
                <span className="text-sm">Available</span>
              </div>
            </div>
            {/* Photo */}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {form.itemPhoto ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={form.itemPhoto} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm((f) => ({ ...f, itemPhoto: "" }))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground/60 hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px]">Add Photo</span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={addMut.isPending || updateMut.isPending} className="bg-primary">
              {addMut.isPending || updateMut.isPending ? "Saving…" : editId ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Menu Item?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This item will be permanently removed from your menu.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
