import { useState } from "react";
import { useListHotels } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getListHotelsQueryKey } from "@workspace/api-client-react";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  FileCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/api-request";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-700" },
};

type HotelItem = {
  id: number;
  name: string;
  ownerId: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  contactMobile?: string | null;
  contactEmail?: string | null;
  starRating?: number | null;
  category?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
};

export default function AdminHotels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [actionDialog, setActionDialog] = useState<{
    hotel: HotelItem;
    action: "approved" | "rejected" | "suspended";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const queryParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useListHotels(queryParams);
  const hotels: HotelItem[] = (data?.hotels ?? []) as HotelItem[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function openAction(hotel: HotelItem, action: "approved" | "rejected" | "suspended") {
    setActionDialog({ hotel, action });
    setRejectReason("");
  }

  async function handleStatusUpdate() {
    if (!actionDialog) return;
    const { hotel, action } = actionDialog;

    try {
      setActionLoading(true);
      if (action === "rejected") {
        await apiRequest(`/api/hotels/${hotel.id}/reject`, {
          method: "POST",
          body: { reason: rejectReason.trim() || null },
        });
      } else if (action === "approved") {
        await apiRequest(`/api/hotels/${hotel.id}/approve`, { method: "POST" });
      } else if (action === "suspended") {
        await apiRequest(`/api/hotels/${hotel.id}/suspend`, { method: "POST" });
      }
      queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
      toast({
        title: `Hotel ${action}`,
        description: `"${hotel.name}" has been ${action}.`,
      });
      setActionDialog(null);
    } catch (e: any) {
      toast({
        title: "Failed",
        description: e?.message || "Could not update hotel status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }

  const actionLabel: Record<string, string> = {
    approved: "Approve",
    rejected: "Reject",
    suspended: "Suspend",
  };
  const actionColor: Record<string, string> = {
    approved: "bg-green-600 hover:bg-green-700",
    rejected: "bg-destructive",
    suspended: "",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hotel Management</h1>
          <p className="text-muted-foreground">
            Review and manage hotel listings across the platform
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hotels..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", count: total, color: "text-primary" },
            {
              label: "Pending",
              count: hotels.filter((h) => h.status === "pending").length,
              color: "text-amber-600",
            },
            {
              label: "Approved",
              count: hotels.filter((h) => h.status === "approved").length,
              color: "text-green-600",
            },
            {
              label: "Rejected",
              count: hotels.filter((h) => h.status === "rejected").length,
              color: "text-red-600",
            },
          ].map(({ label, count, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hotel List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : hotels.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hotels found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel) => {
              const cfg = STATUS_CONFIG[hotel.status] ?? STATUS_CONFIG.draft;
              return (
                <Card key={hotel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold truncate">{hotel.name}</span>
                          {hotel.starRating && (
                            <span className="text-xs text-amber-500 font-medium">
                              {hotel.starRating} ★
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {hotel.contactMobile ?? "—"}
                        </div>
                        {(hotel.city || hotel.state) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {[hotel.city, hotel.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(hotel.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <Badge className={`text-xs border-0 shrink-0 ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>

                    {hotel.status === "rejected" && hotel.rejectionReason && (
                      <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3">
                        <span className="font-medium">Rejection reason:</span>{" "}
                        {hotel.rejectionReason}
                      </div>
                    )}

                    {/* Commission Agreement badge for pending */}
                    {hotel.status === "pending" && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded p-2 mb-3">
                        <FileCheck className="h-3.5 w-3.5" />
                        <span className="font-medium">Commission Agreement:</span>
                        <span>15% accepted by owner</span>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {hotel.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                          onClick={() => openAction(hotel, "approved")}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      )}
                      {hotel.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() => openAction(hotel, "rejected")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      )}
                      {hotel.status !== "suspended" && hotel.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openAction(hotel, "suspended")}
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Action dialog */}
        <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog && actionLabel[actionDialog.action]} Hotel?
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground">
              <p>
                {actionDialog?.action === "approved"
                  ? "This will approve the hotel and make it publicly visible."
                  : actionDialog?.action === "rejected"
                    ? "Provide a reason for rejecting this hotel listing."
                    : "This will suspend the hotel from being visible on the platform."}
              </p>
            </div>
            {actionDialog?.action === "rejected" && (
              <Input
                placeholder="Rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className={actionDialog ? actionColor[actionDialog.action] : ""}
                variant={actionDialog?.action === "rejected" ? "destructive" : "default"}
                onClick={handleStatusUpdate}
                disabled={actionLoading || (actionDialog?.action === "rejected" && !rejectReason.trim())}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {actionDialog && actionLabel[actionDialog.action]}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
