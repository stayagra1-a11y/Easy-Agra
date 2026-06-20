import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetEarningsOwner, useGetPayoutsMy, usePostPayouts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Clock, CheckCircle, Wallet, Download, Plus, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusColor(s: string) {
  if (s === "credited") return "bg-emerald-100 text-emerald-700";
  if (s === "pending") return "bg-amber-100 text-amber-700";
  if (s === "withdrawn") return "bg-slate-100 text-slate-600";
  return "bg-gray-100 text-gray-600";
}

function payoutStatusColor(s: string) {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "approved") return "bg-blue-100 text-blue-700";
  if (s === "pending") return "bg-amber-100 text-amber-700";
  if (s === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

export default function HotelOwnerEarnings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "",
  });

  const { data, isLoading } = useGetEarningsOwner({
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const { data: payoutsData } = useGetPayoutsMy();

  const requestPayout = usePostPayouts({
    mutation: {
      onSuccess: () => {
        toast({ title: "Withdrawal requested", description: "Your payout request has been submitted." });
        qc.invalidateQueries({ queryKey: ["/earnings/owner"] });
        qc.invalidateQueries({ queryKey: ["/payouts/my"] });
        setPayoutOpen(false);
        setPayoutAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Request failed", description: err?.response?.data?.error ?? "Please try again.", variant: "destructive" });
      },
    },
  });

  const summary = data?.summary;
  const earnings = data?.earnings ?? [];
  const payouts = payoutsData?.payouts ?? [];

  const handlePayoutRequest = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
      toast({ title: "Fill all bank details", variant: "destructive" });
      return;
    }
    requestPayout.mutate({
      data: { amount, bankDetails, notes: null },
    });
  };

  const handleExport = () => {
    if (!earnings.length) return;
    const csv = [
      ["Date", "Payment Ref", "Booking Type", "Gross", "Commission", "Net", "Status"].join(","),
      ...earnings.map((e) =>
        [fmtDate(e.createdAt), e.paymentRef ?? "—", e.bookingType, e.grossAmount, e.commissionAmount, e.netAmount, e.status].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings-report.csv";
    a.click();
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-7 h-7 text-primary" />
              My Earnings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Hotel booking revenue and payouts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-1" /> Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-700">
                      Available balance: <span className="font-bold">{fmtCurrency(summary?.creditedEarnings ?? 0)}</span>
                    </p>
                  </div>
                  <div>
                    <Label>Withdrawal Amount (₹)</Label>
                    <Input type="number" placeholder="Enter amount" value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Account Holder Name</Label>
                      <Input placeholder="Full name" value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Bank Name</Label>
                      <Input placeholder="e.g. SBI" value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input placeholder="Account number" value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>IFSC Code</Label>
                      <Input placeholder="IFSC" value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>UPI ID (optional)</Label>
                    <Input placeholder="yourname@upi" value={bankDetails.upiId}
                      onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })} className="mt-1" />
                  </div>
                  <Button onClick={handlePayoutRequest} disabled={requestPayout.isPending} className="w-full bg-primary text-white">
                    {requestPayout.isPending ? "Submitting…" : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Earnings", value: summary?.totalEarnings ?? 0, icon: IndianRupee, color: "text-primary", bg: "bg-primary/10" },
            { label: "Pending", value: summary?.pendingEarnings ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
            { label: "Credited", value: summary?.creditedEarnings ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
            { label: "Withdrawn", value: summary?.withdrawnEarnings ?? 0, icon: Wallet, color: "text-slate-600", bg: "bg-slate-100" },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${c.bg} p-2 rounded-lg`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-bold text-foreground">{fmtCurrency(c.value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By Booking Type */}
        {summary?.byBookingType && summary.byBookingType.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {summary.byBookingType.map((bt) => (
                  <div key={bt.bookingType} className="p-3 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground capitalize">{bt.bookingType}</p>
                    <p className="font-bold text-foreground">{fmtCurrency(bt.net)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{bt.count} booking{bt.count !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-red-500">−{fmtCurrency(bt.commission)} commission</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Revenue */}
        {summary?.monthlyRevenue && summary.monthlyRevenue.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.monthlyRevenue.slice(-6).reverse().map((m) => (
                  <div key={m.month} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{m.month}</span>
                    <div className="flex gap-6 text-sm">
                      <span className="text-foreground font-medium">{fmtCurrency(m.gross)} <span className="text-muted-foreground font-normal">gross</span></span>
                      <span className="text-red-500">−{fmtCurrency(m.commission)}</span>
                      <span className="text-emerald-600 font-semibold">{fmtCurrency(m.net)} net</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="credited">Credited</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setFrom(""); setTo(""); }}>Clear</Button>
        </div>

        {/* Earnings Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Earnings History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : earnings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No earnings yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{fmtDate(e.createdAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{e.earningRef}</TableCell>
                        <TableCell className="capitalize text-sm">{e.bookingType}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(e.grossAmount)}</TableCell>
                        <TableCell className="text-right text-red-500">−{fmtCurrency(e.commissionAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">{fmtCurrency(e.netAmount)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(e.status)}>{e.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        {payouts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{fmtDate(p.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.payoutRef}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge className={payoutStatusColor(p.status)}>{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
