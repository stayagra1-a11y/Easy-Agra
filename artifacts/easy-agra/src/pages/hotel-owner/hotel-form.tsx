import { useState, useRef, useEffect } from "react";
import {
  useCreateHotel, useUpdateHotel, useGetHotel, getGetHotelQueryKey, getListHotelsQueryKey,
  useGetHotelNearbyPlaces, useAddHotelNearbyPlace, useUpdateHotelNearbyPlace, useDeleteHotelNearbyPlace,
  getGetHotelNearbyPlacesQueryKey,
} from "@workspace/api-client-react";
import type { HotelInput, HotelUpdate, HotelNearbyPlace } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, Phone, Info, Wifi, Image, Save, Send, Loader2, IndianRupee, Clock, Navigation, Plus, Pencil, Trash2, Check, X, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { UpiSettingsCard } from "@/components/upi-settings-card";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const AMENITIES_LIST = [
  "Free WiFi", "Parking", "Air Conditioning", "Restaurant", "Spa",
  "Room Service", "Swimming Pool", "Lift", "Power Backup", "Laundry", "CCTV Security",
];

function ImageUpload({
  label,
  value,
  onChange,
  multiple,
}: {
  label: string;
  value: string | string[] | null | undefined;
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((f) => uploadToCloudinary(f))
      );
      if (multiple) {
        onChange([...((value as string[]) || []), ...uploads]);
      } else {
        onChange(uploads[0]);
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not upload image. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (multiple) {
    const images = (value as string[]) || [];
    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt="" className="w-full h-20 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >×</button>
            </div>
          ))}
          {images.length < 8 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl">+</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {value ? (
        <div className="relative group">
          <img src={value as string} alt="" className="w-full h-36 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >Remove</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors gap-2"
        >
          <Image className="h-8 w-8 opacity-40" />
          <span className="text-xs">Tap to upload cover image</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

const PHOTO_CATEGORY_OPTIONS = [
  { value: "room", label: "Room", emoji: "🛏" },
  { value: "lobby", label: "Lobby", emoji: "🏛" },
  { value: "facade", label: "Exterior", emoji: "🏨" },
  { value: "nearby", label: "Nearby", emoji: "📍" },
] as const;

function CategorizedPhotoSection({
  photos,
  onChange,
}: {
  photos: { url: string; category: string }[];
  onChange: (photos: { url: string; category: string }[]) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("room");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(Array.from(files).map((f) => uploadToCloudinary(f)));
      onChange([...photos, ...uploads.map((url) => ({ url, category: selectedCategory }))]);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" /> Gallery Photos (Categorized)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">Select a category, then upload photos for it.</p>

        {/* Category selector */}
        <div className="grid grid-cols-4 gap-2">
          {PHOTO_CATEGORY_OPTIONS.map((cat) => {
            const count = photos.filter((p) => p.category === cat.value).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold ${selectedCategory === cat.value ? "text-primary" : "text-muted-foreground"}`}>
                    {count} photo{count !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Upload button for selected category */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-12 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {uploading ? "Uploading..." : `Add ${PHOTO_CATEGORY_OPTIONS.find((c) => c.value === selectedCategory)?.label ?? ""} photos`}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {/* Photos by category */}
        {PHOTO_CATEGORY_OPTIONS.map((cat) => {
          const catPhotos = photos.filter((p) => p.category === cat.value);
          if (!catPhotos.length) return null;
          return (
            <div key={cat.value}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{cat.emoji} {cat.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {catPhotos.map((photo, i) => {
                  const globalIdx = photos.findIndex((p) => p.url === photo.url && p.category === cat.value);
                  return (
                    <div key={i} className="relative group aspect-square">
                      <img src={photo.url} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(globalIdx)}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {photos.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-2">No photos uploaded yet</p>
        )}
      </CardContent>
    </Card>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  tourist_place: "Tourist Place",
  railway_station: "Railway Station",
  airport: "Airport",
  bus_stand: "Bus Stand",
  hospital: "Hospital",
  market: "Market",
  other: "Other",
};

function NearbyPlacesManager({ hotelId }: { hotelId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetHotelNearbyPlaces(hotelId);
  const addMutation = useAddHotelNearbyPlace();
  const updateMutation = useUpdateHotelNearbyPlace();
  const deleteMutation = useDeleteHotelNearbyPlace();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ placeName: "", category: "tourist_place", distanceKm: "", estimatedTimeMinutes: "" });

  const nearby = data?.nearby ?? [];

  const resetForm = () => {
    setForm({ placeName: "", category: "tourist_place", distanceKm: "", estimatedTimeMinutes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (item: HotelNearbyPlace) => {
    setForm({
      placeName: item.placeName,
      category: item.category,
      distanceKm: item.distanceKm != null ? String(item.distanceKm) : "",
      estimatedTimeMinutes: item.estimatedTimeMinutes != null ? String(item.estimatedTimeMinutes) : "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.placeName.trim()) { toast({ title: "Jagah ka naam zaroori hai", variant: "destructive" }); return; }
    const payload = {
      placeName: form.placeName.trim(),
      category: form.category as any,
      distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : undefined,
      estimatedTimeMinutes: form.estimatedTimeMinutes ? parseInt(form.estimatedTimeMinutes, 10) : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: hotelId, nearbyId: editingId, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHotelNearbyPlacesQueryKey(hotelId) }); resetForm(); toast({ title: "Updated!" }); },
        onError: (err: any) => toast({ title: err?.data?.error ?? err?.message ?? "Kuch galat ho gaya, dobara try karein", variant: "destructive" }),
      });
    } else {
      addMutation.mutate({ id: hotelId, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHotelNearbyPlacesQueryKey(hotelId) }); resetForm(); toast({ title: "Added!" }); },
        onError: (err: any) => toast({ title: err?.data?.error ?? err?.message ?? "Kuch galat ho gaya, dobara try karein", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (nearbyId: number) => {
    deleteMutation.mutate({ id: hotelId, nearbyId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHotelNearbyPlacesQueryKey(hotelId) }); toast({ title: "Deleted" }); },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" /> Nearby Distances
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Add/Edit form */}
        {showForm && (
          <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/30">
            <div>
              <Label className="text-xs">Jagah ka naam *</Label>
              <Input className="mt-1 h-8 text-sm" placeholder="Jaise: Taj Mahal" value={form.placeName} onChange={(e) => setForm((f) => ({ ...f, placeName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <select
                className="w-full mt-1 h-8 text-sm rounded-md border border-input bg-background px-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Distance (km)</Label>
                <Input className="mt-1 h-8 text-sm" type="number" step="0.1" placeholder="2.5" value={form.distanceKm} onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Time (minutes)</Label>
                <Input className="mt-1 h-8 text-sm" type="number" placeholder="10" value={form.estimatedTimeMinutes} onChange={(e) => setForm((f) => ({ ...f, estimatedTimeMinutes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleSave} disabled={addMutation.isPending || updateMutation.isPending}>
                <Check className="h-3.5 w-3.5" /> {editingId ? "Update" : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={resetForm}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {!isLoading && nearby.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground text-center py-4">Abhi tak koi distance add nahi ki. "Add" button dabayein.</p>
        )}
        {nearby.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{item.placeName}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category] ?? item.category}</p>
            </div>
            <div className="text-right shrink-0">
              {item.distanceKm != null && <p className="text-xs font-medium">{item.distanceKm} km</p>}
              {item.estimatedTimeMinutes != null && <p className="text-xs text-muted-foreground">{item.estimatedTimeMinutes} min</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => startEdit(item)} className="p-1 rounded hover:bg-muted transition-colors">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

type FormData = {
  name: string;
  description: string;
  category: string;
  starRating: number | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  googleMapLink: string;
  landmark: string;
  contactPerson: string;
  contactMobile: string;
  contactEmail: string;
  website: string;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: string;
  policies: string;
  cancellationPolicy: string;
  amenities: string[];
  coverImage: string;
  galleryImages: string[];
  categorizedPhotos: { url: string; category: string }[];
  earlyCheckInEnabled: boolean;
  earlyCheckInTime: string;
  earlyCheckInPrice: string;
};

const EMPTY_FORM: FormData = {
  name: "", description: "", category: "standard", starRating: null,
  address: "", city: "", state: "", pincode: "", googleMapLink: "", landmark: "",
  contactPerson: "", contactMobile: "", contactEmail: "", website: "",
  checkInTime: "14:00", checkOutTime: "11:00",
  totalRooms: "", policies: "", cancellationPolicy: "",
  amenities: [], coverImage: "", galleryImages: [], categorizedPhotos: [],
  earlyCheckInEnabled: false, earlyCheckInTime: "", earlyCheckInPrice: "",
};

export default function HotelForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const hotelId = params.id ? parseInt(params.id, 10) : undefined;

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("basic");
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const draftKey = `hotel_draft_${hotelId ?? "new"}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on load
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Object.keys(parsed).length > 0) {
          setHasDraft(true);
        }
      } catch { /* ignore */ }
    }
  }, [draftKey]);

  // Auto-save draft every 2s after last change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const minimal = JSON.stringify(form);
      if (minimal.length > 2 && minimal !== "{}") {
        localStorage.setItem(draftKey, minimal);
        setDraftSaved(true);
        setHasDraft(false);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [form, draftKey]);

  function restoreDraft() {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setForm((prev) => ({ ...EMPTY_FORM, ...parsed }));
        toast({ title: "Draft restored!", description: "Saved data recovered successfully." });
        setHasDraft(false);
      } catch { toast({ title: "Could not restore draft", variant: "destructive" }); }
    }
  }

  function clearDraft() {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setDraftSaved(false);
  }

  function progressPercent() {
    const req = [form.name, form.address, form.city, form.state, form.contactMobile, form.coverImage];
    const filled = req.filter(Boolean).length;
    return Math.round((filled / req.length) * 100);
  }

  const { data: existingHotel } = useGetHotel(hotelId!, {
    query: { enabled: isEdit && !!hotelId, queryKey: getGetHotelQueryKey(hotelId!) },
  });

  useEffect(() => {
    if (existingHotel && isEdit) {
      setForm({
        name: existingHotel.name || "",
        description: existingHotel.description || "",
        category: existingHotel.category || "standard",
        starRating: (existingHotel as any).starRating ?? null,
        address: existingHotel.address || "",
        city: existingHotel.city || "",
        state: existingHotel.state || "",
        pincode: existingHotel.pincode || "",
        googleMapLink: existingHotel.googleMapLink || "",
        landmark: existingHotel.landmark || "",
        contactPerson: existingHotel.contactPerson || "",
        contactMobile: existingHotel.contactMobile || "",
        contactEmail: existingHotel.contactEmail || "",
        website: existingHotel.website || "",
        checkInTime: existingHotel.checkInTime || "14:00",
        checkOutTime: existingHotel.checkOutTime || "11:00",
        totalRooms: existingHotel.totalRooms?.toString() || "",
        policies: existingHotel.policies || "",
        cancellationPolicy: existingHotel.cancellationPolicy || "",
        amenities: existingHotel.amenities || [],
        coverImage: existingHotel.coverImage || "",
        galleryImages: existingHotel.galleryImages || [],
        categorizedPhotos: (existingHotel as any).categorizedPhotos || [],
        earlyCheckInEnabled: (existingHotel as any).earlyCheckInEnabled ?? false,
        earlyCheckInTime: (existingHotel as any).earlyCheckInTime || "",
        earlyCheckInPrice: (existingHotel as any).earlyCheckInPrice?.toString() || "",
      });
    }
  }, [existingHotel, isEdit]);

  const set = (key: keyof FormData) => (val: any) => setForm((f) => ({ ...f, [key]: val }));
  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const buildPayload = (): HotelInput => ({
    name: form.name.trim(),
    description: form.description || undefined,
    category: form.category as any,
    starRating: form.starRating ?? undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    pincode: form.pincode || undefined,
    googleMapLink: form.googleMapLink || undefined,
    landmark: form.landmark || undefined,
    contactPerson: form.contactPerson || undefined,
    contactMobile: form.contactMobile || undefined,
    contactEmail: form.contactEmail || undefined,
    website: form.website || undefined,
    checkInTime: form.checkInTime || undefined,
    checkOutTime: form.checkOutTime || undefined,
    totalRooms: form.totalRooms ? parseInt(form.totalRooms, 10) : undefined,
    policies: form.policies || undefined,
    cancellationPolicy: form.cancellationPolicy || undefined,
    amenities: form.amenities,
    coverImage: form.coverImage || undefined,
    galleryImages: form.galleryImages,
    categorizedPhotos: form.categorizedPhotos,
    earlyCheckInEnabled: form.earlyCheckInEnabled,
    earlyCheckInTime: form.earlyCheckInTime || undefined,
    earlyCheckInPrice: form.earlyCheckInPrice ? parseFloat(form.earlyCheckInPrice) : undefined,
  } as any);

  const createMutation = useCreateHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        clearDraft();
        toast({ title: "Hotel created!", description: "Saved as draft. Submit for approval when ready." });
        navigate("/hotel-owner/hotels");
      },
      onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error || "Could not create hotel.", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        toast({ title: "Hotel updated!" });
        navigate("/hotel-owner/hotels");
      },
      onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error || "Could not update hotel.", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Hotel name required", variant: "destructive" });
      setActiveTab("basic");
      return;
    }
    if (isEdit && hotelId) {
      updateMutation.mutate({ id: hotelId, data: buildPayload() as HotelUpdate });
    } else {
      createMutation.mutate({ data: buildPayload() });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const toggleAmenity = (a: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  };

  return (
    <OwnerLayout>
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/hotel-owner/hotels">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{isEdit ? "Edit Hotel" : "Add New Hotel"}</h1>
            <p className="text-xs text-muted-foreground">{isEdit ? "Update hotel information" : "Fill in details and save as draft"}</p>
          </div>
          {draftSaved && (
            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">Saved</span>
          )}
        </div>

        {/* Draft restore banner */}
        {hasDraft && !isEdit && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-800">Aapka draft save hua tha</p>
              <p className="text-[10px] text-blue-600">Pehle se bharaya hua data restore karein</p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700" onClick={restoreDraft}>Restore</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearDraft}>Clear</Button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!isEdit && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Profile complete</span>
              <span className="text-xs font-medium text-primary">{progressPercent()}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent()}%` }} />
            </div>
          </div>
        )}

        {/* Approved hotel notice */}
        {isEdit && existingHotel && !["draft", "rejected"].includes((existingHotel as any).status ?? "") && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Hotel approved hai</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Hotel ki basic details lock hain. Sirf <strong>Media tab</strong> se cover photo aur gallery photos update kar sakte hain.</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto p-1 gap-1 overflow-x-auto">
            <TabsTrigger value="basic" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Building2 className="h-3.5 w-3.5" /> Basic
            </TabsTrigger>
            <TabsTrigger value="location" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <MapPin className="h-3.5 w-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Phone className="h-3.5 w-3.5" /> Contact
            </TabsTrigger>
            <TabsTrigger value="amenities" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Wifi className="h-3.5 w-3.5" /> Amenities
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Image className="h-3.5 w-3.5" /> Media
            </TabsTrigger>
            {isEdit && (
              <TabsTrigger value="nearby" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
                <Navigation className="h-3.5 w-3.5" /> Nearby
              </TabsTrigger>
            )}
            {isEdit && (
              <TabsTrigger value="payment" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
                <IndianRupee className="h-3.5 w-3.5" /> UPI
              </TabsTrigger>
            )}
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic" className="mt-3 space-y-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Hotel Name <span className="text-destructive">*</span></Label>
                  <Input id="name" placeholder="e.g. Hotel Taj View" value={form.name} onChange={setField("name")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc" className="text-xs">Description</Label>
                  <Textarea id="desc" placeholder="Describe your hotel..." value={form.description} onChange={setField("description")} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={set("category")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Star Rating</Label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, starRating: f.starRating === star ? null : star }))}
                        className="focus:outline-none transition-transform active:scale-90"
                      >
                        <Star
                          className="h-7 w-7"
                          fill={form.starRating != null && star <= form.starRating ? "#f59e0b" : "none"}
                          stroke={form.starRating != null && star <= form.starRating ? "#f59e0b" : "#d1d5db"}
                        />
                      </button>
                    ))}
                    {form.starRating && (
                      <span className="text-xs text-muted-foreground ml-1">{form.starRating} Star</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Star pe click karein — dobara click se hatao</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Hotel Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Check-in Time</Label>
                    <Input type="time" value={form.checkInTime} onChange={setField("checkInTime")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-out Time</Label>
                    <Input type="time" value={form.checkOutTime} onChange={setField("checkOutTime")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Rooms</Label>
                  <Input type="number" placeholder="e.g. 50" value={form.totalRooms} onChange={setField("totalRooms")} min={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hotel Policies</Label>
                  <Textarea placeholder="No smoking, pets allowed with prior approval..." value={form.policies} onChange={setField("policies")} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cancellation Policy</Label>
                  <Textarea placeholder="Free cancellation up to 24 hours before check-in..." value={form.cancellationPolicy} onChange={setField("cancellationPolicy")} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Early Check-in */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Early Check-in (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Allow Early Check-in</p>
                    <p className="text-xs text-muted-foreground">Guests can request early check-in for extra charge</p>
                  </div>
                  <Switch
                    checked={form.earlyCheckInEnabled}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, earlyCheckInEnabled: v }))}
                  />
                </div>
                {form.earlyCheckInEnabled && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Early Check-in Time</Label>
                      <Input type="time" value={form.earlyCheckInTime} onChange={setField("earlyCheckInTime")} placeholder="e.g. 08:00" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Early Check-in Charge (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" className="pl-8" placeholder="e.g. 500" min={0} value={form.earlyCheckInPrice} onChange={setField("earlyCheckInPrice")} />
                      </div>
                      <p className="text-xs text-muted-foreground">One-time charge added to booking total</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location */}
          <TabsContent value="location" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Address</Label>
                  <Textarea placeholder="Street address..." value={form.address} onChange={setField("address")} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Landmark</Label>
                  <Input placeholder="Near Taj Mahal East Gate" value={form.landmark} onChange={setField("landmark")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input placeholder="Agra" value={form.city} onChange={setField("city")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input placeholder="Uttar Pradesh" value={form.state} onChange={setField("state")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pincode</Label>
                  <Input placeholder="282001" value={form.pincode} onChange={setField("pincode")} maxLength={6} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Google Maps Link</Label>
                  <Input placeholder="https://maps.google.com/..." value={form.googleMapLink} onChange={setField("googleMapLink")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person</Label>
                  <Input placeholder="Name of manager / front desk" value={form.contactPerson} onChange={setField("contactPerson")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input placeholder="+91 9876543210" value={form.contactMobile} onChange={setField("contactMobile")} type="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input placeholder="hotel@example.com" value={form.contactEmail} onChange={setField("contactEmail")} type="email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Website (Optional)</Label>
                  <Input placeholder="https://yourhotel.com" value={form.website} onChange={setField("website")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Amenities */}
          <TabsContent value="amenities" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" /> Amenities
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {AMENITIES_LIST.map((a) => (
                    <div key={a} className="flex items-center gap-2.5">
                      <Checkbox
                        id={a}
                        checked={form.amenities.includes(a)}
                        onCheckedChange={() => toggleAmenity(a)}
                      />
                      <Label htmlFor={a} className="text-sm cursor-pointer">{a}</Label>
                    </div>
                  ))}
                </div>
                {form.amenities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-4">{form.amenities.length} amenities selected</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="mt-3 space-y-4">
            <Card>
              <CardContent className="px-4 py-4">
                <ImageUpload
                  label="Cover Image"
                  value={form.coverImage}
                  onChange={(v) => setForm((f) => ({ ...f, coverImage: v as string }))}
                />
              </CardContent>
            </Card>
            <CategorizedPhotoSection
              photos={form.categorizedPhotos}
              onChange={(photos) => setForm((f) => ({ ...f, categorizedPhotos: photos }))}
            />
          </TabsContent>

          {/* Nearby Places */}
          {isEdit && (
            <TabsContent value="nearby" className="mt-3">
              <NearbyPlacesManager hotelId={parseInt(params.id as string, 10)} />
            </TabsContent>
          )}

          {/* UPI Payment Settings */}
          {isEdit && (
            <TabsContent value="payment" className="mt-3">
              <UpiSettingsCard
                entityType="hotel"
                entityId={parseInt(params.id as string, 10)}
                currentUpiId={(existingHotel as any)?.upiId ?? null}
                currentQrImage={(existingHotel as any)?.upiQrImage ?? null}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Save button */}
        <div className="flex gap-2 pt-2">
          <Link href="/hotel-owner/hotels" className="flex-1">
            <Button variant="outline" className="w-full" disabled={isSaving}>Cancel</Button>
          </Link>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : isEdit ? "Update Hotel" : "Save as Draft"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
}
