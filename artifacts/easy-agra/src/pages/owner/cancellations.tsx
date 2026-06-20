import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useGetOwnerCancellations,
  useProcessOwnerCancellation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle, XCircle, CalendarX, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel Booking",
  restaurant: "Restaurant Reservation",
  spa: "Spa Appointment",
};

export default function OwnerCancellations() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [actionMap, setActionMap] = useState<
    Record<string, { action: string; note: string }>
  >({});

  const { data, isLoading } = useGetOwnerCancellations(
    statusFilter ? { status: statusFilter } : {},
  );
  const processCancellation = useProcessOwnerCancellation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/owner/cancellations"] });
        setActionMap({});
      },
    },
  });

  const cancellations = data?.cancellations ?? [];

  function setAction(ref: string, field: "action" | "note", value: string) {
    setActionMap((m) => ({
      ...m,
      [ref]: { ...(m[ref] ?? { action: "", note: "" }), [field]: value },
    }));
  }

  return (
    <OwnerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cancellation Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and respond to customer cancellation requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">
            {cancellations.length} request{cancellations.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading && (
          <div className="text-center py-10 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        )}

        {!isLoading && cancellations.length === 0 && (
          <div className="text-center py-14">
            <CalendarX className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No cancellation requests</p>
          </div>
        )}

        <div className="space-y-4">
          {cancellations.map((c: any) => {
            const action = actionMap[c.cancelRef];
            const isPending = c.status === "requested";
            return (
              <Card key={c.id} className="border border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-mono">
                        {c.cancelRef}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {BOOKING_TYPE_LABELS[c.bookingType] ?? c.bookingType} —{" "}
                        <span className="font-mono">{c.bookingRef}</span>
                      </p>
                    </div>
                    <Badge
                      className={
                        STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"
                      }
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Customer: </span>
                    <span className="font-medium">{c.customerName ?? "—"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    <span>{c.reason}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {isPending && (
                    <div className="border-t border-border/40 pt-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Your Response</Label>
                        <Textarea
                          rows={2}
                          placeholder="Optional note to customer…"
                          value={action?.note ?? ""}
                          onChange={(e) =>
                            setAction(c.cancelRef, "note", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={processCancellation.isPending}
                          onClick={() =>
                            processCancellation.mutate({
                              ref: c.cancelRef,
                              data: {
                                action: "approve",
                                note: action?.note ?? "",
                              },
                            })
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={processCancellation.isPending}
                          onClick={() =>
                            processCancellation.mutate({
                              ref: c.cancelRef,
                              data: {
                                action: "reject",
                                note: action?.note ?? "",
                              },
                            })
                          }
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {c.ownerNote && !isPending && (
                    <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                      Your note: {c.ownerNote}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </OwnerLayout>
  );
}
