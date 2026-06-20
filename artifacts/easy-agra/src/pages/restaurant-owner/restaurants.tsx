import { useState } from "react";
import { Link, useLocation } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useGetMyRestaurants,
  useDeleteRestaurant,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Utensils,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  suspended: "bg-orange-100 text-orange-800 border-orange-200",
  deleted: "bg-red-100 text-red-700 border-red-200",
};

export default function OwnerRestaurants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  const listQuery = useGetMyRestaurants();
  const deleteMut = useDeleteRestaurant();

  const restaurants = listQuery.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getMyRestaurants"] });
  }

  function handleDelete() {
    if (deleteId === null) return;
    deleteMut.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Restaurant deleted" });
          setDeleteId(null);
          invalidate();
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e?.message, variant: "destructive" }),
      },
    );
  }

  return (
    <OwnerLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Restaurants</h1>
            <p className="text-sm text-muted-foreground">Manage your restaurants</p>
          </div>
          <Link href="/restaurant-owner/restaurants/new">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" />
              Add Restaurant
            </Button>
          </Link>
        </div>

        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="font-semibold mb-2">No restaurants yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first restaurant to start accepting reservations.
              </p>
              <Link href="/restaurant-owner/restaurants/new">
                <Button size="sm" className="bg-primary">
                  <Plus className="w-4 h-4 mr-1" /> Add Restaurant
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <Card key={r.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* Cover photo */}
                  {r.coverPhoto ? (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={r.coverPhoto}
                        alt={r.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-20 bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-primary/30" />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-foreground">{r.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {r.cuisineType && <span className="font-medium text-primary">{r.cuisineType}</span>}
                          {r.cuisineType && r.city && <span>·</span>}
                          {r.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {r.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </div>

                    {(r.openingTime || r.seatingCapacity) && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        {r.openingTime && r.closingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {r.openingTime} – {r.closingTime}
                          </span>
                        )}
                        {r.seatingCapacity && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {r.seatingCapacity} seats
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/restaurant-owner/restaurants/${r.id}/edit`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </Link>
                      <Link href={`/restaurant-owner/restaurants/${r.id}/menu`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          <BookOpen className="w-3 h-3 mr-1" /> Menu
                        </Button>
                      </Link>
                      <Link href={`/restaurant-owner/restaurants/${r.id}/tables`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs">
                          <Users className="w-3 h-3 mr-1" /> Tables
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Restaurant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the restaurant from public listings. All data will be preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
