import { useState } from "react";
import {
  useGetOwnerSpaAppointments,
  useGetMySpasList,
  useConfirmSpaAppointment,
  useCompleteSpaAppointment,
  getGetOwnerSpaAppointmentsQueryKey,
  getGetSpaOwnerStatsQueryKey,
} from "@workspace/api-client-react";
import { apiRequest } from "@/lib/api-request";
import { useQueryClient } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCheck, Loader2, CheckCircle, XCircle, Clock, User,
  Phone, Sparkles, BadgeIndianRupee, Search, Check, Ban
} from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function OwnerAppointments() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: mySpasList = [] } = useGetMySpasList();
  const [filterSpa, setFilterSpa] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useGetOwnerSpaAppointments({
    spaId: filterSpa !== "all" ? parseInt(filterSpa, 10) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    limit: 50,
  });

  const confirmMutation = useConfirmSpaAppointment();
  const completeMutation = useCompleteSpaAppointment();
  const [rejectPending, setRejectPending] = useState(false);

  const [rejectDialog, setRejectDialog] = useState<{ id: number; ref: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetOwnerSpaAppointmentsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSpaOwnerStatsQueryKey() });
  }

  async function handleConfirm(id: number) {
    try {
      await confirmMutation.mutateAsync({ id });
      toast({ title: "Appointment confirmed" });
      invalidate();
    } catch {
      toast({ title: "Failed to confirm", variant: "destructive" });
    }
  }

  async function handleReject() {
    if (!rejectDialog) return;
    setRejectPending(true);
    try {
      await apiRequest(`/api/spa-appointments/${rejectDialog.id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ rejectionReason: rejectReason }),
      });
      toast({ title: "Appointment rejected" });
      setRejectDialog(null);
      setRejectReason("");
      invalidate();
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    } finally {
      setRejectPending(false);
    }
  }

  async function handleComplete(id: number) {
    try {
      await completeMutation.mutateAsync({ id });
      toast({ title: "Marked as completed" });
      invalidate();
    } catch {
      toast({ title: "Failed to complete", variant: "destructive" });
    }
  }

  const appointments = (data?.appointments ?? []).filter((a) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      a.customerName.toLowerCase().includes(q) ||
      a.appointmentRef.toLowerCase().includes(q) ||
      a.serviceName.toLowerCase().includes(q) ||
      a.customerMobile.includes(q)
    );
  });

  const formatDateTime = (date: string, time: string) => {
    try {
      return `${format(new Date(date), "dd MMM yyyy")} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total appointments
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, ref, service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterSpa} onValueChange={setFilterSpa}>
              <SelectTrigger>
                <SelectValue placeholder="All Spas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Spas</SelectItem>
                {mySpasList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : appointments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-2">
              <CalendarCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No appointments found</p>
              <p className="text-sm text-muted-foreground">
                Appointments will appear here once customers book
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{a.customerName}</span>
                        <Badge className={`text-xs border-0 ${STATUS_COLORS[a.status] ?? ""}`}>
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{a.appointmentRef}</p>
                    </div>
                    {a.amount != null && (
                      <span className="text-sm font-bold flex items-center gap-0.5 shrink-0">
                        <BadgeIndianRupee className="h-3.5 w-3.5" />
                        ₹{Number(a.amount).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Service + spa */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium">{a.serviceName}</span>
                    </div>
                    {a.spaName && (
                      <p className="text-xs text-muted-foreground pl-5">{a.spaName}</p>
                    )}
                  </div>

                  {/* Date/time */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDateTime(a.appointmentDate, a.appointmentTime)}
                    {a.numberOfPersons > 1 && ` · ${a.numberOfPersons} persons`}
                  </div>

                  {/* Contact */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {a.customerMobile}
                    {a.customerEmail && ` · ${a.customerEmail}`}
                  </div>

                  {a.specialRequest && (
                    <p className="text-xs bg-muted rounded-md px-3 py-2 text-muted-foreground">
                      "{a.specialRequest}"
                    </p>
                  )}

                  {a.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
                      Reason: {a.rejectionReason}
                    </p>
                  )}

                  {/* Actions */}
                  {a.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1 h-8"
                        onClick={() => handleConfirm(a.id)}
                        disabled={confirmMutation.isPending}
                      >
                        {confirmMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 gap-1 h-8"
                        onClick={() => setRejectDialog({ id: a.id, ref: a.appointmentRef })}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {a.status === "confirmed" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1 h-8 bg-green-600 hover:bg-green-700"
                        onClick={() => handleComplete(a.id)}
                        disabled={completeMutation.isPending}
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Mark Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 gap-1 h-8"
                        onClick={() => setRejectDialog({ id: a.id, ref: a.appointmentRef })}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Rejecting <span className="font-mono font-semibold">{rejectDialog?.ref}</span>
            </p>
            <div className="space-y-1">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectPending}
            >
              {rejectPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
