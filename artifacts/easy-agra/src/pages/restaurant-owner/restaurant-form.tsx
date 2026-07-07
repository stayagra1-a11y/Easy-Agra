import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useCreateRestaurant,
  useUpdateRestaurant,
  useGetRestaurant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Camera, X, Utensils, Save } from "lucide-react";
import { UpiSettingsCard } from "@/components/upi-settings-card";
import { useToast } from "@/hooks/use-toast";

const CUISINE_TYPES = [
  "North Indian", "South Indian", "Chinese", "Continental",
  "Italian", "Mexican", "Fast Food", "Mughlai", "Street Food",
  "Seafood", "Multi-Cuisine", "Vegetarian", "Cafe",
];

interface FormState {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  contactNumber: string;
  contactEmail: string;
  openingTime: string;
  closingTime: string;
  cuisineTypes: string[];
  seatingCapacity: string;
  coverPhoto: string;
  galleryPhotos: string[];
  googleMapLink: string;
}

const INITIAL: FormState = {
  name: "",
  description: "",
  address: "",
  city: "Agra",
  state: "Uttar Pradesh",
  contactNumber: "",
  contactEmail: "",
  openingTime: "10:00",
  closingTime: "22:00",
  cuisineTypes: [],
  seatingCapacity: "",
  coverPhoto: "",
  galleryPhotos: [],
  googleMapLink: "",
};

