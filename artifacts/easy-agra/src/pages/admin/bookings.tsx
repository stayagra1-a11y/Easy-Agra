import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useGetBookingStats,
  useListBookings,
  useCancelBooking,
  useConfirmBooking,
  useRejectBooking,
  useCheckInBooking,
  useCheckOutBooking,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  TrendingUp,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Users,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  checked_in: "bg-blue-100 text-blue-800 border-blue-200",
  checked_out: "bg-purple-100 text-purple-800 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDatetime(s: string) {
  return new Date(s).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DateFilter = "all" | "today" | "week" | "month" | "custom";

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const today = new Date();
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  if (filter === "today") return { dateFrom: toStr(today), dateTo: toStr(today) };
  if (filter === "week") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { dateFrom: toStr(from), dateTo: toStr(today) };
  }
  if (filter === "month") {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { dateFrom: toStr(from), dateTo: toStr(today) };
  }
  if (filter === "custom") return { dateFrom: customFrom || "", dateTo: customTo || "" };
  return { dateFrom: "", dateTo: "" };
}

function exportCSV(bookings: any[]) {
  const headers = [
    "Booking ID",
    "Customer",
    "Hotel",
    "Owner",
    "Room",
    "Check-in",
    "Check-out",
    "Nights",
    "Guests",
    "Base Amount",
    "Discount",
    "Tax",
    "Final Amount",
    "Status",
    "Date",
  ];
  const rows = bookings.map((b) => [
    b.bookingRef,
    b.customerName ?? "",
    b.hotelName ?? "",
    b.ownerName ?? "",
    b.roomName ?? "",
    b.checkInDate,
    b.checkOutDate,
    b.nights,
    b.adultsCount + b.childrenCount,
    b.baseAmount,
    b.discountAmount,
    b.taxAmount,
    b.finalAmount,
    b.status,
    fmtDatetime(b.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminBookings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [rejectDialog, setRejectDialog] = useState<{ id: number; ref: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { dateFrom, dateTo } = getDateRange(dateFilter, customFrom, customTo);

  const statsQuery = useGetBookingStats();
  const listQuery = useListBookings({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 15,
  });

  const confirmMut = useConfirmBooking();
  const rejectMut = useRejectBooking();
  const cancelMut = useCancelBooking();
  const checkInMut = useCheckInBooking();
  const checkOutMut = useCheckOutBooking();

  const stats = statsQuery.data;
  const bookings = listQuery.data?.bookings ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getBookingStats"] });
    queryClient.invalidateQueries({ queryKey: ["listBookings"] });
  }

  function handleConfirm(id: number, ref: string) {
    confirmMut.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Booking Confirmed", description: `${ref} confirmed.` });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
    });
  }

  function handleReject() {
    if (!rejectDialog || !rejectReason.trim()) return;
    rejectMut.mutate(
      { id: rejectDialog.id, data: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Booking Rejected", description: `${rejectDialog.ref} rejected.` });
          setRejectDialog(null);
          setRejectReason("");
          invalidate();
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
      },
    );
  }

  function handleCancel(id: number, ref: string) {
    cancelMut.mutate({ id, data: { reason: "Cancelled by admin" } }, {
      onSuccess: () => {
        toast({ title: "Booking Cancelled", description: `${ref} cancelled.` });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
    });
  }

  function handleCheckIn(id: number, ref: string) {
    checkInMut.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Checked In", description: `${ref} checked in.` });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
    });
  }

  function handleCheckOut(id: number, ref: string) {
    checkOutMut.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Checked Out", description: `${ref} completed.` });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
    });
  }

  function handlePrintPDF() {
    window.print();
  }

  const statCards = [
    { label: "Total Bookings", value: stats?.total ?? 0, icon: BookOpen, color: "text-teal-700", bg: "bg-teal-50" },
    { label: "Today", value: stats?.todayBookings ?? 0, icon: CalendarDays, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "This Week", value: stats?.weekBookings ?? 0, icon: Calendar, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "This Month", value: stats?.monthBookings ?? 0, icon: TrendingUp, color: "text-purple-700", bg: "bg-purple-50" },
    { label: "Total Revenue", value: fmtCurrency(stats?.totalRevenue ?? 0), icon: IndianRupee, color: "text-emerald-700", bg: "bg-emerald-50", wide: true },
    { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Confirmed", value: stats?.confirmed ?? 0, icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Cancelled", value: (stats?.cancelled ?? 0) + (stats?.rejected ?? 0), icon: XCircle, color: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 print:p-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booking Monitoring</h1>
            <p className="text-sm text-muted-foreground">Track and monitor all platform bookings</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(bookings)}
              disabled={bookings.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Excel/CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPDF}>
              <FileText className="w-4 h-4 mr-1" />
              Print PDF
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsQuery.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : statCards.map((s) => (
                <Card key={s.label} className={`border-0 shadow-sm ${s.wide ? "col-span-2 md:col-span-1" : ""}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-lg font-bold text-foreground">{s.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm print:hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Booking ID, Customer, Hotel, Owner…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v as DateFilter); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Bookings ({total})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No bookings found</p>
              </div>
            ) : (
              <div className="divide-y">
                {bookings.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-primary">{b.bookingRef}</span>
                          <Badge className={`text-xs border ${STATUS_COLORS[b.status] ?? "bg-gray-100"}`} variant="outline">
                            {STATUS_LABELS[b.status] ?? b.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm font-medium text-foreground truncate">
                          {b.customerName} → {b.hotelName}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground space-y-0.5">
                          <div>Room: {b.roomName} &nbsp;|&nbsp; Owner: {b.ownerName}</div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {b.checkInDate} → {b.checkOutDate} ({b.nights} nights)
                            &nbsp;|&nbsp;
                            <Users className="w-3 h-3" />
                            {b.adultsCount} adults{b.childrenCount > 0 ? `, ${b.childrenCount} children` : ""}
                          </div>
                          <div className="text-[11px] text-muted-foreground/70">
                            Booked: {fmtDatetime(b.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-foreground">{fmtCurrency(b.finalAmount)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Base {fmtCurrency(b.baseAmount)} + GST {fmtCurrency(b.taxAmount)}
                          </div>
                        </div>
                        <div className="flex gap-1 print:hidden">
                          {b.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleConfirm(b.id, b.bookingRef)}
                                disabled={confirmMut.isPending}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={() => setRejectDialog({ id: b.id, ref: b.bookingRef })}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {b.status === "confirmed" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleCheckIn(b.id, b.bookingRef)}
                                disabled={checkInMut.isPending}
                              >
                                Check In
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleCancel(b.id, b.bookingRef)}
                                disabled={cancelMut.isPending}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {b.status === "checked_in" && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700"
                              onClick={() => handleCheckOut(b.id, b.bookingRef)}
                              disabled={checkOutMut.isPending}
                            >
                              Check Out
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t print:hidden">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking {rejectDialog?.ref}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm text-muted-foreground">Rejection Reason *</label>
            <Input
              placeholder="Enter reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMut.isPending}
            >
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
