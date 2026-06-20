import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { useGetOwnerPayments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  TrendingUp,
  Sparkles,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  successful: { label: "Successful", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  refunded: { label: "Refunded", color: "bg-blue-100 text-blue-800 border-blue-200", icon: RotateCcw },
  partially_refunded: { label: "Part. Refunded", color: "bg-purple-100 text-purple-800 border-purple-200", icon: RotateCcw },
};

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

export default function SpaOwnerPayments() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useGetOwnerPayments({
    bookingType: "spa",
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const payments = data?.payments ?? [];
  const totalRevenue = payments
    .filter((p) => p.paymentStatus === "successful")
    .reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  const pendingCount = payments.filter((p) => p.paymentStatus === "pending").length;

  return (
    <OwnerLayout>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Appointment Payments
          </h1>
          <p className="text-sm text-muted-foreground">Spa appointment payment history</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-emerald-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Revenue Received</span>
              </div>
              <div className="text-xl font-bold text-emerald-700">{fmtCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-amber-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-600">Pending</span>
              </div>
              <div className="text-xl font-bold text-amber-700">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="successful">Successful</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Payment Ref</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Appointment</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No payments yet</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const st = STATUS_CONFIG[payment.paymentStatus] ?? STATUS_CONFIG.pending;
                    const StatusIcon = st.icon;
                    const method = payment.paymentMethod
                      ? payment.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                      : "—";
                    return (
                      <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs">{payment.paymentRef}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{payment.bookingRef}</td>
                        <td className="p-3 text-muted-foreground">{(payment as any).customerName ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">{method}</td>
                        <td className="p-3 text-right font-semibold">{fmtCurrency(payment.paidAmount || payment.amount)}</td>
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
      </div>
    </OwnerLayout>
  );
}
