import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useGetAdminPayments,
  useGetAdminRefunds,
  useGetPaymentAnalytics,
  useProcessRefund,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  TrendingUp,
  CreditCard,
  Hotel,
  Utensils,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  successful: { label: "Successful", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  refunded: { label: "Refunded", color: "bg-blue-100 text-blue-800 border-blue-200", icon: RotateCcw },
  partially_refunded: { label: "Part. Refunded", color: "bg-purple-100 text-purple-800 border-purple-200", icon: RotateCcw },
};

const REFUND_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  processed: { label: "Processed", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const BOOKING_ICONS: Record<string, any> = { hotel: Hotel, restaurant: Utensils, spa: Sparkles };
const BOOKING_LABELS: Record<string, string> = { hotel: "Hotel", restaurant: "Restaurant", spa: "Spa" };

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function AnalyticsCards() {
  const { data, isLoading } = useGetPaymentAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Revenue",
      value: fmtCurrency(data?.totalRevenue ?? 0),
      icon: TrendingUp,
      bg: "bg-emerald-50",
      color: "text-emerald-700",
      iconColor: "text-emerald-500",
    },
    {
      label: "Successful",
      value: String(data?.successfulPayments ?? 0),
      icon: CheckCircle2,
      bg: "bg-blue-50",
      color: "text-blue-700",
      iconColor: "text-blue-500",
    },
    {
      label: "Failed",
      value: String(data?.failedPayments ?? 0),
      icon: XCircle,
      bg: "bg-red-50",
      color: "text-red-700",
      iconColor: "text-red-500",
    },
    {
      label: "Refunded",
      value: fmtCurrency(data?.refundedAmount ?? 0),
      icon: RotateCcw,
      bg: "bg-purple-50",
      color: "text-purple-700",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={`border-0 ${c.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${c.iconColor}`} />
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              </div>
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RevenueBreakdown() {
  const { data } = useGetPaymentAnalytics();
  if (!data) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* By booking type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Revenue by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.revenueByType.map((r) => {
            const Icon = BOOKING_ICONS[r.bookingType] ?? CreditCard;
            const total = data.totalRevenue || 1;
            const pct = Math.round((r.revenue / total) * 100);
            return (
              <div key={r.bookingType}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{BOOKING_LABELS[r.bookingType] ?? r.bookingType}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{fmtCurrency(r.revenue)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({r.count})</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {data.revenueByType.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* By payment method */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Revenue by Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.revenueByMethod.map((r) => {
            const total = data.totalRevenue || 1;
            const pct = Math.round((r.revenue / total) * 100);
            const label = r.paymentMethod
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <div key={r.paymentMethod}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{label}</span>
                  <div className="text-right">
                    <span className="font-semibold">{fmtCurrency(r.revenue)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({r.count})</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {data.revenueByMethod.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ProcessRefundDialogProps {
  refund: any;
  open: boolean;
  onClose: () => void;
}

function ProcessRefundDialog({ refund, open, onClose }: ProcessRefundDialogProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const processRefund = useProcessRefund();

  const handleProcess = async () => {
    if (!action) return;
    if (action === "reject" && !reason.trim()) {
      toast({ title: "Please enter a rejection reason", variant: "destructive" });
      return;
    }
    try {
      await processRefund.mutateAsync({
        id: refund.id,
        data: { action, rejectionReason: action === "reject" ? reason : undefined },
      });
      toast({
        title: action === "approve" ? "Refund approved" : "Refund rejected",
        description: action === "approve"
          ? "The refund has been processed successfully."
          : "The refund has been rejected.",
      });
      setAction(null);
      setReason("");
      onClose();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Process Refund Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Ref</span>
              <span className="font-mono text-xs">{refund.refundRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-primary">{fmtCurrency(refund.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reason</span>
              <span className="text-right max-w-[60%] text-xs">{refund.reason}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAction("approve")}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                action === "approve"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-border hover:border-emerald-300"
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => setAction("reject")}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                action === "reject"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border hover:border-red-300"
              }`}
            >
              Reject
            </button>
          </div>
          {action === "reject" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the refund is being rejected…"
                rows={2}
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary"
            disabled={!action || processRefund.isPending}
            onClick={handleProcess}
          >
            {processRefund.isPending ? "Processing…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<any | null>(null);

  const paymentsQuery = useGetAdminPayments({
    status: statusFilter === "all" ? undefined : statusFilter,
    bookingType: typeFilter === "all" ? undefined : typeFilter,
    search: search || undefined,
    limit: 50,
  });

  const refundsQuery = useGetAdminRefunds({
    status: refundStatusFilter === "all" ? undefined : refundStatusFilter,
  });

  const payments = paymentsQuery.data?.payments ?? [];
  const refunds = refundsQuery.data?.refunds ?? [];
  const pendingRefunds = refunds.filter((r: any) => r.status === "pending").length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <IndianRupee className="h-6 w-6" />
              Payment Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor transactions, revenue and refunds
            </p>
          </div>
        </div>

        {/* Analytics cards */}
        <AnalyticsCards />

        {/* Revenue breakdown */}
        <RevenueBreakdown />

        {/* Main tabs */}
        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">
              All Transactions ({paymentsQuery.data?.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="relative">
              Refunds ({refundsQuery.data?.total ?? 0})
              {pendingRefunds > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {pendingRefunds}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Transactions Tab ── */}
          <TabsContent value="transactions" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payment or booking ref…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payments table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Payment Ref</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Booking</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paymentsQuery.isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="p-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-muted-foreground">
                          <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => {
                        const st = STATUS_CONFIG[payment.paymentStatus] ?? STATUS_CONFIG.pending;
                        const StatusIcon = st.icon;
                        const BookingIcon = BOOKING_ICONS[payment.bookingType] ?? CreditCard;
                        const method = payment.paymentMethod
                          ? payment.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                          : "—";

                        return (
                          <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono text-xs">{payment.paymentRef}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <BookingIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-medium">{BOOKING_LABELS[payment.bookingType] ?? payment.bookingType}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{payment.bookingRef}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{(payment as any).customerName ?? "—"}</td>
                            <td className="p-3 text-muted-foreground">{method}</td>
                            <td className="p-3 text-right font-semibold">
                              {fmtCurrency(payment.paidAmount || payment.amount)}
                            </td>
                            <td className="p-3">
                              <Badge className={`text-xs border ${st.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {st.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {fmtDateTime(payment.paidAt ?? payment.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Refunds Tab ── */}
          <TabsContent value="refunds" className="space-y-4 mt-4">
            <div className="flex gap-3">
              <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Refunds</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Refund Ref</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Reason</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Requested</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {refundsQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={8} className="p-3">
                            <Skeleton className="h-5 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : refunds.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground">
                          <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No refund requests found</p>
                        </td>
                      </tr>
                    ) : (
                      refunds.map((refund: any) => {
                        const st = REFUND_STATUS_CONFIG[refund.status] ?? REFUND_STATUS_CONFIG.pending;
                        return (
                          <tr key={refund.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono text-xs">{refund.refundRef}</td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">
                              {refund.payment?.paymentRef ?? "—"}
                            </td>
                            <td className="p-3 text-muted-foreground">{refund.requestedByName ?? "—"}</td>
                            <td className="p-3 text-right font-semibold">{fmtCurrency(refund.amount)}</td>
                            <td className="p-3 text-muted-foreground max-w-[160px] truncate">{refund.reason}</td>
                            <td className="p-3">
                              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{fmtDate(refund.createdAt)}</td>
                            <td className="p-3">
                              {refund.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setSelectedRefund(refund)}
                                >
                                  Review
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedRefund && (
        <ProcessRefundDialog
          refund={selectedRefund}
          open={!!selectedRefund}
          onClose={() => setSelectedRefund(null)}
        />
      )}
    </AdminLayout>
  );
}
