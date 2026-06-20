import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useListReservations,
  useConfirmReservation,
  useRejectReservation,
  useCompleteReservation,
  useGetMyRestaurants,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  CalendarDays,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function OwnerReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rejectDialog, setRejectDialog] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const myRestaurants = useGetMyRestaurants();
  const listQuery = useListReservations({
    status: statusFilter !== "all" ? statusFilter : undefined,
    restaurantId: restaurantFilter !== "all" ? parseInt(restaurantFilter) : undefined,
    page,
    limit: 15,
  });

  const confirmMut = useConfirmReservation();
  const rejectMut = useRejectReservation();
  const completeMut = useCompleteReservation();

  const reservations = listQuery.data?.reservations ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  const pending = reservations.filter((r) => r.status === "pending").length;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["listReservations"] });
  }

  function handleConfirm(id: number) {
    confirmMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Reservation confirmed ✓" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function handleReject() {
    if (rejectDialog === null) return;
    rejectMut.mutate({ id: rejectDialog }, {
      onSuccess: () => { toast({ title: "Reservation rejected" }); setRejectDialog(null); setRejectReason(""); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function handleComplete(id: number) {
    completeMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Marked as completed ✓" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function fmtDate(s: string) {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Reservations</h1>
            <p className="text-sm text-muted-foreground">
              {pending > 0 ? `${pending} pending action` : "All reservations"}
            </p>
          </div>
          {pending > 0 && (
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
              {pending}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={restaurantFilter} onValueChange={(v) => { setRestaurantFilter(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Restaurants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {(myRestaurants.data ?? []).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reservation list */}
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : reservations.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No reservations found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <Card key={r.id} className={`border-0 shadow-sm overflow-hidden ${r.status === "pending" ? "ring-1 ring-amber-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-bold text-foreground">{r.customerName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.reservationRef}</div>
                      <div className="text-xs text-primary font-medium">{r.restaurantName}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" />
                      {fmtDate(r.reservationDate)} at {r.reservationTime}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {r.guestCount} guests
                      {r.tableNumber && ` · Table ${r.tableNumber}`}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {r.customerMobile}
                    </div>
                    {r.customerEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        {r.customerEmail}
                      </div>
                    )}
                    {r.specialRequest && (
                      <div className="bg-muted/50 rounded-lg px-2 py-1 mt-1">
                        <span className="text-foreground/70">Note: </span>{r.specialRequest}
                      </div>
                    )}
                  </div>

                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleConfirm(r.id)}
                        disabled={confirmMut.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { setRejectDialog(r.id); setRejectReason(""); }}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {r.status === "confirmed" && (
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleComplete(r.id)}
                      disabled={completeMut.isPending}
                    >
                      <Flag className="w-3 h-3 mr-1" /> Mark Completed
                    </Button>
                  )}
                  {r.rejectionReason && (
                    <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                      Rejection: {r.rejectionReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialog !== null} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Reservation</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reason (optional)</label>
            <Textarea placeholder="Why are you rejecting this reservation?" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMut.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
