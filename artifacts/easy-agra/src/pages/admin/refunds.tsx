import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetAdminRefunds,
  useProcessRefund,
  useGetAdminCancellations,
  useProcessAdminCancellation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  ReceiptText,
  CalendarX,
  Filter,
  IndianRupee,
} from "lucide-react";

const REFUND_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processed: "bg-blue-100 text-blue-800",
};
const CANCEL_STATUS_COLORS: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function AdminRefunds() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("refunds");
  const [refundStatus, setRefundStatus] = useState("");
  const [cancelStatus, setCancelStatus] = useState("");
  const [actionMap, setActionMap] = useState<
    Record<string, { note: string; amount?: string }>
  >({});

  const { data: refundsData, isLoading: refundsLoading } = useGetAdminRefunds(
    refundStatus ? { status: refundStatus } : {},
  );
  const { data: cancelsData, isLoading: cancelsLoading } =
    useGetAdminCancellations(cancelStatus ? { status: cancelStatus } : {});

  const processRefund = useProcessRefund({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/refunds/admin"] });
        setActionMap({});
      },
    },
  });
  const processCancel = useProcessAdminCancellation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/admin/cancellations"] });
        setActionMap({});
      },
    },
  });

  const refunds = refundsData?.refunds ?? [];
  const cancels = cancelsData?.cancellations ?? [];

  function setField(key: string, field: "note" | "amount", value: string) {
    setActionMap((m) => ({
      ...m,
      [key]: { ...(m[key] ?? { note: "" }), [field]: value },
    }));
  }

  return (
    <AdminLayout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Refunds & Cancellations</h1>
          <p className="text-sm text-muted-foreground">
            Review, approve or reject refund and cancellation requests
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="refunds" className="flex-1">
              <ReceiptText className="w-4 h-4 mr-1" />
              Refund Requests ({refunds.length})
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="flex-1">
              <CalendarX className="w-4 h-4 mr-1" />
              Cancellations ({cancels.length})
            </TabsTrigger>
          </TabsList>

          {/* ── REFUNDS TAB ── */}
          <TabsContent value="refunds" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={refundStatus} onValueChange={setRefundStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {refundsLoading && (
              <div className="text-center py-10 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading…
              </div>
            )}

            {!refundsLoading && refunds.length === 0 && (
              <div className="text-center py-12">
                <ReceiptText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No refund requests</p>
              </div>
            )}

            {refunds.map((r: any) => {
              const key = String(r.id);
              const field = actionMap[key] ?? { note: "" };
              return (
                <Card key={r.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-mono">
                          {r.refundRef}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested by: {r.requestedByName ?? "—"}
                        </p>
                      </div>
                      <Badge
                        className={
                          REFUND_STATUS_COLORS[r.status] ??
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold text-primary">
                          ₹{Number(r.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {r.payment?.bookingRef && (
                        <div>
                          <span className="text-muted-foreground">Booking: </span>
                          <span className="font-mono text-xs">
                            {r.payment.bookingRef}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {r.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>

                    {r.status === "pending" && (
                      <div className="border-t border-border/40 pt-3 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Admin Note</Label>
                          <Textarea
                            rows={2}
                            placeholder="Note or rejection reason…"
                            value={field.note}
                            onChange={(e) =>
                              setField(key, "note", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={processRefund.isPending}
                            onClick={() =>
                              processRefund.mutate({
                                id: r.id,
                                data: {
                                  action: "approve",
                                  notes: field.note || undefined,
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
                            disabled={processRefund.isPending}
                            onClick={() =>
                              processRefund.mutate({
                                id: r.id,
                                data: {
                                  action: "reject",
                                  rejectionReason: field.note || undefined,
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

                    {r.status !== "pending" && r.processedByName && (
                      <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                        Processed by {r.processedByName}
                        {r.processedAt
                          ? ` on ${new Date(r.processedAt).toLocaleDateString("en-IN")}`
                          : ""}
                      </p>
                    )}
                    {r.rejectionReason && (
                      <p className="text-xs text-red-600">
                        Rejection: {r.rejectionReason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── CANCELLATIONS TAB ── */}
          <TabsContent value="cancellations" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={cancelStatus} onValueChange={setCancelStatus}>
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
            </div>

            {cancelsLoading && (
              <div className="text-center py-10 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading…
              </div>
            )}

            {!cancelsLoading && cancels.length === 0 && (
              <div className="text-center py-12">
                <CalendarX className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No cancellations</p>
              </div>
            )}

            {cancels.map((c: any) => {
              const key = `c-${c.cancelRef}`;
              const field = actionMap[key] ?? { note: "" };
              return (
                <Card key={c.id} className="border border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-mono">
                          {c.cancelRef}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.bookingType} — {c.bookingRef}
                        </p>
                      </div>
                      <Badge
                        className={
                          CANCEL_STATUS_COLORS[c.status] ??
                          "bg-gray-100 text-gray-700"
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
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {c.reason}
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

                    {c.status === "requested" && (
                      <div className="border-t border-border/40 pt-3 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Admin Note</Label>
                          <Textarea
                            rows={2}
                            placeholder="Note for customer…"
                            value={field.note}
                            onChange={(e) =>
                              setField(key, "note", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={processCancel.isPending}
                            onClick={() =>
                              processCancel.mutate({
                                ref: c.cancelRef,
                                data: {
                                  action: "approve",
                                  adminNote: field.note || undefined,
                                },
                              })
                            }
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve & Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={processCancel.isPending}
                            onClick={() =>
                              processCancel.mutate({
                                ref: c.cancelRef,
                                data: {
                                  action: "reject",
                                  adminNote: field.note || undefined,
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
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
