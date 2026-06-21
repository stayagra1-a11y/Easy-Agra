import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import {
  useCreateSpa,
  useUpdateSpa,
  useGetSpaById,
  getGetMySpasListQueryKey,
  getGetSpaOwnerStatsQueryKey,
} from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Sparkles, ImagePlus, Trash2, Upload } from "lucide-react";
import { UpiSettingsCard } from "@/components/upi-settings-card";
import { uploadToCloudinary } from "@/lib/cloudinary";

const FACILITIES = [
  "Steam Bath",
  "Sauna",
  "Massage Rooms",
  "Jacuzzi",
  "Aromatherapy",
  "Couples Spa",
  "Beauty Treatments",
  "Wellness Packages",
];

interface SpaFormState {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  contactNumber: string;
  contactEmail: string;
  openingTime: string;
  closingTime: string;
  coverPhoto: string;
  galleryPhotos: string[];
  facilities: string[];
}

const EMPTY: SpaFormState = {
  name: "",
  description: "",
  address: "",
  city: "",
  state: "",
  contactNumber: "",
  contactEmail: "",
  openingTime: "09:00",
  closingTime: "21:00",
  coverPhoto: "",
  galleryPhotos: [],
  facilities: [],
};

export default function SpaForm() {
  const params = useParams<{ id?: string }>();
  const editId = params.id ? parseInt(params.id, 10) : null;
  const isEdit = editId !== null;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SpaFormState>(EMPTY);
  const [galleryInput, setGalleryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      set("coverPhoto", url);
      toast({ title: "Cover photo uploaded!" });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo. Try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadToCloudinary));
      set("galleryPhotos", [...form.galleryPhotos, ...urls]);
      toast({ title: `${urls.length} photo${urls.length > 1 ? "s" : ""} added!` });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo. Try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const { data: existingSpa, isLoading: loadingSpa } = useGetSpaById(
    editId ?? 0,
    { query: { enabled: isEdit } as any },
  );

  const createMutation = useCreateSpa();
  const updateMutation = useUpdateSpa();

  useEffect(() => {
    if (existingSpa && isEdit) {
      setForm({
        name: existingSpa.name ?? "",
        description: existingSpa.description ?? "",
        address: existingSpa.address ?? "",
        city: existingSpa.city ?? "",
        state: existingSpa.state ?? "",
        contactNumber: existingSpa.contactNumber ?? "",
        contactEmail: existingSpa.contactEmail ?? "",
        openingTime: existingSpa.openingTime ?? "09:00",
        closingTime: existingSpa.closingTime ?? "21:00",
        coverPhoto: existingSpa.coverPhoto ?? "",
        galleryPhotos: existingSpa.galleryPhotos ?? [],
        facilities: existingSpa.facilities ?? [],
      });
    }
  }, [existingSpa, isEdit]);

  function set(field: keyof SpaFormState, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleFacility(facility: string) {
    setForm((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  }

  function addGalleryPhoto() {
    const url = galleryInput.trim();
    if (!url) return;
    setForm((prev) => ({
      ...prev,
      galleryPhotos: [...prev.galleryPhotos, url],
    }));
    setGalleryInput("");
  }

  function removeGalleryPhoto(idx: number) {
    setForm((prev) => ({
      ...prev,
      galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Spa name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      contactNumber: form.contactNumber.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      openingTime: form.openingTime || null,
      closingTime: form.closingTime || null,
      coverPhoto: form.coverPhoto.trim() || null,
      galleryPhotos: form.galleryPhotos,
      facilities: form.facilities,
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getGetMySpasListQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSpaOwnerStatsQueryKey() });
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: editId!, data: payload },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Spa updated" });
            navigate("/spa-owner/spas");
          },
          onError: () => {
            toast({ title: "Failed to update spa", variant: "destructive" });
            setSaving(false);
          },
        },
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Spa created! Submit it for approval when ready." });
            navigate("/spa-owner/spas");
          },
          onError: () => {
            toast({ title: "Failed to create spa", variant: "destructive" });
            setSaving(false);
          },
        },
      );
    }
  }

  if (isEdit && loadingSpa) {
    return (
      <OwnerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/spa-owner/spas")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">
              {isEdit ? "Edit Spa" : "Add New Spa"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Update your spa details"
                : "Fill in the details and submit for approval"}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Spa Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Serene Bliss Spa"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A luxurious spa experience in the heart of Agra..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="123 Taj Road"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Agra"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="Uttar Pradesh"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={form.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="spa@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Operating Hours</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="openingTime">Opening Time</Label>
              <Input
                id="openingTime"
                type="time"
                value={form.openingTime}
                onChange={(e) => set("openingTime", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="closingTime">Closing Time</Label>
              <Input
                id="closingTime"
                type="time"
                value={form.closingTime}
                onChange={(e) => set("closingTime", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Facilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3">
              {FACILITIES.map((facility) => (
                <div key={facility} className="flex items-center gap-2">
                  <Checkbox
                    id={facility}
                    checked={form.facilities.includes(facility)}
                    onCheckedChange={() => toggleFacility(facility)}
                  />
                  <Label htmlFor={facility} className="text-sm font-normal cursor-pointer">
                    {facility}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hidden file inputs */}
            <input ref={coverFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
            <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleGalleryUpload(e.target.files); e.target.value = ""; }} />

            <div>
              <Label htmlFor="coverPhoto">Cover Photo</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2 mt-1 border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Phone se cover photo upload karo"}
              </Button>
              {form.coverPhoto && (
                <img
                  src={form.coverPhoto}
                  alt="Cover"
                  className="mt-2 w-full h-32 object-cover rounded-lg"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ya URL daalo</span>
                </div>
              </div>
              <Input
                id="coverPhoto"
                value={form.coverPhoto}
                onChange={(e) => set("coverPhoto", e.target.value)}
                placeholder="https://example.com/spa-cover.jpg"
              />
            </div>

            <div>
              <Label>Gallery Photos</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2 mt-1 border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => galleryFileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Gallery photos upload karo (multiple)"}
              </Button>
              <div className="flex gap-2 mt-2">
                <Input
                  value={galleryInput}
                  onChange={(e) => setGalleryInput(e.target.value)}
                  placeholder="Ya URL paste karo..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGalleryPhoto();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addGalleryPhoto}>
                  Add
                </Button>
              </div>
              {form.galleryPhotos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {form.galleryPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-muted rounded p-2"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-10 w-10 object-cover rounded"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <span className="text-xs flex-1 truncate">{url}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => removeGalleryPhoto(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* UPI Settings */}
        {isEdit && editId && (
          <UpiSettingsCard
            entityType="spa"
            entityId={editId}
            currentUpiId={(existingSpa as any)?.upiId ?? null}
            currentQrImage={(existingSpa as any)?.upiQrImage ?? null}
          />
        )}

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isEdit ? "Save Changes" : "Create Spa"}
        </Button>
      </form>
    </OwnerLayout>
  );
}
