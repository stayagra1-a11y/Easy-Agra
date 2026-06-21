import { useState, useRef } from "react";
import { useParams } from "wouter";
import {
  useGetSpaServices,
  useCreateSpaService,
  useDeleteSpaService,
  useGetMySpasList,
  getGetSpaServicesQueryKey,
} from "@workspace/api-client-react";
import { apiRequest } from "@/lib/api-request";
import { useQueryClient } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  Plus, Edit2, Trash2, Loader2, Sparkles, ArrowLeft, ImagePlus,
  Clock, BadgeIndianRupee, CheckCircle2, XCircle
} from "lucide-react";
import { Link } from "wouter";

const CATEGORIES = [
  { value: "full_body_massage", label: "Full Body Massage" },
  { value: "head_massage", label: "Head Massage" },
  { value: "foot_massage", label: "Foot Massage" },
  { value: "aromatherapy", label: "Aromatherapy" },
  { value: "facial", label: "Facial" },
  { value: "beauty_treatment", label: "Beauty Treatment" },
  { value: "couples_therapy", label: "Couples Therapy" },
  { value: "wellness_package", label: "Wellness Package" },
] as const;

type ServiceCategory = (typeof CATEGORIES)[number]["value"];

interface ServiceForm {
  name: string;
  category: ServiceCategory;
  description: string;
  duration: string;
  price: string;
  serviceImage: string;
  isAvailable: boolean;
}

const blank: ServiceForm = {
  name: "",
  category: "full_body_massage",
  description: "",
  duration: "60",
  price: "",
  serviceImage: "",
  isAvailable: true,
};

export default function SpaServices() {
  const { id } = useParams<{ id: string }>();
  const spaId = parseInt(id, 10);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: services = [], isLoading } = useGetSpaServices(spaId);
  const { data: mySpasList = [] } = useGetMySpasList();

  const spa = mySpasList.find((s) => s.id === spaId);

  const createMutation = useCreateSpaService();
  const deleteMutation = useDeleteSpaService();
  const [updatePending, setUpdatePending] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(blank);
  const [uploading, setUploading] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);

  const handleImgUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, serviceImage: url }));
      toast({ title: "Photo uploaded!" });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetSpaServicesQueryKey(spaId) });
  }

  function openAdd() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }

  function openEdit(svc: any) {
    setEditing(svc.id);
    setForm({
      name: svc.name,
      category: svc.category,
      description: svc.description ?? "",
      duration: String(svc.duration),
      price: String(svc.price),
      serviceImage: svc.serviceImage ?? "",
      isAvailable: svc.isAvailable,
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description || null,
      duration: parseInt(form.duration, 10),
      price: parseFloat(form.price),
      serviceImage: form.serviceImage || null,
      isAvailable: form.isAvailable,
    };

    try {
      if (editing) {
        setUpdatePending(true);
        await apiRequest(`/api/spa-services/${editing}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setUpdatePending(false);
        toast({ title: "Service updated" });
      } else {
        await createMutation.mutateAsync({ id: spaId, data: payload as any });
        toast({ title: "Service added" });
      }
      setOpen(false);
      invalidate();
    } catch {
      setUpdatePending(false);
      toast({ title: "Error saving service", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Service deleted" });
      invalidate();
    } catch {
      toast({ title: "Error deleting service", variant: "destructive" });
    }
  }

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/spa-owner/spas">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {spa ? spa.name : "Spa"} — Services
            </h1>
            <p className="text-xs text-muted-foreground">
              {services.length} service{services.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-3">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No services yet</p>
              <p className="text-sm text-muted-foreground">
                Add services to let customers book appointments
              </p>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((svc) => (
              <Card key={svc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{svc.name}</span>
                        {svc.isAvailable ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {categoryLabel(svc.category)}
                      </Badge>
                      {svc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {svc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {svc.duration} min
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <BadgeIndianRupee className="h-3.5 w-3.5" />
                          ₹{Number(svc.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(svc)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Service</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "{svc.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(svc.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="svc-name">Service Name *</Label>
                <Input
                  id="svc-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Deep Tissue Massage"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as ServiceCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="svc-desc">Description</Label>
                <Textarea
                  id="svc-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="svc-dur">Duration (min) *</Label>
                  <Input
                    id="svc-dur"
                    type="number"
                    min={5}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="svc-price">Price (₹) *</Label>
                  <Input
                    id="svc-price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="svc-img">Service Image</Label>
                <input ref={imgFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImgUpload(f); e.target.value = ""; }} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2 border-dashed border-2 border-primary/40 text-primary hover:bg-primary/5"
                  onClick={() => imgFileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Phone se photo upload karo"}
                </Button>
                {form.serviceImage && (
                  <img src={form.serviceImage} alt="Preview"
                    className="w-full h-28 object-cover rounded-md mt-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ya URL daalo</span>
                  </div>
                </div>
                <Input
                  id="svc-img"
                  value={form.serviceImage}
                  onChange={(e) => setForm({ ...form, serviceImage: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Available for Booking</p>
                  <p className="text-xs text-muted-foreground">Customers can book this service</p>
                </div>
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending || updatePending}
                >
                  {(createMutation.isPending || updatePending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editing ? "Save Changes" : "Add Service"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </OwnerLayout>
  );
}
