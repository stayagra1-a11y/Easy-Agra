import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useListTouristPlaces, useSeedTouristPlaces, useDeleteTouristPlace } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin, PlusCircle, Pencil, Trash2, Search, Images, Loader2,
  Clock, TicketIcon, Star, RefreshCw, Database,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api-request";

export default function AdminTouristPlaces() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, refetch } = useListTouristPlaces({ search: search || undefined, limit: 50 });
  const places = data?.places ?? [];
  const total = data?.total ?? 0;

  const seedMutation = useSeedTouristPlaces();

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await apiRequest("/api/tourist-places/seed", { method: "POST" }) as any;
      toast({
        title: result.count > 0 ? "Seeded successfully!" : "Already seeded",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/tourist-places"] });
    } catch {
      toast({ title: "Error", description: "Failed to seed tourist places", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/tourist-places/${deleteId}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Tourist place removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/tourist-places"] });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tourist Places</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} place{total !== 1 ? "s" : ""} · Manage all tourist destinations of Agra
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user?.role === "super_admin" && (
              <Button variant="outline" onClick={handleSeed} disabled={seeding} className="gap-1.5">
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Seed Demo Data
              </Button>
            )}
            <Link href="/admin/tourist-places/new">
              <Button className="gap-1.5 bg-primary hover:bg-primary/90">
                <PlusCircle className="h-4 w-4" />
                Add Place
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search places..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : places.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-semibold text-lg">No tourist places yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {user?.role === "super_admin"
                  ? "Click 'Seed Demo Data' to populate all 8 Agra tourist places instantly."
                  : "No tourist places have been added yet."}
              </p>
              {user?.role === "super_admin" && (
                <Button onClick={handleSeed} disabled={seeding} className="gap-1.5">
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Seed Demo Data
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {places.map((place) => {
              const coverImg = (place as any).coverImageUrl ||
                (place as any).images?.find((img: any) => img.imageType === "cover" || img.isFeatured)?.imageUrl;
              const imageCount = (place as any).images?.length ?? 0;

              return (
                <Card key={place.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/admin/tourist-places/${place.id}/photos`}>
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="w-32 sm:w-48 shrink-0 relative bg-muted">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          style={{ minHeight: "120px" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-place.jpg"; }}
                        />
                      ) : (
                        <div className="w-full h-full min-h-[120px] flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      {place.isFeatured && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-accent text-accent-foreground text-xs gap-1">
                            <Star className="h-3 w-3" /> Featured
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base truncate">{place.name}</h3>
                            <Badge variant={place.isActive ? "default" : "secondary"} className="text-xs shrink-0">
                              {place.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <MapPin className="inline h-3 w-3 mr-0.5" />
                            {place.city}, {place.state}
                          </p>
                        </div>
                      </div>

                      {place.shortDescription && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{place.shortDescription}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                        {place.openingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {place.openingTime} – {place.closingTime}
                          </span>
                        )}
                        {place.ticketPriceIndian !== null && (
                          <span className="flex items-center gap-1">
                            <TicketIcon className="h-3 w-3" />
                            ₹{Number(place.ticketPriceIndian) === 0 ? "Free" : place.ticketPriceIndian} Indian
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Images className="h-3 w-3" />
                          {imageCount} photo{imageCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/admin/tourist-places/${place.id}/photos`}>
                          <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5">
                            <Images className="h-3.5 w-3.5" />
                            Photos
                          </Button>
                        </Link>
                        <Link href={`/admin/tourist-places/${place.id}/edit`}>
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(place.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tourist Place?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the tourist place and all its associated photos, tips, and distance information. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
