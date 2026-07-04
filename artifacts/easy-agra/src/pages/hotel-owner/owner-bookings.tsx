import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useListBookings,
  useConfirmBooking,
  useRejectBooking,
  useCancelBooking,
  useCheckInBooking,
  useCheckOutBooking,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import type { Booking } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  LogOut,
  User,
  BedDouble,
  Building2,
  CalendarDays,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:     { label: "Pending",     color: "bg-amber-100 text-amber-800 border-amber-200",   icon: Clock },
  confirmed:   { label: "Confirmed",   color: "bg-green-100 text-green-800 border-green-200",   icon: CheckCircle2 },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-800 border-red-200",         icon: XCircle },
  cancelled:   { label: "Cancelled",   color: "bg-slate-100 text-slate-700 border-slate-200",   icon: XCircle },
  checked_in:  { label: "Checked In",  color: "bg-blue-100 text-blue-800 border-blue-200",      icon: LogIn },
  checked_out: { label: "Checked Out", color: "bg-purple-100 text-purple-800 border-purple-200", icon: LogOut },
};

function formatDate(d: string) {
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function BookingDetailSheet({
  booking,
  open,
  onClose,
  onConfirm,
  onReject,
  onCheckin,
  onCheckout,
  onCancel,
  loading,
}: {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onCheckin: () => void;
  onCheckout: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!booking) return null;
  const sc = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: "bg-slate-100 text-slate-700", icon: Clock };
  const StatusIcon = sc.icon;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <SheetTitle className="text-lg">Booking #{booking.bookingRef}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sc.color}`}>
            <StatusIcon className="h-4 w-4" />
            <span className="font-medium text-sm">{sc.label}</span>
          </div>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Guest:</span>
                <span>{booking.customerName ?? "—"}</span>
              </div>
              {booking.guestAddress && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Address:</span>
                    <p className="text-muted-foreground mt-0.5 leading-snug">{booking.guestAddress}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Hotel:</span>
                <span>{booking.hotelName ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Room:</span>
                <span>{booking.roomName ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Check-in:</span>
                <span>{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Check-out:</span>
                <span>{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium ml-6">Nights:</span>
                <span>{booking.nights}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium ml-6">Guests:</span>
                <span>{booking.adultsCount} Adult{booking.adultsCount !== 1 ? "s" : ""}{booking.childrenCount > 0 ? `, ${booking.childrenCount} Child` : ""}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span>{formatAmount(booking.baseAmount)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- {formatAmount(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST ({booking.taxRate}%)</span>
                <span>{formatAmount(booking.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Total</span>
                <span className="text-primary">{formatAmount(booking.finalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {booking.customerNotes && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Guest Notes</p>
                <p className="text-sm">{booking.customerNotes}</p>
              </CardContent>
            </Card>
          )}

          {booking.cancelReason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <p className="text-xs text-red-600 font-medium mb-1">Cancellation Reason</p>
                <p className="text-sm text-red-700">{booking.cancelReason}</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Booked on {formatDate(booking.createdAt)}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {booking.status === "pending" && (
              <>
                <Button onClick={onConfirm} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Booking
                </Button>
                <Button onClick={onReject} disabled={loading} variant="destructive" className="w-full">
                  <XCircle className="h-4 w-4 mr-2" /> Reject Booking
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <Button onClick={onCheckin} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <LogIn className="h-4 w-4 mr-2" /> Mark Check-In
                </Button>
                <Button onClick={onCancel} disabled={loading} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                </Button>
              </>
            )}
            {booking.status === "checked_in" && (
              <Button onClick={onCheckout} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                <LogOut className="h-4 w-4 mr-2" /> Mark Check-Out
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function OwnerBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const [selected, setSelected] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const params = {
    page,
    limit: LIMIT,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useListBookings(params);
  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(params) });
    queryClient.invalidateQueries({ queryKey: ["listBookings"] });
  }

  const confirmMut   = useConfirmBooking();
  const rejectMut    = useRejectBooking();
  const cancelMut    = useCancelBooking();
  const checkinMut   = useCheckInBooking();
  const checkoutMut  = useCheckOutBooking();

  const actionLoading = confirmMut.isPending || rejectMut.isPending || cancelMut.isPending || checkinMut.isPending || checkoutMut.isPending;

  function handleConfirm() {
    if (!selected) return;
    confirmMut.mutate({ id: selected.id }, {
      onSuccess: () => {
        toast({ title: "Booking confirmed!", description: `${selected.bookingRef} confirmed.` });
        setSheetOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Error", description: "Could not confirm booking.", variant: "destructive" }),
    });
  }

  function handleRejectSubmit() {
    if (!selected) return;
    rejectMut.mutate({ id: selected.id, data: { reason: rejectReason || "Rejected by owner" } }, {
      onSuccess: () => {
        toast({ title: "Booking rejected", description: `${selected.bookingRef} rejected.` });
        setRejectDialog(false);
        setSheetOpen(false);
        setRejectReason("");
        invalidate();
      },
      onError: () => toast({ title: "Error", description: "Could not reject booking.", variant: "destructive" }),
    });
  }

  function handleCancelSubmit() {
    if (!selected) return;
    cancelMut.mutate({ id: selected.id, data: { reason: cancelReason || "Cancelled by owner" } }, {
      onSuccess: () => {
        toast({ title: "Booking cancelled", description: `${selected.bookingRef} cancelled.` });
        setCancelDialog(false);
        setSheetOpen(false);
        setCancelReason("");
        invalidate();
      },
      onError: () => toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" }),
    });
  }

  function handleCheckin() {
    if (!selected) return;
    checkinMut.mutate({ id: selected.id }, {
      onSuccess: () => {
        toast({ title: "Checked In!", description: `${selected.bookingRef} — guest checked in.` });
        setSheetOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Error", description: "Could not check in.", variant: "destructive" }),
    });
  }

  function handleCheckout() {
    if (!selected) return;
    checkoutMut.mutate({ id: selected.id }, {
      onSuccess: () => {
        toast({ title: "Checked Out!", description: `${selected.bookingRef} — guest checked out.` });
        setSheetOpen(false);
        invalidate();
      },
      onError: () => toast({ title: "Error", description: "Could not check out.", variant: "destructive" }),
    });
  }

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground">Manage your hotel bookings</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total", value: total, color: "text-primary" },
            { label: "Pending", value: bookings.filter(b => b.status === "pending").length, color: "text-amber-600" },
            { label: "Active", value: bookings.filter(b => b.status === "checked_in").length, color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 text-sm"
              placeholder="Search ref, guest..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Booking cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No bookings found</p>
            <p className="text-sm mt-1">Bookings will appear here when guests book your hotel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const sc = STATUS_CONFIG[b.status] ?? { label: b.status, color: "bg-slate-100 text-slate-700", icon: Clock };
              const StatusIcon = sc.icon;
              return (
                <Card
                  key={b.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelected(b); setSheetOpen(true); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{b.bookingRef}</span>
                          <Badge className={`text-[10px] border ${sc.color} shrink-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{b.customerName ?? "Guest"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <BedDouble className="h-3 w-3" />
                          <span className="truncate">{b.roomName ?? "Room"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                          <span className="text-muted-foreground/60">({b.nights}N)</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-primary font-bold text-sm">
                          <IndianRupee className="h-3 w-3" />
                          <span>{Number(b.finalAmount).toLocaleString("en-IN")}</span>
                        </div>
                        <button className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </div>
                    </div>

                    {/* Pending action prompt */}
                    {b.status === "pending" && (
                      <div className="mt-2 pt-2 border-t border-amber-100 flex items-center gap-1 text-xs text-amber-700 font-medium">
                        <Clock className="h-3 w-3" /> Action required — tap to confirm or reject
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Booking detail sheet */}
      <BookingDetailSheet
        booking={selected}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
        onReject={() => setRejectDialog(true)}
        onCheckin={handleCheckin}
        onCheckout={handleCheckout}
        onCancel={() => setCancelDialog(true)}
        loading={actionLoading}
      />

      {/* Reject dialog */}
      <AlertDialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Please give a reason for rejecting this booking. Guest will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Label className="text-sm mb-1 block">Reason</Label>
            <Textarea
              placeholder="e.g. Room not available for these dates..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel dialog */}
      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this confirmed booking?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Label className="text-sm mb-1 block">Reason (optional)</Label>
            <Textarea
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerLayout>
  );
}
