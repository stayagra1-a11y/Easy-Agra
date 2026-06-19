import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useListBookings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Hotel,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
} from "lucide-react";

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
  checked_out: "Completed",
};

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyBookings() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const listQuery = useListBookings({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: 10,
  });

  const bookings = listQuery.data?.bookings ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground">Your hotel stay history</p>
        </div>

        {/* Filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger>
            <SelectValue placeholder="All Bookings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Booking list */}
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Hotel className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No bookings found</p>
              <Link href="/">
                <Button className="mt-4 bg-primary hover:bg-primary/90" size="sm">
                  Explore Hotels
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-foreground text-sm truncate max-w-[200px]">
                        {b.hotelName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{b.bookingRef}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${STATUS_COLORS[b.status] ?? ""}`}
                    >
                      {STATUS_LABELS[b.status] ?? b.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)} ({b.nights} nights)
                    </div>
                    <div className="flex items-center gap-1">
                      <Hotel className="w-3 h-3" />
                      {b.roomName}
                    </div>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {fmtCurrency(b.finalAmount)}
                    </div>
                  </div>

                  {b.status === "checked_out" && (
                    <Link href={`/customer/write-review/${b.id}`}>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Write a Review
                      </Button>
                    </Link>
                  )}
                  {b.status === "pending" && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                      <Clock className="w-3 h-3" />
                      Waiting for hotel confirmation
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
