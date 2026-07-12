import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useListRestaurants } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListRestaurantsQueryKey } from "@workspace/api-client-react";
import { apiRequest } from "@/lib/api-request";
import {
  Utensils,
  MapPin,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-700" },
  deleted: { label: "Deleted", className: "bg-red-100 text-red-700" },
};

type RestaurantItem = {
  id: number;
  name: string;
  ownerId: number;
  city?: string | null;
  state?: string | null;
  status: string;
  cuisineType?: string | null;
  contactNumber?: string | null;
  contactEmail?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  seatingCapacity?: number | null;
  createdAt: string;
};

export default function AdminRestaurants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [actionDialog, setActionDialog] = useState<{
    restaurant: RestaurantItem;
    action: "suspend" | "restore";
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const queryParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useListRestaurants(queryParams);
  const restaurants: RestaurantItem[] = (data?.restaurants ?? []) as RestaurantItem[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function doSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function openAction(restaurant: RestaurantItem, action: "suspend" | "restore") {
    setActionDialog({ restaurant, action });
    setSuspendReason("");
  }

  async function handleStatusUpdate() {
    if (!actionDialog) return;
    const { restaurant, action } = actionDialog;

    try {
      setActionLoading(true);
      if (action === "suspend") {
        await apiRequest(`/api/admin/security/restaurants/${restaurant.id}/suspend`, {
          method: "PATCH",
          body: { reason: suspendReason.trim() || null },
        });
      } else if (action === "restore") {
        await apiRequest(`/api/admin/security/restaurants/${restaurant.id}/restore`, {
          method: "PATCH",
        });
      }
      queryClient.invalidateQueries({ queryKey: getListRestaurantsQueryKey() });
      toast({
        title: `Restaurant ${action === "suspend" ? "suspended" : "restored"}`,
        description: `"${restaurant.name}" has been ${action === "suspend" ? "suspended" : "restored to active"}.`,
      });
      setActionDialog(null);
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || `Could not ${action} restaurant.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  const actionLabel: Record<string, string> = {
    suspend: "Suspend",
    restore: "Restore",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Restaurants</h1>
          <p className="text-muted-foreground">
            Manage restaurant listings across the platform
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={doSearch} className="bg-primary flex-shrink-0">Search</Button>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", count: total, color: "text-primary" },
            { label: "Active", count: restaurants.filter((r) => r.status === "active").length, color: "text-emerald-600" },
            { label: "Suspended", count: restaurants.filter((r) => r.status === "suspended").length, color: "text-orange-600" },
            { label: "Draft", count: restaurants.filter((r) => r.status === "draft").length, color: "text-gray-600" },
          ].map(({ label, count, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No restaurants found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Utensils className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold truncate">{r.name}</span>
                          {r.cuisineType && (
                            <span className="text-xs text-primary font-medium">{r.cuisineType}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                        </div>
                        {r.openingTime && r.closingTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {r.openingTime} – {r.closingTime}
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs border-0 shrink-0 ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {r.status !== "suspended" && r.status !== "deleted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-orange-700 border-orange-200 hover:bg-orange-50"
                          onClick={() => openAction(r, "suspend")}
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                      {(r.status === "suspended" || r.status === "deleted") && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                          onClick={() => openAction(r, "restore")}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suspend dialog */}
      <Dialog open={!!actionDialog && actionDialog.action === "suspend"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Restaurant?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Suspending <strong>{actionDialog?.restaurant?.name}</strong> will hide it from the public and stop new bookings.
            </p>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Optional reason (shown to owner)..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleStatusUpdate}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PauseCircle className="h-4 w-4 mr-2" />}
              Suspend Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore dialog */}
      <Dialog open={!!actionDialog && actionDialog.action === "restore"} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Restaurant?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>Restore <strong>{actionDialog?.restaurant?.name}</strong> to active status? It will be publicly visible again.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleStatusUpdate}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Restore to Active
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
