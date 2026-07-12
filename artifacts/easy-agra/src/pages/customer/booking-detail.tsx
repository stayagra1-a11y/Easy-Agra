import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import {
  useGetBooking,
  useCancelBooking,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Building2,
  BedDouble,
  CalendarDays,
  Users,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  LogOut,
  Hash,
  Star,
  Copy,
  Check,
  Phone,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending:     { label: "Pending",     color: "bg-amber-100 text-amber-800 border-amber-200",    icon: Clock,         desc: "Hotel is yet to confirm your booking." },
  confirmed:   { label: "Confirmed",   color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle2,  desc: "Your booking is confirmed. Get ready for your stay!" },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-800 border-red-200",          icon: XCircle,       desc: "Hotel has rejected this booking." },
  cancelled:   { label: "Cancelled",   color: "bg-slate-100 text-slate-700 border-slate-200",    icon: XCircle,       desc: "This booking has been cancelled." },
  checked_in:  { label: "Checked In",  color: "bg-blue-100 text-blue-800 border-blue-200",       icon: LogIn,         desc: "You are currently checked in. Enjoy your stay!" },
  checked_out: { label: "Completed",   color: "bg-purple-100 text-purple-800 border-purple-200", icon: LogOut,        desc: "Your stay is complete. Hope you had a great time!" },
};

function fmtDate(d: string) {
  try { return format(parseISO(d), "EEEE, dd MMM yyyy"); } catch { return d; }
}

function fmtAmount(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 p-1.5 bg-primary/10 rounded-lg">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const bookingId = Number(id);
  const { data: booking, isLoading, isError } = useGetBooking(bookingId);
  const cancelMut = useCancelBooking();

  function copyRef() {
    if (!booking) return;
    navigator.clipboard.writeText(booking.bookingRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCancelSubmit() {
    if (!booking) return;
    cancelMut.mutate(
      { id: booking.id, data: { reason: cancelReason || "Cancelled by customer" } },
      {
        onSuccess: () => {
          toast({ title: "Booking cancelled", description: "Your booking has been cancelled." });
          setCancelDialog(false);
          setCancelReason("");
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: ["getBooking", bookingId] });
        },
        onError: () =>
          toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <CustomerLayout backHref="/customer/bookings" backLabel="Back">
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (isError || !booking) {
    return (
      <CustomerLayout backHref="/customer/bookings" backLabel="Back">
        <div className="p-4 max-w-lg mx-auto text-center py-16">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium text-foreground">Booking not found</p>
          <p className="text-sm text-muted-foreground mt-1">This booking doesn't exist or you don't have access.</p>
          <Link href="/customer/bookings">
            <Button className="mt-4" size="sm">Back to My Bookings</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const sc = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = sc.icon;
  const nights = booking.nights;
  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const canReview = booking.status === "checked_out";

  return (
    <CustomerLayout backHref="/customer/bookings" backLabel="Back">
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">

        {/* Back button */}
        <button
          onClick={() => navigate("/customer/bookings")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          My Bookings
        </button>

        {/* Booking ref + status */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-foreground/70">Booking Reference</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-primary-foreground font-mono">{booking.bookingRef}</p>
                <button onClick={copyRef} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Badge className={`border text-xs ${sc.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {sc.label}
            </Badge>
          </div>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{sc.desc}</p>
            {(booking.status === "rejected" || booking.status === "cancelled") && booking.rejectionReason && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 font-medium">Reason</p>
                <p className="text-sm text-red-700">{booking.rejectionReason}</p>
              </div>
            )}
            {booking.status === "cancelled" && booking.cancelReason && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-600 font-medium">Cancellation Reason</p>
                <p className="text-sm text-slate-700">{booking.cancelReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel & Room details */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm text-foreground mb-1">Hotel & Stay Details</h2>
            <Separator className="mb-2" />
            <InfoRow icon={Building2} label="Hotel" value={booking.hotelName ?? "—"} />
            <InfoRow icon={BedDouble} label="Room" value={booking.roomName ?? "—"} />
            <InfoRow icon={CalendarDays} label="Check-in" value={fmtDate(booking.checkInDate)} />
            <InfoRow icon={CalendarDays} label="Check-out" value={fmtDate(booking.checkOutDate)} />
            <InfoRow icon={Hash} label="Duration" value={`${nights} night${nights !== 1 ? "s" : ""}`} />
            <InfoRow
              icon={Users}
              label="Guests"
              value={`${booking.adultsCount} Adult${booking.adultsCount !== 1 ? "s" : ""}${booking.childrenCount > 0 ? `, ${booking.childrenCount} Child${booking.childrenCount !== 1 ? "ren" : ""}` : ""}`}
            />
            {booking.customerNotes && (
              <InfoRow icon={Phone} label="Your Notes" value={booking.customerNotes} />
            )}
          </CardContent>
        </Card>

        {/* Price breakdown */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm text-foreground mb-1">Price Breakdown</h2>
            <Separator className="mb-3" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span>{fmtAmount(booking.baseAmount)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>− {fmtAmount(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST ({booking.taxRate}%)</span>
                <span>{fmtAmount(booking.taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span className="text-primary">{fmtAmount(booking.finalAmount)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
              <IndianRupee className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Payment is collected directly at the hotel via cash or UPI.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Booking timeline */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm text-foreground mb-1">Booking Timeline</h2>
            <Separator className="mb-3" />
            <div className="space-y-2">
              <TimelineItem
                done={true}
                icon={CheckCircle2}
                label="Booking Created"
                time={booking.createdAt}
              />
              <TimelineItem
                done={booking.status !== "pending"}
                icon={booking.status === "rejected" ? XCircle : CheckCircle2}
                label={booking.status === "rejected" ? "Rejected by Hotel" : "Confirmed by Hotel"}
                time={booking.confirmedAt ?? null}
                color={booking.status === "rejected" ? "text-red-500" : undefined}
              />
              <TimelineItem
                done={booking.status === "checked_in" || booking.status === "checked_out"}
                icon={LogIn}
                label="Checked In"
                time={booking.checkedInAt ?? null}
              />
              <TimelineItem
                done={booking.status === "checked_out"}
                icon={LogOut}
                label="Checked Out"
                time={booking.checkedOutAt ?? null}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-2">
          {canReview && (
            <Link href={`/customer/write-review/${booking.id}`}>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                <Star className="h-4 w-4 mr-2" />
                Write a Review
              </Button>
            </Link>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setCancelDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Booking
            </Button>
          )}
          <Link href="/hotels">
            <Button variant="outline" className="w-full">
              <Building2 className="h-4 w-4 mr-2" />
              Book Another Hotel
            </Button>
          </Link>
        </div>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel <strong>{booking.bookingRef}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2">
            <Label className="text-sm mb-1 block">Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Change of plans..."
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
    </CustomerLayout>
  );
}

function TimelineItem({
  done, icon: Icon, label, time, color,
}: {
  done: boolean; icon: any; label: string; time: string | null; color?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${done ? "" : "opacity-40"}`}>
      <div className={`mt-0.5 p-1 rounded-full ${done ? "bg-primary/10" : "bg-muted"}`}>
        <Icon className={`h-3.5 w-3.5 ${color ?? (done ? "text-primary" : "text-muted-foreground")}`} />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {time && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(time), "dd MMM yyyy, hh:mm a")}
          </p>
        )}
        {!time && done && <p className="text-xs text-muted-foreground">Done</p>}
        {!done && <p className="text-xs text-muted-foreground">Pending</p>}
      </div>
    </div>
  );
}
