import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Megaphone, Hotel, Utensils, Sparkles, Landmark,
  Plus, Trash2, Edit, ChevronUp, ChevronDown, Search, Star,
  Image, X, Check, GripVertical
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner form types
// ─────────────────────────────────────────────────────────────────────────────

type BannerCategory = "home" | "hotels" | "restaurants" | "spas" | "tourist_places";

interface BannerFormData {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  category: BannerCategory;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const EMPTY_BANNER: BannerFormData = {
  title: "",
  subtitle: "",
  imageUrl: "",
  buttonText: "",
  buttonLink: "",
  category: "home",
  isActive: true,
  startDate: "",
  endDate: "",
};

const CATEGORY_LABELS: Record<BannerCategory, string> = {
  home: "Home / General",
  hotels: "Hotels",
  restaurants: "Restaurants",
  spas: "Spas",
  tourist_places: "Tourist Places",
};

// ─────────────────────────────────────────────────────────────────────────────
// Banner Dialog
// ─────────────────────────────────────────────────────────────────────────────

function BannerDialog({
  open,
  banner,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  banner: any | null;
  onClose: () => void;
  onSave: (data: BannerFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<BannerFormData>(EMPTY_BANNER);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title ?? "",
        subtitle: banner.subtitle ?? "",
        imageUrl: banner.imageUrl ?? "",
        buttonText: banner.buttonText ?? "",
        buttonLink: banner.buttonLink ?? "",
        category: banner.category ?? "home",
        isActive: banner.isActive ?? true,
        startDate: banner.startDate ?? "",
        endDate: banner.endDate ?? "",
      });
      setImagePreview(banner.imageUrl ?? "");
    } else {
      setForm(EMPTY_BANNER);
      setImagePreview("");
    }
  }, [banner, open]);

  const set = (k: keyof BannerFormData, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setImagePreview(b64);
    set("imageUrl", b64);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{banner ? "Edit Banner" : "Create Banner"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image */}
          <div>
            <Label>Banner Image *</Label>
            {imagePreview && (
              <div className="relative mt-2 mb-3 rounded-lg overflow-hidden border h-40 bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImagePreview(""); set("imageUrl", ""); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Image className="h-4 w-4 mr-1" /> Upload Image
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <span className="text-xs text-muted-foreground self-center">or</span>
              <Input
                placeholder="Paste image URL…"
                value={imagePreview.startsWith("data:") ? "" : imagePreview}
                onChange={(e) => { setImagePreview(e.target.value); set("imageUrl", e.target.value); }}
                className="flex-1 h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Banner headline" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as BannerCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Optional short description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Button Text</Label>
              <Input value={form.buttonText} onChange={(e) => set("buttonText", e.target.value)} placeholder="e.g. Explore Now" />
            </div>
            <div>
              <Label>Button Link</Label>
              <Input value={form.buttonLink} onChange={(e) => set("buttonLink", e.target.value)} placeholder="/hotels" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date (optional)</Label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            <Label>Active (visible to users)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.title || !form.imageUrl}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {banner ? "Save Changes" : "Create Banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banners Tab
// ─────────────────────────────────────────────────────────────────────────────

function BannersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: banners = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-banners"],
    queryFn: () => apiFetch("/admin/marketing/banners"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-banners"] });

  const createMut = useMutation({
    mutationFn: (data: BannerFormData) => apiFetch("/admin/marketing/banners", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Banner created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BannerFormData> }) =>
      apiFetch(`/admin/marketing/banners/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidate(); setDialogOpen(false); setEditing(null); toast({ title: "Banner updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/marketing/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: "Banner deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorderMut = useMutation({
    mutationFn: (order: { id: number; displayOrder: number }[]) =>
      apiFetch("/admin/marketing/banners/reorder", { method: "PATCH", body: JSON.stringify({ order }) }),
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = filterCat === "all" ? banners : banners.filter((b: any) => b.category === filterCat);

  function moveItem(index: number, direction: -1 | 1) {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= filtered.length) return;
    const reordered = [...filtered];
    [reordered[index], reordered[newIdx]] = [reordered[newIdx], reordered[index]];
    const order = reordered.map((b: any, i: number) => ({ id: b.id, displayOrder: i }));
    reorderMut.mutate(order);
  }

  function handleSave(data: BannerFormData) {
    if (editing) {
      updateMut.mutate({ id: editing.id, data });
    } else {
      createMut.mutate(data);
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} banner{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Banner
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No banners yet. Create your first banner to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((banner: any, index: number) => (
            <Card key={banner.id} className={`overflow-hidden ${!banner.isActive ? "opacity-60" : ""}`}>
              <div className="flex gap-0">
                {/* Image */}
                <div className="w-48 min-h-28 flex-shrink-0 bg-muted">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" style={{ maxHeight: 112 }} />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Image className="h-8 w-8 text-muted-foreground opacity-40" /></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex items-start gap-3">
                  <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                    <button disabled={index === 0} onClick={() => moveItem(index, -1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button disabled={index === filtered.length - 1} onClick={() => moveItem(index, 1)} className="p-0.5 hover:bg-muted rounded disabled:opacity-30">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{banner.title}</span>
                      <Badge variant={banner.isActive ? "default" : "secondary"} className="text-xs">
                        {banner.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {CATEGORY_LABELS[banner.category as BannerCategory] ?? banner.category}
                      </Badge>
                    </div>
                    {banner.subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{banner.subtitle}</p>}
                    {(banner.startDate || banner.endDate) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {banner.startDate && `From ${banner.startDate}`}
                        {banner.startDate && banner.endDate && " — "}
                        {banner.endDate && `Until ${banner.endDate}`}
                      </p>
                    )}
                    {banner.buttonText && (
                      <p className="text-xs mt-1">Button: <span className="font-medium">{banner.buttonText}</span> → {banner.buttonLink}</p>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(banner); setDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => { if (confirm("Delete this banner?")) deleteMut.mutate(banner.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BannerDialog
        open={dialogOpen}
        banner={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Featured Tab
// ─────────────────────────────────────────────────────────────────────────────

interface FeaturedTabProps {
  type: "hotels" | "restaurants" | "spas" | "places";
  label: string;
  icon: React.ReactNode;
  idKey: string;
  nameKey: string;
  cityKey?: string;
}

function FeaturedTab({ type, label, icon, idKey, nameKey, cityKey }: FeaturedTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const queryKey = ["admin-featured", type, debouncedSearch];
  const endpoint = `/admin/marketing/featured-${type}`;
  const addEndpoint = `/admin/marketing/featured-${type}`;
  const removeEndpoint = (itemId: number) => `/admin/marketing/featured-${type}/${itemId}`;
  const reorderEndpoint = `/admin/marketing/featured-${type}/reorder`;

  const { data, isLoading } = useQuery<{ featured: any[]; all: any[] }>({
    queryKey,
    queryFn: () => apiFetch(`${endpoint}${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-featured", type] });

  const addMut = useMutation({
    mutationFn: (itemId: number) =>
      apiFetch(addEndpoint, { method: "POST", body: JSON.stringify({ [`${type === "places" ? "place" : type.slice(0, -1)}Id`]: itemId }) }),
    onSuccess: () => { invalidate(); toast({ title: `${label.slice(0, -1)} added to featured` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (itemId: number) => apiFetch(removeEndpoint(itemId), { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast({ title: `Removed from featured` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorderMut = useMutation({
    mutationFn: (order: { id: number; displayOrder: number }[]) =>
      apiFetch(reorderEndpoint, { method: "PATCH", body: JSON.stringify({ order }) }),
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const featured: any[] = data?.featured ?? [];
  const all: any[] = data?.all ?? [];

  function moveItem(index: number, direction: -1 | 1) {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= featured.length) return;
    const reordered = [...featured];
    [reordered[index], reordered[newIdx]] = [reordered[newIdx], reordered[index]];
    reorderMut.mutate(reordered.map((item, i) => ({ id: item.id, displayOrder: i })));
  }

  const featuredIds = new Set(featured.map((f) => f[idKey]));

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Currently Featured */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            Featured {label}
            <Badge className="bg-amber-500 text-white">{featured.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Drag to reorder display position on homepage</p>
        </CardHeader>
        <CardContent>
          {featured.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No featured {label.toLowerCase()} yet
            </div>
          ) : (
            <div className="space-y-2">
              {featured.map((item: any, index: number) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button disabled={index === 0} onClick={() => moveItem(index, -1)} className="p-0.5 hover:bg-amber-200 rounded disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button disabled={index === featured.length - 1} onClick={() => moveItem(index, 1)} className="p-0.5 hover:bg-amber-200 rounded disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-6 h-6 rounded bg-amber-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-800">{index + 1}</span>
                  </div>
                  {item.coverPhoto && !item.coverPhoto.includes("unsplash") ? (
                    <img src={item.coverPhoto} alt="" className="w-10 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-8 rounded bg-amber-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item[nameKey] ?? item.hotelName ?? item.restaurantName ?? item.spaName ?? item.placeName ?? "Unknown"}
                    </p>
                    {cityKey && item[cityKey] && <p className="text-xs text-muted-foreground">{item[cityKey]}</p>}
                  </div>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 flex-shrink-0"
                    onClick={() => removeMut.mutate(item[idKey])}
                    disabled={removeMut.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Available */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All {label}</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {all.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">No {label.toLowerCase()} found</p>
            ) : (
              all.map((item: any) => {
                const isFeatured = featuredIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      isFeatured ? "border-amber-300 bg-amber-50" : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.city && <p className="text-xs text-muted-foreground">{item.city}</p>}
                      {item.category && <p className="text-xs text-muted-foreground capitalize">{item.category}</p>}
                    </div>
                    {isFeatured ? (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 flex-shrink-0">
                        <Check className="h-3 w-3 mr-1" /> Featured
                      </Badge>
                    ) : (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs flex-shrink-0"
                        onClick={() => addMut.mutate(item.id)}
                        disabled={addMut.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Feature
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Marketing Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing System
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage banners and control what appears as featured on the homepage
          </p>
        </div>

        <Tabs defaultValue="banners">
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="banners" className="flex items-center gap-1.5 text-xs">
              <Megaphone className="h-3.5 w-3.5" /> Banners
            </TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-1.5 text-xs">
              <Hotel className="h-3.5 w-3.5" /> Hotels
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-1.5 text-xs">
              <Utensils className="h-3.5 w-3.5" /> Restaurants
            </TabsTrigger>
            <TabsTrigger value="spas" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Spas
            </TabsTrigger>
            <TabsTrigger value="places" className="flex items-center gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" /> Places
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banners">
            <BannersTab />
          </TabsContent>

          <TabsContent value="hotels">
            <FeaturedTab
              type="hotels"
              label="Hotels"
              icon={<Hotel className="h-4 w-4" />}
              idKey="hotelId"
              nameKey="hotelName"
              cityKey="hotelCity"
            />
          </TabsContent>

          <TabsContent value="restaurants">
            <FeaturedTab
              type="restaurants"
              label="Restaurants"
              icon={<Utensils className="h-4 w-4" />}
              idKey="restaurantId"
              nameKey="restaurantName"
              cityKey="restaurantCity"
            />
          </TabsContent>

          <TabsContent value="spas">
            <FeaturedTab
              type="spas"
              label="Spas"
              icon={<Sparkles className="h-4 w-4" />}
              idKey="spaId"
              nameKey="spaName"
              cityKey="spaCity"
            />
          </TabsContent>

          <TabsContent value="places">
            <FeaturedTab
              type="places"
              label="Tourist Places"
              icon={<Landmark className="h-4 w-4" />}
              idKey="placeId"
              nameKey="placeName"
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
