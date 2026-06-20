import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { imgUrl } from "@/lib/cloudinary";
import { useGetMyReservations, useCancelReservation } from "@workspace/api-client-react";
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
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Utensils,
  XCircle,
  CheckCircle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_ICONS: Record<string, any> = {
  pending: <Clock className="w-3 h-3" />,
  confirmed: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export default function MyReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<number | null>(null);

  const listQuery = useGetMyReservations();
  const cancelMut = useCancelReservation();

  const reservations = listQuery.data ?? [];

  function handleCancel() {
    if (cancelId === null) return;
    cancelMut.mutate(
      { id: cancelId },
      {
        onSuccess: () => {
          toast({ title: "Reservation cancelled" });
          setCancelId(null);
          queryClient.invalidateQueries({ queryKey: ["getMyReservations"] });
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
      },
    );
  }

  function fmtDate(s: string) {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  }

  const active = reservations.filter((r) => ["pending", "confirmed"].includes(r.status)).length;
  const completed = reservations.filter((r) => r.status === "completed").length;

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Reservations</h1>
            <p className="text-sm text-muted-foreground">
              {active > 0 ? `${active} active reservation${active > 1 ? "s" : ""}` : "Your dining reservations"}
            </p>
          </div>
          <Link href="/restaurants">
            <Button size="sm" className="bg-primary">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </Link>
        </div>

        {/* Stats */}
        {reservations.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-amber-700">{reservations.filter((r) => r.status === "pending").length}</div>
              <div className="text-xs text-amber-600">Pending</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-emerald-700">{reservations.filter((r) => r.status === "confirmed").length}</div>
              <div className="text-xs text-emerald-600">Confirmed</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-700">{completed}</div>
              <div className="text-xs text-blue-600">Completed</div>
            </div>
          </div>
        )}

        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : reservations.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="font-semibold mb-2">No reservations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Find a restaurant and reserve a table for your dining experience.
              </p>
              <Link href="/restaurants">
                <Button size="sm" className="bg-primary">
                  Browse Restaurants
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reservations.map((res) => (
              <Card key={res.id} className={`border-0 shadow-sm overflow-hidden ${res.status === "confirmed" ? "ring-1 ring-emerald-300" : ""}`}>
                <CardContent className="p-0">
                  {/* Top: restaurant + status */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    {(res as any).restaurantCoverPhoto ? (
                      <img src={imgUrl((res as any).restaurantCoverPhoto, 200)} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-5 h-5 text-primary/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{(res as any).restaurantName ?? "Restaurant"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {(res as any).restaurantCity ?? "Agra"}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs flex items-center gap-1 ${STATUS_COLORS[res.status] ?? ""}`}>
                      {STATUS_ICONS[res.status]}
                      {res.status}
                    </Badge>
                  </div>

                  <div className="px-4 pb-3 border-t border-muted/50 pt-3 space-y-2">
                    <div className="font-mono text-xs text-muted-foreground">{res.reservationRef}</div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {fmtDate(res.reservationDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {res.reservationTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {res.guestCount} guests
                        {res.tableNumber && ` · Table ${res.tableNumber}`}
                      </span>
                    </div>

                    {res.specialRequest && (
                      <div className="text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                        <span className="font-medium">Note: </span>{res.specialRequest}
                      </div>
                    )}
                    {res.status === "rejected" && res.rejectionReason && (
                      <div className="text-xs bg-red-50 text-red-700 rounded-lg px-2.5 py-1.5">
                        <span className="font-medium">Rejected: </span>{res.rejectionReason}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Link href={`/restaurants/${res.restaurantId}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                          View Menu
                        </Button>
                      </Link>
                      {["pending", "confirmed"].includes(res.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setCancelId(res.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={cancelId !== null} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Reservation?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this reservation? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Keep it</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMut.isPending}>
              Cancel Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
