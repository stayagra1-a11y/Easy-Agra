import { useState } from "react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import {
  useGetMyPayments,
  useGetMyRefunds,
  useRequestRefund,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IndianRupee,
  Receipt,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Smartphone,
  Building2,
  Wallet,
  Hotel,
  Utensils,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
  },
  successful: {
    label: "Successful",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: RotateCcw,
  },
  partially_refunded: {
    label: "Partially Refunded",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: RotateCcw,
  },
};

const REFUND_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200" },
  processed: { label: "Processed", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const METHOD_ICONS: Record<string, any> = {
  upi: Smartphone,
  credit_card: CreditCard,
  debit_card: CreditCard,
  net_banking: Building2,
  wallet: Wallet,
};

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  net_banking: "Net Banking",
  wallet: "Wallet",
};

const BOOKING_ICONS: Record<string, any> = {
  hotel: Hotel,
  restaurant: Utensils,
  spa: Sparkles,
};

const BOOKING_LABELS: Record<string, string> = {
  hotel: "Hotel Booking",
  restaurant: "Restaurant Reservation",
  spa: "Spa Appointment",
};

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

interface RefundDialogProps {
  paymentId: number;
  paymentRef: string;
  maxAmount: number;
  open: boolean;
  onClose: () => void;
}

function RefundDialog({ paymentId, paymentRef, maxAmount, open, onClose }: RefundDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const requestRefund = useRequestRefund();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: "Please enter a reason", variant: "destructive" });
      return;
    }
    try {
      await requestRefund.mutateAsync({
        data: { paymentId, amount: maxAmount, reason },
      });
      toast({
        title: "Refund requested",
        description: "Our team will review your request within 3-5 business days.",
      });
      setReason("");
      onClose();
    } catch {
      toast({ title: "Failed to request refund", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Request Refund
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-mono text-xs">{paymentRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refund Amount</span>
              <span className="font-bold text-primary">{fmtCurrency(maxAmount)}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Reason for refund <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you're requesting a refund…"
              rows={3}
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <span>Refunds are processed within 5–7 business days after approval.</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary"
            onClick={handleSubmit}
            disabled={requestRefund.isPending}
          >
            {requestRefund.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MyPayments() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [refundTarget, setRefundTarget] = useState<{
    paymentId: number;
    paymentRef: string;
    amount: number;
  } | null>(null);

  const paymentsQuery = useGetMyPayments({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const refundsQuery = useGetMyRefunds();

  const payments = paymentsQuery.data?.payments ?? [];
  const refunds = refundsQuery.data?.refunds ?? [];

  // Stats from current data
  const totalPaid = payments
    .filter((p) => p.paymentStatus === "successful")
    .reduce((sum, p) => sum + p.paidAmount, 0);

  const pending = payments.filter((p) => p.paymentStatus === "pending").length;

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            My Payments
          </h1>
          <p className="text-sm text-muted-foreground">Payment history & receipts</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-emerald-50">
            <CardContent className="p-3">
              <div className="text-xs text-emerald-600 font-medium">Total Paid</div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">
                {fmtCurrency(totalPaid)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-amber-50">
            <CardContent className="p-3">
              <div className="text-xs text-amber-600 font-medium">Pending</div>
              <div className="text-xl font-bold text-amber-700 mt-0.5">{pending}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments">
          <TabsList className="w-full">
            <TabsTrigger value="payments" className="flex-1">
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex-1">
              Refunds ({refunds.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Payments Tab ── */}
          <TabsContent value="payments" className="space-y-3 mt-3">
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["all", "pending", "successful", "failed", "refunded"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}
            </div>

            {paymentsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <IndianRupee className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No payments found</p>
                <p className="text-xs mt-1">Your payment history will appear here</p>
              </div>
            ) : (
              payments.map((payment) => {
                const st = STATUS_CONFIG[payment.paymentStatus] ?? STATUS_CONFIG.pending;
                const StatusIcon = st.icon;
                const BookingIcon = BOOKING_ICONS[payment.bookingType] ?? Receipt;
                const MethodIcon = payment.paymentMethod
                  ? (METHOD_ICONS[payment.paymentMethod] ?? CreditCard)
                  : CreditCard;
                const canRefund = payment.paymentStatus === "successful";

                return (
                  <Card
                    key={payment.id}
                    className="border border-border/60 shadow-sm overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <BookingIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {BOOKING_LABELS[payment.bookingType] ?? "Booking"}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {payment.bookingRef}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-xs border ${st.color} shrink-0`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {st.label}
                        </Badge>
                      </div>

                      {/* Amount row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {fmtCurrency(payment.paidAmount || payment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.paymentMode === "advance" && (
                              <span className="text-amber-600">Advance · </span>
                            )}
                            Total: {fmtCurrency(payment.amount)}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {payment.paidAt ? fmtDateTime(payment.paidAt) : fmtDate(payment.createdAt)}
                        </div>
                      </div>

                      {/* Payment method + ref */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <div className="flex items-center gap-1.5">
                          {payment.paymentMethod ? (
                            <>
                              <MethodIcon className="h-3.5 w-3.5" />
                              <span>{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</span>
                            </>
                          ) : (
                            <span>Payment method not selected</span>
                          )}
                        </div>
                        <span className="font-mono">{payment.paymentRef}</span>
                      </div>

                      {/* Failure reason */}
                      {payment.failureReason && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{payment.failureReason}</span>
                        </div>
                      )}

                      {/* Transactions */}
                      {payment.transactions && payment.transactions.length > 0 && (
                        <div className="bg-muted/40 rounded-lg p-2 space-y-1">
                          {payment.transactions.map((t: any) => (
                            <div key={t.id} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t.description}</span>
                              <span
                                className={`font-medium ${t.type === "refund" || t.type === "partial_refund" ? "text-blue-600" : "text-emerald-600"}`}
                              >
                                {fmtCurrency(t.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      {canRefund && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                          onClick={() =>
                            setRefundTarget({
                              paymentId: payment.id,
                              paymentRef: payment.paymentRef,
                              amount: payment.paidAmount,
                            })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Request Refund
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ── Refunds Tab ── */}
          <TabsContent value="refunds" className="space-y-3 mt-3">
            {refundsQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))
            ) : refunds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No refunds requested</p>
                <p className="text-xs mt-1">Your refund requests will appear here</p>
              </div>
            ) : (
              refunds.map((refund: any) => {
                const st = REFUND_STATUS_CONFIG[refund.status] ?? REFUND_STATUS_CONFIG.pending;
                return (
                  <Card key={refund.id} className="border border-border/60 shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{fmtCurrency(refund.amount)}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {refund.refundRef}
                          </div>
                        </div>
                        <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Reason:</span> {refund.reason}
                      </div>
                      {refund.rejectionReason && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                          <span className="font-medium">Rejection reason:</span> {refund.rejectionReason}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Requested on {fmtDate(refund.createdAt)}
                        {refund.processedAt && ` · Processed on ${fmtDate(refund.processedAt)}`}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Refund Dialog */}
      {refundTarget && (
        <RefundDialog
          paymentId={refundTarget.paymentId}
          paymentRef={refundTarget.paymentRef}
          maxAmount={refundTarget.amount}
          open={!!refundTarget}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </CustomerLayout>
  );
}
