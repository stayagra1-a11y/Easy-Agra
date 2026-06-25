import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-request";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Link } from "wouter";
import { ArrowLeft, Save, Loader2, Image, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPES = [
  { value: "railway_station", label: "Railway Station" },
  { value: "bus_stand", label: "Bus Stand" },
  { value: "airport", label: "Airport" },
];

interface TransportForm {
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  pincode: string;
  state: string;
  googleMapsLink: string;
  contactNumber: string;
  timings: string;
  mainImage: string;
  image1: string;
  image2: string;
  image3: string;
  isActive: boolean;
}

const emptyForm: TransportForm = {
  name: "",
  type: "railway_station",
  description: "",
  address: "",
  city: "",
  pincode: "",
  state: "",
  googleMapsLink: "",
  contactNumber: "",
  timings: "",
  mainImage: "",
  image1: "",
  image2: "",
  image3: "",
  isActive: true,
};

async function fetchTransportDetail(id: string) {
  const res = await fetch(`${BASE}/api/transport/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

export default function TransportForm() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = params.id;
  const isEdit = !!id;

  const { data: existing } = useQuery({
    queryKey: ["transport", id],
    queryFn: () => fetchTransportDetail(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState<TransportForm>({ ...emptyForm });

  // Sync form when existing data loads
  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        name: existing.name || "",
        type: existing.type || "railway_station",
        description: existing.description || "",
        address: existing.address || "",
        city: existing.city || "",
        pincode: existing.pincode || "",
        state: existing.state || "",
        googleMapsLink: existing.googleMapsLink || "",
        contactNumber: existing.contactNumber || "",
        timings: existing.timings || "",
        mainImage: existing.mainImage || "",
        image1: existing.image1 || "",
        image2: existing.image2 || "",
        image3: existing.image3 || "",
        isActive: existing.isActive ?? true,
      });
    }
  }, [isEdit, existing]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof TransportForm, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "mainImage" | "image1" | "image2" | "image3") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setField(fieldName, url);
      toast({ title: "Image uploaded!" });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Please enter a name", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        pincode: form.pincode.trim() || null,
        state: form.state.trim() || null,
        googleMapsLink: form.googleMapsLink.trim() || null,
        contactNumber: form.contactNumber.trim() || null,
        timings: form.timings.trim() || null,
        mainImage: form.mainImage || null,
        image1: form.image1 || null,
        image2: form.image2 || null,
        image3: form.image3 || null,
        isActive: form.isActive,
      };

      if (isEdit) {
        await apiRequest(`${BASE}/api/admin/transport/${id}`, {
          method: "PUT",
          body: payload,
        });
        toast({ title: "Updated!", description: "Transport location updated successfully" });
      } else {
        await apiRequest(`${BASE}/api/admin/transport`, {
          method: "POST",
          body: payload,
        });
        toast({ title: "Created!", description: "Transport location added successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-transport"] });
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      navigate("/admin/transport");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/transport">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">{isEdit ? "Edit Transport Location" : "Add Transport Location"}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Agra Cantt Railway Station" />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} placeholder="Short description about this location..." />
            </div>

            {/* Address Section */}
            <div className="space-y-1.5">
              <Label>Full Address</Label>
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Street / Building / Area" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Agra" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="Uttar Pradesh" />
              </div>
              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <Input value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} placeholder="282001" />
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="space-y-1.5">
              <Label>Google Maps Link</Label>
              <Input value={form.googleMapsLink} onChange={(e) => setField("googleMapsLink", e.target.value)} placeholder="https://www.google.com/maps/place/..." />
            </div>

            {/* Contact Number */}
            <div className="space-y-1.5">
              <Label>Contact Number</Label>
              <Input value={form.contactNumber} onChange={(e) => setField("contactNumber", e.target.value)} placeholder="e.g. 139" />
            </div>

            {/* Timings */}
            <div className="space-y-1.5">
              <Label>Timings (Optional)</Label>
              <Input value={form.timings} onChange={(e) => setField("timings", e.target.value)} placeholder="e.g. 24 Hours or 6:00 AM - 10:00 PM" />
            </div>

            {/* Images */}
            <div className="space-y-1.5">
              <Label>Main Image</Label>
              {form.mainImage && (
                <div className="relative w-40 h-24 rounded-lg overflow-hidden mb-2">
                  <img src={form.mainImage} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setField("mainImage", "")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "mainImage")} className="text-sm" />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
            </div>

            {/* Extra Photos (3 more) */}
            <div className="space-y-1.5">
              <Label>Additional Photos (3)</Label>
              <p className="text-xs text-muted-foreground">Upload extra photos to showcase this location. You can change these later.</p>
              <div className="grid grid-cols-3 gap-3">
                {(["image1", "image2", "image3"] as const).map((imgKey, i) => (
                  <div key={imgKey} className="space-y-2">
                    {(form as any)[imgKey] && (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden">
                        <img src={(form as any)[imgKey]} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setField(imgKey, "")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, imgKey)} className="text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} />
              <Label>Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Update Location" : "Create Location"}
          </Button>
          <Link href="/admin/transport">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
