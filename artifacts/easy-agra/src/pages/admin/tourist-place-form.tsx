import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetTouristPlace } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Save } from "lucide-react";
import { apiRequest } from "@/lib/api-request";

export default function TouristPlaceForm() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!params.id;
  const placeId = params.id ? parseInt(params.id) : null;

  const { data: existing, isLoading: loadingExisting } = useGetTouristPlace(
    placeId!,
    { query: { enabled: !!placeId } as any },
  );

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    historicalInfo: "",
    openingTime: "06:00",
    closingTime: "18:00",
    ticketPriceIndian: "",
    ticketPriceForeign: "",
    ticketPriceChild: "",
    bestTimeToVisit: "",
    address: "",
    googleMapsLink: "",
    latitude: "",
    longitude: "",
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        slug: existing.slug ?? "",
        shortDescription: existing.shortDescription ?? "",
        description: existing.description ?? "",
        historicalInfo: existing.historicalInfo ?? "",
        openingTime: existing.openingTime ?? "06:00",
        closingTime: existing.closingTime ?? "18:00",
        ticketPriceIndian: existing.ticketPriceIndian != null ? String(existing.ticketPriceIndian) : "",
        ticketPriceForeign: existing.ticketPriceForeign != null ? String(existing.ticketPriceForeign) : "",
        ticketPriceChild: existing.ticketPriceChild != null ? String(existing.ticketPriceChild) : "",
        bestTimeToVisit: existing.bestTimeToVisit ?? "",
        address: existing.address ?? "",
        googleMapsLink: existing.googleMapsLink ?? "",
        latitude: existing.latitude != null ? String(existing.latitude) : "",
        longitude: existing.longitude != null ? String(existing.longitude) : "",
        city: existing.city ?? "Agra",
        state: existing.state ?? "Uttar Pradesh",
        country: existing.country ?? "India",
        isActive: existing.isActive ?? true,
        isFeatured: existing.isFeatured ?? false,
        sortOrder: existing.sortOrder ?? 0,
      });
    }
  }, [existing]);

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const set = (field: string, value: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!form.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        ticketPriceIndian: form.ticketPriceIndian || null,
        ticketPriceForeign: form.ticketPriceForeign || null,
        ticketPriceChild: form.ticketPriceChild || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (isEdit && placeId) {
        await apiRequest(`/tourist-places/${placeId}`, { method: "PUT", body: payload });
        toast({ title: "Updated!", description: `${form.name} has been updated.` });
      } else {
        const created = await apiRequest("/tourist-places", { method: "POST", body: payload }) as any;
        toast({ title: "Created!", description: `${form.name} has been added.` });
        navigate(`/admin/tourist-places/${created.id}/photos`);
        queryClient.invalidateQueries({ queryKey: ["/tourist-places"] });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/tourist-places"] });
      navigate("/admin/tourist-places");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/admin/tourist-places")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Tourist Place" : "Add Tourist Place"}</h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? `Editing: ${existing?.name}` : "Fill in details to add a new tourist destination"}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Place Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!isEdit) set("slug", autoSlug(e.target.value));
                  }}
                  placeholder="e.g. Taj Mahal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="e.g. taj-mahal"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={form.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                placeholder="One-line description shown on cards"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Detailed description of the place..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Historical Information</Label>
              <Textarea
                value={form.historicalInfo}
                onChange={(e) => set("historicalInfo", e.target.value)}
                placeholder="Historical background, who built it, when..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timings & Tickets */}
        <Card>
          <CardHeader><CardTitle className="text-base">Timings & Entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opening Time</Label>
                <Input type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Input type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Indian Ticket Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ticketPriceIndian}
                  onChange={(e) => set("ticketPriceIndian", e.target.value)}
                  placeholder="0 = Free"
                />
              </div>
              <div className="space-y-2">
                <Label>Foreign Ticket Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ticketPriceForeign}
                  onChange={(e) => set("ticketPriceForeign", e.target.value)}
                  placeholder="0 = Free"
                />
              </div>
              <div className="space-y-2">
                <Label>Child Ticket Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ticketPriceChild}
                  onChange={(e) => set("ticketPriceChild", e.target.value)}
                  placeholder="0 = Free"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Best Time to Visit</Label>
              <Input
                value={form.bestTimeToVisit}
                onChange={(e) => set("bestTimeToVisit", e.target.value)}
                placeholder="e.g. October to March, early morning"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full street address"
              />
            </div>
            <div className="space-y-2">
              <Label>Google Maps Link</Label>
              <Input
                value={form.googleMapsLink}
                onChange={(e) => set("googleMapsLink", e.target.value)}
                placeholder="https://maps.google.com/?q=..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                  placeholder="27.1751"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                  placeholder="78.0421"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Visible to customers when active</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Show on homepage and featured sections</p>
              </div>
              <Switch checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-muted-foreground">Lower number = shown first</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Save Changes" : "Create Place"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/tourist-places")}>
            Cancel
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
