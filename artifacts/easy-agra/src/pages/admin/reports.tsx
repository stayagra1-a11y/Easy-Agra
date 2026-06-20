import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileBarChart, Download, TrendingUp, IndianRupee, ReceiptText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type ReportType = "revenue" | "commission" | "earnings";

interface ReportData {
  generatedAt: string;
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalCommission: number;
    totalOwnerEarnings: number;
    totalPayouts: number;
    totalBookings: number;
  };
  byType: Array<{ bookingType: string; revenue: number; commission: number; ownerEarnings: number; bookings: number }>;
  monthly: Array<{ month: string; revenue: number; commission: number; ownerEarnings: number }>;
  rows: Array<{ date: string; paymentRef: string; bookingType: string; gross: number; commission: number; net: number; ownerName: string; status: string }>;
}

export default function AdminReports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bookingType, setBookingType] = useState("");
  const [generated, setGenerated] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleGenerate = async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (bookingType && bookingType !== "all") params.set("bookingType", bookingType);
      const endpoint = reportType === "revenue" ? "revenue" : reportType === "commission" ? "commission" : "earnings";
      const res = await fetch(`/api/reports/${endpoint}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch report");
      const data: ReportData = await res.json();
      setCurrentReport(data);
      setGenerated(true);
    } catch {
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentReport?.rows.length) return;
    const headers = ["Date", "Payment Ref", "Booking Type", "Gross (₹)", "Commission (₹)", "Net (₹)", "Owner", "Status"];
    const csvRows = currentReport.rows.map((r) =>
      [r.date, r.paymentRef, r.bookingType, r.gross, r.commission, r.net, r.ownerName, r.status].join(","),
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!currentReport) return;
    const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColors: Record<string, string> = {
    hotel: "bg-blue-100 text-blue-700",
    restaurant: "bg-orange-100 text-orange-700",
    spa: "bg-purple-100 text-purple-700",
  };

  const reportCards = [
    {
      id: "revenue" as const,
      label: "Revenue Report",
      desc: "Full platform revenue with gross, commission, and owner earnings",
      icon: IndianRupee,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      id: "commission" as const,
      label: "Commission Report",
      desc: "Platform commission earned broken down by type and period",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      id: "earnings" as const,
      label: "Owner Earnings Report",
      desc: "Net earnings paid out to owners after commission deduction",
      icon: ReceiptText,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-primary" />
            Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Generate and export revenue, commission and earnings reports</p>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportCards.map((rc) => (
            <button
              key={rc.id}
              onClick={() => { setReportType(rc.id); setGenerated(false); }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                reportType === rc.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className={`${rc.bg} p-2 rounded-lg inline-flex mb-3`}>
                <rc.icon className={`w-5 h-5 ${rc.color}`} />
              </div>
              <p className="font-semibold text-sm text-foreground">{rc.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{rc.desc}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label className="text-xs">From Date</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-36" />
              </div>
              <div>
                <Label className="text-xs">To Date</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-36" />
              </div>
              <div>
                <Label className="text-xs">Booking Type</Label>
                <Select value={bookingType} onValueChange={setBookingType}>
                  <SelectTrigger className="w-36 mt-1">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="spa">Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={isFetching} className="bg-primary text-white">
                {isFetching ? "Generating…" : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Output */}
        {generated && currentReport && (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {reportCards.find((r) => r.id === reportType)?.label} — {currentReport.period.from} to {currentReport.period.to}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="w-4 h-4 mr-1" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <Download className="w-4 h-4 mr-1" /> Export JSON
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Generated: {new Date(currentReport.generatedAt).toLocaleString()}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Total Revenue", value: currentReport.summary.totalRevenue },
                    { label: "Commission", value: currentReport.summary.totalCommission },
                    { label: "Owner Earnings", value: currentReport.summary.totalOwnerEarnings },
                    { label: "Total Payouts", value: currentReport.summary.totalPayouts },
                    { label: "Bookings", value: currentReport.summary.totalBookings, isCnt: true },
                  ].map((s) => (
                    <div key={s.label} className="p-3 bg-muted/40 rounded-lg">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-bold text-foreground">{s.isCnt ? s.value : fmtCurrency(s.value as number)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Type */}
            {currentReport.byType.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Breakdown by Booking Type</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Owner Earnings</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReport.byType.map((bt) => (
                        <TableRow key={bt.bookingType}>
                          <TableCell><Badge className={typeColors[bt.bookingType] ?? ""}>{bt.bookingType}</Badge></TableCell>
                          <TableCell className="text-right">{fmtCurrency(bt.revenue)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{fmtCurrency(bt.commission)}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(bt.ownerEarnings)}</TableCell>
                          <TableCell className="text-right">{bt.bookings}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Monthly Breakdown */}
            {currentReport.monthly.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Owner Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...currentReport.monthly].reverse().map((m) => (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium">{m.month}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(m.revenue)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{fmtCurrency(m.commission)}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(m.ownerEarnings)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Detailed Rows */}
            {currentReport.rows.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Transaction Detail ({currentReport.rows.length} records)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Payment Ref</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentReport.rows.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="font-mono text-xs">{r.paymentRef}</TableCell>
                            <TableCell className="text-sm">{r.ownerName}</TableCell>
                            <TableCell><Badge className={typeColors[r.bookingType] ?? ""}>{r.bookingType}</Badge></TableCell>
                            <TableCell className="text-right text-sm">{fmtCurrency(r.gross)}</TableCell>
                            <TableCell className="text-right text-sm text-emerald-600">{fmtCurrency(r.commission)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{fmtCurrency(r.net)}</TableCell>
                            <TableCell>
                              <Badge className={r.status === "credited" ? "bg-emerald-100 text-emerald-700" : r.status === "withdrawn" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentReport.rows.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No data found for the selected filters
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {generated && !currentReport && !isFetching && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">No data found for the selected period</CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
