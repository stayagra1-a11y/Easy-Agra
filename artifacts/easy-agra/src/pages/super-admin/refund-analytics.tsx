import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
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
import {
  useGetRefundAnalytics,
  useGetAdminRefunds,
  useOverrideRefund,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  ReceiptText,
  TrendingDown,
  CheckCircle,
  XCircle,
  IndianRupee,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processed: "bg-blue-100 text-blue-800",
};

export default function SuperAdminRefundAnalytics() {
  const qc = useQueryClient();
  const [overrideMap, setOverrideMap] = useState<
    Record<string, { action: string; reason: string }>
  >({});

  const { data: analyticsData, isLoading: analyticsLoading } =
    useGetRefundAnalytics();
  const { data: refundsData, isLoading: refundsLoading } = useGetAdminRefunds({
    status: "pending",
  });

  const overrideRefund = useOverrideRefund({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/refunds/admin"] });
        qc.invalidateQueries({ queryKey: ["/refunds/analytics"] });
        setOverrideMap({});
      },
    },
  });

  const analytics = analyticsData ?? {
    totalRequests: 0,
    approvedCount: 0,
    rejectedCount: 0,
    processedCount: 0,
    pendingCount: 0,
    totalRefundedAmount: 0,
    approvalRate: 0,
  };
  const refunds = refundsData?.refunds ?? [];

  function setField(ref: string, field: "action" | "reason", value: string) {
    setOverrideMap((m) => ({
      ...m,
      [ref]: { ...(m[ref] ?? { action: "", reason: "" }), [field]: value },
    }));
  }

  const statsCards = [
    {
      label: "Total Requests",
      value: analytics.totalRequests,
      icon: ReceiptText,
      color: "text-primary",
    },
    {
      label: "Approved",
      value: analytics.approvedCount,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Rejected",
      value: analytics.rejectedCount,
      icon: XCircle,
      color: "text-red-600",
    },
    {
      label: "Pending",
      value: analytics.pendingCount,
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Refund Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide refund overview and manual override controls
          </p>
        </div>

        {analyticsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading analytics…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${color}`} />
                    <div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Total Refunded Amount</p>
                  <p className="text-3xl font-bold text-primary">
                    ₹{Number(analytics.totalRefundedAmount).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Approval Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.approvalRate ?? 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Pending Refunds — Override</h2>
          </div>

          {refundsLoading && (
            <div className="text-center py-6 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading…
            </div>
          )}

          {!refundsLoading && refunds.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No pending refunds to review
              </p>
            </div>
          )}

          <div className="space-y-4">
            {refunds.map((r: any) => {
              const key = r.refundRef;
              const override = overrideMap[key] ?? { action: "", reason: "" };
              return (
                <Card key={r.id} className="border border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">
                        {r.refundRef}
                      </CardTitle>
                      <Badge
                        className={
                          STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-700"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold text-primary">
                          ₹{Number(r.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">By: </span>
                        <span>{r.requestedByName ?? "—"}</span>
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      {r.reason}
                    </p>

                    <div className="border-t border-border/40 pt-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Override Reason</Label>
                        <Textarea
                          rows={2}
                          placeholder="Reason for override decision…"
                          value={override.reason}
                          onChange={(e) =>
                            setField(key, "reason", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={overrideRefund.isPending}
                          onClick={() =>
                            overrideRefund.mutate({
                              ref: key,
                              data: {
                                action: "approve",
                                reason: override.reason,
                              },
                            })
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Override Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={overrideRefund.isPending}
                          onClick={() =>
                            overrideRefund.mutate({
                              ref: key,
                              data: {
                                action: "reject",
                                reason: override.reason,
                              },
                            })
                          }
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Override Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
