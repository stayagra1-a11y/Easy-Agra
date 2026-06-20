import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetTouristPlace } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetTouristPlaceQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, Loader2, PlusCircle, Trash2, Star, StarOff,
  ArrowUp, ArrowDown, Images, ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/api-request";

type TouristPlaceImage = {
  id: number;
  placeId: number;
  imageUrl: string;
  caption: string | null;
  altText: string | null;
  imageType: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export default function TouristPlacePhotos() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const placeId = parseInt(params.id);

  const { data: place, isLoading } = useGetTouristPlace(placeId);
  const images: TouristPlaceImage[] = ((place as any)?.images ?? []).sort(
    (a: TouristPlaceImage, b: TouristPlaceImage) => a.sortOrder - b.sortOrder,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [editImg, setEditImg] = useState<TouristPlaceImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [featuring, setFeaturing] = useState<number | null>(null);

  const [newImg, setNewImg] = useState({
    imageUrl: "",
    caption: "",
    altText: "",
    imageType: "gallery" as "gallery" | "cover",
    isFeatured: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetTouristPlaceQueryKey(placeId) });

  const handleAddImage = async () => {
    if (!newImg.imageUrl.trim()) {
      toast({ title: "Image URL is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/tourist-places/${placeId}/images`, {
        method: "POST",
        body: newImg,
      });
      toast({ title: "Image added!" });
      setNewImg({ imageUrl: "", caption: "", altText: "", imageType: "gallery", isFeatured: false });
      setAddOpen(false);
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to add image", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateImage = async () => {
    if (!editImg) return;
    setSaving(true);
    try {
      await apiRequest(`/api/tourist-places/images/${editImg.id}`, {
        method: "PUT",
        body: {
          imageUrl: editImg.imageUrl,
          caption: editImg.caption,
          altText: editImg.altText,
          imageType: editImg.imageType,
          isFeatured: editImg.isFeatured,
          sortOrder: editImg.sortOrder,
        },
      });
      toast({ title: "Image updated!" });
      setEditImg(null);
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to update image", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    setDeleting(imageId);
    try {
      await apiRequest(`/api/tourist-places/images/${imageId}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const handleFeature = async (imageId: number) => {
    setFeaturing(imageId);
    try {
      await apiRequest(`/api/tourist-places/images/${imageId}/feature`, { method: "PUT" });
      toast({ title: "Set as featured!" });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to set featured", variant: "destructive" });
    } finally {
      setFeaturing(null);
    }
  };

  const handleReorder = async (imageId: number, direction: "up" | "down") => {
    const idx = images.findIndex((img) => img.id === imageId);
    if (idx === -1) return;
    const newImages = [...images];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newImages.length) return;
    [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];
    const imageIds = newImages.map((img) => img.id);
    try {
      await apiRequest(`/api/tourist-places/${placeId}/images/reorder`, {
        method: "POST",
        body: { imageIds },
      });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  if (isLoading) {
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
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tourist-places")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Photo Manager</h1>
            <p className="text-sm text-muted-foreground">{place?.name} · {images.length} photo{images.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Add Photo
          </Button>
        </div>

        {/* Info banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-primary">
            <Images className="inline h-4 w-4 mr-2" />
            Set one photo as <strong>Featured</strong> to use it as the cover image on cards and detail pages.
            Use <strong>Cover</strong> type for the main banner image. Drag reorder using the arrows.
          </CardContent>
        </Card>

        {/* Image grid */}
        {images.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <Images className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-semibold">No photos yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Add at least 10 photos for a rich gallery experience.</p>
              <Button onClick={() => setAddOpen(true)} className="gap-1.5">
                <PlusCircle className="h-4 w-4" /> Add First Photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {images.map((img, idx) => (
              <Card key={img.id} className="overflow-hidden">
                <div className="flex gap-0">
                  {/* Preview */}
                  <div className="w-40 sm:w-56 shrink-0 relative bg-muted">
                    <img
                      src={img.imageUrl}
                      alt={img.caption ?? place?.name}
                      className="w-full h-36 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {img.isFeatured && (
                        <Badge className="bg-accent text-accent-foreground text-xs">Featured</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs capitalize">{img.imageType}</Badge>
                    </div>
                    <div className="absolute top-2 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex-1 p-4 min-w-0">
                    <p className="font-medium text-sm truncate">{img.caption || "(no caption)"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{img.imageUrl}</p>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {/* Reorder */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReorder(img.id, "up")}
                        disabled={idx === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReorder(img.id, "down")}
                        disabled={idx === images.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>

                      {/* Feature */}
                      <Button
                        size="sm"
                        variant={img.isFeatured ? "default" : "outline"}
                        onClick={() => handleFeature(img.id)}
                        disabled={featuring === img.id}
                        className="gap-1.5 h-8"
                      >
                        {featuring === img.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : img.isFeatured ? (
                          <Star className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5" />
                        )}
                        {img.isFeatured ? "Featured" : "Set Featured"}
                      </Button>

                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditImg({ ...img })}
                        className="gap-1.5 h-8"
                      >
                        Edit
                      </Button>

                      {/* Open URL */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(img.imageUrl, "_blank")}
                        className="gap-1.5 h-8"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(img.id)}
                        disabled={deleting === img.id}
                        className="gap-1.5 h-8 text-destructive border-destructive/40 hover:bg-destructive/5"
                      >
                        {deleting === img.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Image Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Image URL *</Label>
              <Input
                value={newImg.imageUrl}
                onChange={(e) => setNewImg({ ...newImg, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
              />
              {newImg.imageUrl && (
                <img
                  src={newImg.imageUrl}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-md mt-2 border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Caption</Label>
              <Input
                value={newImg.caption}
                onChange={(e) => setNewImg({ ...newImg, caption: e.target.value })}
                placeholder="Describe this photo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newImg.imageType}
                onValueChange={(v) => setNewImg({ ...newImg, imageType: v as "gallery" | "cover" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gallery">Gallery</SelectItem>
                  <SelectItem value="cover">Cover</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddImage} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={!!editImg} onOpenChange={(open) => !open && setEditImg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
          </DialogHeader>
          {editImg && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={editImg.imageUrl}
                  onChange={(e) => setEditImg({ ...editImg, imageUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input
                  value={editImg.caption ?? ""}
                  onChange={(e) => setEditImg({ ...editImg, caption: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Alt Text</Label>
                <Input
                  value={editImg.altText ?? ""}
                  onChange={(e) => setEditImg({ ...editImg, altText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editImg.imageType}
                  onValueChange={(v) => setEditImg({ ...editImg, imageType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gallery">Gallery</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditImg(null)}>Cancel</Button>
            <Button onClick={handleUpdateImage} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