export default function RestaurantForm() {
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;
  const restaurantId = isEdit ? parseInt(params.id, 10) : null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const draftKey = `restaurant_draft_${restaurantId ?? "new"}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try { if (Object.keys(JSON.parse(raw)).length > 0) setHasDraft(true); } catch { /* ignore */ }
    }
  }, [draftKey]);

  // Auto-save draft every 2s
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
        setForm((prev) => ({ ...INITIAL, ...JSON.parse(raw) }));
        toast({ title: "Draft restored!", description: "Saved data recovered." });
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
    const req = [form.name, form.address, form.city, form.state, form.contactNumber, form.coverPhoto];
    return Math.round((req.filter(Boolean).length / req.length) * 100);
  }

  const getQuery = useGetRestaurant(restaurantId!, {
    query: { enabled: isEdit && !!restaurantId } as any,
  });
  const createMut = useCreateRestaurant();
  const updateMut = useUpdateRestaurant();

  useEffect(() => {
    if (getQuery.data) {
      const r = getQuery.data;
      setForm({
        name: r.name ?? "",
        description: r.description ?? "",
        address: r.address ?? "",
        city: r.city ?? "Agra",
        state: r.state ?? "Uttar Pradesh",
        contactNumber: r.contactNumber ?? "",
        contactEmail: r.contactEmail ?? "",
        openingTime: r.openingTime ?? "10:00",
        closingTime: r.closingTime ?? "22:00",
        cuisineTypes: r.cuisineType ? r.cuisineType.split(",").map((s) => s.trim()).filter(Boolean) : [],
        seatingCapacity: r.seatingCapacity ? String(r.seatingCapacity) : "",
        coverPhoto: r.coverPhoto ?? "",
        galleryPhotos: Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [],
        googleMapLink: r.googleMapLink ?? "",
      });
    }
  }, [getQuery.data]);

  function set(key: keyof FormState, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const url = await uploadToCloudinary(file);
      set("coverPhoto", url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (form.galleryPhotos.length + files.length > 8) {
      toast({ title: "Max 8 gallery photos", variant: "destructive" });
      return;
    }
    e.target.value = "";
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setForm((f) => ({ ...f, galleryPhotos: [...f.galleryPhotos, ...urls] }));
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  }

  function removeGalleryPhoto(i: number) {
    setForm((f) => ({ ...f, galleryPhotos: f.galleryPhotos.filter((_, idx) => idx !== i) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Restaurant name required", variant: "destructive" }); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      contactNumber: form.contactNumber.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      openingTime: form.openingTime || undefined,
      closingTime: form.closingTime || undefined,
      cuisineType: form.cuisineTypes.length > 0 ? form.cuisineTypes.join(", ") : undefined,
      seatingCapacity: form.seatingCapacity ? parseInt(form.seatingCapacity, 10) : undefined,
      coverPhoto: form.coverPhoto || undefined,
      galleryPhotos: form.galleryPhotos,
      googleMapLink: form.googleMapLink.trim() || undefined,
    };

    if (isEdit && restaurantId) {
      updateMut.mutate(
        { id: restaurantId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Restaurant updated ✓" });
            queryClient.invalidateQueries({ queryKey: ["getMyRestaurants"] });
            navigate("/restaurant-owner/restaurants");
          },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    } else {
      createMut.mutate(
        { data: payload },
        {
          onSuccess: () => {
            clearDraft();
            toast({ title: "Restaurant added ✓" });
            queryClient.invalidateQueries({ queryKey: ["getMyRestaurants"] });
            navigate("/restaurant-owner/restaurants");
          },
          onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
        },
      );
    }
  }

  if (isEdit && getQuery.isLoading) {
    return (
      <OwnerLayout>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </OwnerLayout>
    );
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/restaurant-owner/restaurants")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{isEdit ? "Edit Restaurant" : "Add Restaurant"}</h1>
          </div>
          {draftSaved && (
            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">Saved</span>
          )}
        </div>

        {/* Draft restore */}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Restaurant Name *</label>
                <Input placeholder="e.g. Taj Mahal Restaurant" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea placeholder="Describe your restaurant…" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Cuisine Type
                  {form.cuisineTypes.length > 0 && (
                    <span className="ml-2 text-primary font-medium">{form.cuisineTypes.length} selected</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CUISINE_TYPES.map((c) => {
                    const checked = form.cuisineTypes.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            cuisineTypes: checked
                              ? f.cuisineTypes.filter((x) => x !== c)
                              : [...f.cuisineTypes, c],
                          }))
                        }
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                          checked
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className={`h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${checked ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {checked && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="currentColor"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {c}
                      </button>
                    );
                  })}
                </div>
                {form.cuisineTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {form.cuisineTypes.join(", ")}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seating Capacity</label>
                <Input type="number" min="1" placeholder="e.g. 50" value={form.seatingCapacity} onChange={(e) => set("seatingCapacity", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                <Textarea placeholder="Street address…" value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City</label>
                  <Input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">State</label>
                  <Input placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Google Maps Link (optional)</label>
                <Input
                  placeholder="https://maps.google.com/..."
                  value={form.googleMapLink}
                  onChange={(e) => set("googleMapLink", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Google Maps pe apni location search karein → Share → Link copy karein
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Hours */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact & Timings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contact Number</label>
                  <Input placeholder="Phone" value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input type="email" placeholder="Email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Opening Time</label>
                  <Input type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Closing Time</label>
                  <Input type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Cover Photo</label>
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                {form.coverPhoto ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border">
                    <img src={form.coverPhoto} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => set("coverPhoto", "")} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground/60 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">Upload Cover Photo</span>
                  </button>
                )}
              </div>

              {/* Gallery */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Gallery Photos ({form.galleryPhotos.length}/8)</label>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                <div className="flex flex-wrap gap-2">
                  {form.galleryPhotos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeGalleryPhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.galleryPhotos.length < 8 && (
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground/60 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px]">Add</span>
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isEdit && restaurantId && (
            <UpiSettingsCard
              entityType="restaurant"
              entityId={restaurantId}
              currentUpiId={(getQuery.data as any)?.upiId ?? null}
              currentQrImage={(getQuery.data as any)?.upiQrImage ?? null}
            />
          )}

          <Button type="submit" className="w-full h-12 bg-primary text-base font-semibold" disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Update Restaurant" : "Add Restaurant"}
          </Button>
        </form>
      </div>
    </OwnerLayout>
  );
}
