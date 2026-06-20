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
import { ChevronLeft, Camera, X, Utensils } from "lucide-react";
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
  cuisineType: string;
  seatingCapacity: string;
  coverPhoto: string;
  galleryPhotos: string[];
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
  cuisineType: "",
  seatingCapacity: "",
  coverPhoto: "",
  galleryPhotos: [],
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
        cuisineType: r.cuisineType ?? "",
        seatingCapacity: r.seatingCapacity ? String(r.seatingCapacity) : "",
        coverPhoto: r.coverPhoto ?? "",
        galleryPhotos: Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [],
      });
    }
  }, [getQuery.data]);

  function set(key: keyof FormState, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("coverPhoto", ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (form.galleryPhotos.length + files.length > 8) {
      toast({ title: "Max 8 gallery photos", variant: "destructive" });
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setForm((f) => ({ ...f, galleryPhotos: [...f.galleryPhotos, ev.target?.result as string] }));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
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
      cuisineType: form.cuisineType.trim() || undefined,
      seatingCapacity: form.seatingCapacity ? parseInt(form.seatingCapacity, 10) : undefined,
      coverPhoto: form.coverPhoto || undefined,
      galleryPhotos: form.galleryPhotos,
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
          <h1 className="text-lg font-bold">{isEdit ? "Edit Restaurant" : "Add Restaurant"}</h1>
        </div>

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
                <label className="text-xs text-muted-foreground mb-1 block">Cuisine Type</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.cuisineType}
                  onChange={(e) => set("cuisineType", e.target.value)}
                >
                  <option value="">Select cuisine</option>
                  {CUISINE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
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
