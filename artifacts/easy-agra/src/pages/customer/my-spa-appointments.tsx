import { useState } from "react";
import {
  useGetMySpaAppointments,
  getGetMySpaAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { apiRequest } from "@/lib/api-request";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck, Loader2, Clock, MapPin, Sparkles,
  BadgeIndianRupee, XCircle, Star
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  rejected: "❌",
  completed: "🎉",
  cancelled: "🚫",
};

export default function MySpaAppointments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [cancelDialog, setCancelDialog] = useState<{ id: number; ref: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading } = useGetMySpaAppointments({
    status: filterStatus !== "all" ? filterStatus : undefined,
    limit: 50,
  });

  const [cancelPending, setCancelPending] = useState(false);

  async function handleCancel() {
    if (!cancelDialog) return;
    setCancelPending(true);
    try {
      await apiRequest(`/api/spa-appointments/${cancelDialog.id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ cancelReason }),
      });
      toast({ title: "Appointment cancelled" });
      setCancelDialog(null);
      setCancelReason("");
      qc.invalidateQueries({ queryKey: getGetMySpaAppointmentsQueryKey() });
    } catch {
      toast({ title: "Failed to cancel", variant: "destructive" });
    } finally {
      setCancelPending(false);
    }
  }

  const appointments = data?.appointments ?? [];

  const formatDateTime = (date: string, time: string) => {
    try {
      return `${format(new Date(date), "dd MMM yyyy")} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Spa Appointments</h1>
            <p className="text-sm text-muted-foreground">{data?.total ?? 0} total</p>
          </div>
          <Link href="/spas">
            <Button size="sm" variant="outline" className="gap-1">
              <Sparkles className="h-4 w-4" />
              Book Spa
            </Button>
          </Link>
        </div>

        {/* Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full">
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-3">
              <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No appointments yet</p>
              <p className="text-sm text-muted-foreground">
                Book a spa experience in Agra
              </p>
              <Link href="/spas">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Browse Spas
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{a.serviceName}</span>
                        <Badge className={`text-xs border-0 ${STATUS_COLORS[a.status] ?? ""}`}>
                          {STATUS_ICONS[a.status]} {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{a.appointmentRef}</p>
                    </div>
                    {a.amount != null && (
                      <span className="text-sm font-bold flex items-center gap-0.5 shrink-0">
                        <BadgeIndianRupee className="h-3.5 w-3.5" />
                        ₹{Number(a.amount).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Spa */}
                  {a.spaName && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{a.spaName}{a.spaCity ? `, ${a.spaCity}` : ""}</span>
                    </div>
                  )}

                  {/* Date/time */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDateTime(a.appointmentDate, a.appointmentTime)}
                    {a.numberOfPersons > 1 && ` · ${a.numberOfPersons} persons`}
                  </div>

                  {a.specialRequest && (
                    <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                      "{a.specialRequest}"
                    </p>
                  )}

                  {a.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
                      Rejected: {a.rejectionReason}
                    </p>
                  )}

                  {a.cancelReason && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                      Cancelled: {a.cancelReason}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {a.status === "completed" && (
                      <Link href={`/spas/${a.spaId}#reviews`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full gap-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Write Review
                        </Button>
                      </Link>
                    )}
                    {["pending", "confirmed"].includes(a.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => setCancelDialog({ id: a.id, ref: a.appointmentRef })}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel Appointment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => { if (!o) setCancelDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Cancel <span className="font-mono font-semibold">{cancelDialog?.ref}</span>?
            </p>
            <div className="space-y-1">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Keep Appointment</Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelPending}
            >
              {cancelPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
