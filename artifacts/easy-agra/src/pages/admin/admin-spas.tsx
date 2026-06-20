import { useState } from "react";
import { useGetAllSpas, useUpdateSpaStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getGetAllSpasQueryKey } from "@workspace/api-client-react";
import {
  Sparkles,
  Search,
  MapPin,
  User,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  PauseCircle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-700" },
};

type SpaItem = {
  id: number;
  name: string;
  ownerId: number;
  ownerName?: string | null;
  ownerEmail?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  openingTime?: string | null;
  closingTime?: string | null;
  facilities?: string[] | null;
  rejectionReason?: string | null;
  createdAt: string;
};

export default function AdminSpas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [actionDialog, setActionDialog] = useState<{
    spa: SpaItem;
    action: "approved" | "rejected" | "suspended";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryParams = {
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useGetAllSpas(queryParams);
  const statusMutation = useUpdateSpaStatus();

  const spas: SpaItem[] = (data?.spas ?? []) as SpaItem[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function openAction(spa: SpaItem, action: "approved" | "rejected" | "suspended") {
    setActionDialog({ spa, action });
    setRejectReason("");
  }

  function handleStatusUpdate() {
    if (!actionDialog) return;
    const { spa, action } = actionDialog;

    statusMutation.mutate(
      {
        id: spa.id,
        data: {
          status: action,
          rejectionReason: action === "rejected" ? rejectReason.trim() || null : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAllSpasQueryKey() });
          toast({
            title: `Spa ${action}`,
            description: `"${spa.name}" has been ${action}.`,
          });
          setActionDialog(null);
        },
        onError: () =>
          toast({ title: "Failed to update status", variant: "destructive" }),
      },
    );
  }

  const actionLabel: Record<string, string> = {
    approved: "Approve",
    rejected: "Reject",
    suspended: "Suspend",
  };
  const actionVariant: Record<string, "default" | "destructive" | "outline"> = {
    approved: "default",
    rejected: "destructive",
    suspended: "outline",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Spa Management</h1>
          <p className="text-muted-foreground">
            Review and manage spa listings across the platform
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spas..."
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
              count: spas.filter((s) => s.status === "pending").length,
              color: "text-amber-600",
            },
            {
              label: "Approved",
              count: spas.filter((s) => s.status === "approved").length,
              color: "text-green-600",
            },
            {
              label: "Rejected",
              count: spas.filter((s) => s.status === "rejected").length,
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

        {/* Spa List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : spas.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No spas found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {spas.map((spa) => {
              const cfg = STATUS_CONFIG[spa.status] ?? STATUS_CONFIG.draft;
              return (
                <Card key={spa.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold truncate">{spa.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {spa.ownerName ?? "Unknown"} &middot; {spa.ownerEmail}
                        </div>
                        {(spa.city || spa.state) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {[spa.city, spa.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {spa.openingTime && spa.closingTime && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {spa.openingTime} – {spa.closingTime}
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs border-0 shrink-0 ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>

                    {spa.facilities && spa.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {spa.facilities.map((f) => (
                          <Badge key={f} variant="outline" className="text-[10px] py-0">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {spa.status === "rejected" && spa.rejectionReason && (
                      <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3">
                        <span className="font-medium">Rejection reason:</span>{" "}
                        {spa.rejectionReason}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {spa.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 bg-green-600 hover:bg-green-700"
                          onClick={() => openAction(spa, "approved")}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      )}
                      {spa.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() => openAction(spa, "rejected")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      )}
                      {spa.status !== "suspended" && spa.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openAction(spa, "suspended")}
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
              Previous
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
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog ? actionLabel[actionDialog.action] : ""} Spa
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{" "}
                <span className="font-semibold">{actionDialog.action}</span>{" "}
                <span className="font-semibold">"{actionDialog.spa.name}"</span>?
              </p>
              {actionDialog.action === "rejected" && (
                <div>
                  <Label>Rejection Reason (optional)</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please describe why this spa was rejected..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog ? actionVariant[actionDialog.action] : "default"}
              onClick={handleStatusUpdate}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {actionDialog ? actionLabel[actionDialog.action] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
