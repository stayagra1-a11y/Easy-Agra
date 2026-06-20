import { useState } from "react";
import { CustomerLayout } from "@/components/layout/customer-layout";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useGetMyRefunds,
  useGetMyCancellations,
  useRequestCancellation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  RefreshCw,
  Plus,
  ReceiptText,
  Ban,
  ArrowRight,
  CalendarX,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processed: "bg-blue-100 text-blue-800",
  requested: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  processed: "Refunded",
  requested: "Requested",
  cancelled: "Cancelled",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel Booking",
  restaurant: "Restaurant Reservation",
  spa: "Spa Appointment",
};

const CANCEL_REASONS = [
  "Change of plans",
  "Found better option",
  "Emergency / health issue",
  "Wrong booking",
  "Service dissatisfaction",
  "Other",
];

export default function CustomerRefunds() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("refunds");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    bookingType: "" as "hotel" | "restaurant" | "spa" | "",
    bookingRef: "",
    reason: "",
  });

  const { data: refundsData, isLoading: refundsLoading } = useGetMyRefunds();
  const { data: cancellationsData, isLoading: cancelLoading } =
    useGetMyCancellations();

  const requestCancel = useRequestCancellation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/cancellations/my"] });
        setCancelOpen(false);
        setCancelForm({ bookingType: "", bookingRef: "", reason: "" });
      },
    },
  });

  const refunds = refundsData?.refunds ?? [];
  const cancellations = cancellationsData?.cancellations ?? [];

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Refunds & Cancellations</h1>
            <p className="text-sm text-muted-foreground">
              Track your cancellation requests and refunds
            </p>
          </div>
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" />
                Request Cancellation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Cancellation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>Booking Type</Label>
                  <Select
                    value={cancelForm.bookingType}
                    onValueChange={(v) =>
                      setCancelForm((f) => ({
                        ...f,
                        bookingType: v as "hotel" | "restaurant" | "spa",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select booking type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">Hotel Booking</SelectItem>
                      <SelectItem value="restaurant">Restaurant Reservation</SelectItem>
                      <SelectItem value="spa">Spa Appointment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Booking Reference</Label>
                  <Input
                    placeholder="e.g. EAB-ABC123"
                    value={cancelForm.bookingRef}
                    onChange={(e) =>
                      setCancelForm((f) => ({ ...f, bookingRef: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Select
                    value={cancelForm.reason}
                    onValueChange={(v) =>
                      setCancelForm((f) => ({ ...f, reason: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANCEL_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground"
                  disabled={
                    !cancelForm.bookingType ||
                    !cancelForm.bookingRef ||
                    !cancelForm.reason ||
                    requestCancel.isPending
                  }
                  onClick={() => {
                    if (cancelForm.bookingType && cancelForm.bookingRef && cancelForm.reason) {
                      requestCancel.mutate({
                        data: {
                          bookingType: cancelForm.bookingType,
                          bookingRef: cancelForm.bookingRef,
                          reason: cancelForm.reason,
                        },
                      });
                    }
                  }}
                >
                  {requestCancel.isPending ? "Submitting…" : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="refunds" className="flex-1">
              <ReceiptText className="w-4 h-4 mr-1" />
              Refunds ({refunds.length})
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="flex-1">
              <CalendarX className="w-4 h-4 mr-1" />
              Cancellations ({cancellations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="refunds" className="space-y-3 mt-4">
            {refundsLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading refunds…
              </div>
            )}
            {!refundsLoading && refunds.length === 0 && (
              <div className="text-center py-10">
                <ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No refund requests yet</p>
              </div>
            )}
            {refunds.map((r: any) => (
              <Card key={r.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {r.refundRef}
                        </span>
                        <Badge
                          className={
                            STATUS_COLORS[r.status] ??
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Amount: ₹{Number(r.amount).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reason: {r.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Link href={`/refunds/${r.refundRef}`}>
                      <Button variant="outline" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cancellations" className="space-y-3 mt-4">
            {cancelLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading…
              </div>
            )}
            {!cancelLoading && cancellations.length === 0 && (
              <div className="text-center py-10">
                <Ban className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No cancellation requests
                </p>
              </div>
            )}
            {cancellations.map((c: any) => (
              <Card key={c.id} className="border border-border/60">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {c.cancelRef}
                    </span>
                    <Badge
                      className={
                        STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-700"
                      }
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {BOOKING_TYPE_LABELS[c.bookingType] ?? c.bookingType}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {c.bookingRef}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reason: {c.reason}
                  </p>
                  {c.ownerNote && (
                    <p className="text-xs text-muted-foreground">
                      Owner note: {c.ownerNote}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}
