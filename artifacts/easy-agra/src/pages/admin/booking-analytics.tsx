import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetBookingAnalytics, useGetBookingStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Hotel,
  Users,
  BedDouble,
  IndianRupee,
  Download,
  FileText,
} from "lucide-react";

const CHART_COLORS = [
  "hsl(188, 86%, 20%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 50%)",
  "hsl(142, 72%, 29%)",
  "hsl(0, 72%, 51%)",
  "hsl(271, 81%, 56%)",
];

function fmtCurrency(n: number) {
  if (n >= 100000)
    return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)
    return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtRoomType(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-xs">
      <div className="font-semibold mb-1 text-foreground">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number" && entry.name?.toLowerCase().includes("revenue")
            ? fmtCurrency(entry.value)
            : entry.value}
        </div>
      ))}
    </div>
  );
};

function exportCSV(data: object[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys, ...data.map((row) => keys.map((k) => (row as any)[k]))]
    .map((row) => row.map((c) => `"${String(c)}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BookingAnalytics() {
  const analyticsQuery = useGetBookingAnalytics();
  const statsQuery = useGetBookingStats();
  const analytics = analyticsQuery.data;
  const stats = statsQuery.data;

  const revByDay = (analytics?.byDay ?? []).map((d) => ({
    date: d.date.slice(5),
    Bookings: d.bookingCount,
    Revenue: d.revenue,
  }));

  const roomTypeData = (analytics?.topRoomTypes ?? []).map((r, i) => ({
    name: fmtRoomType(r.roomType),
    value: r.bookingCount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const topHotelsData = (analytics?.topHotelsByBookings ?? []).map((h) => ({
    name: h.hotelName.length > 20 ? h.hotelName.slice(0, 18) + "…" : h.hotelName,
    Bookings: h.bookingCount,
    Revenue: h.revenue,
  }));

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booking Analytics</h1>
            <p className="text-sm text-muted-foreground">Revenue trends, hotel performance, and booking insights</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV(analytics?.byDay ?? [], "daily-analytics.csv")}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileText className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Revenue summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: fmtCurrency(stats.totalRevenue), icon: IndianRupee, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Confirmed Revenue", value: fmtCurrency(stats.confirmedRevenue), icon: TrendingUp, color: "text-teal-700", bg: "bg-teal-50" },
              { label: "Checked Out", value: stats.checkedOut, icon: Users, color: "text-purple-700", bg: "bg-purple-50" },
              { label: "Checked In", value: stats.checkedIn, icon: Hotel, color: "text-blue-700", bg: "bg-blue-50" },
            ].map((s) => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
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
        )}

        {/* Bookings & Revenue by Day */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Bookings By Day (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : revByDay.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Bookings"
                      stroke={CHART_COLORS[0]}
                      fill="url(#colBookings)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                Revenue By Day (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : revByDay.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revByDay} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => fmtCurrency(v)} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke={CHART_COLORS[1]}
                      fill="url(#colRevenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Hotels + Room Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Hotel className="w-4 h-4 text-primary" />
                Top Hotels By Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : topHotelsData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topHotelsData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Bookings" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-primary" />
                Most Booked Room Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : roomTypeData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={roomTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={40}
                      >
                        {roomTypeData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} bookings`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {roomTypeData.map((r) => (
                      <div key={r.name} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.fill }} />
                        <span className="text-foreground flex-1 truncate">{r.name}</span>
                        <Badge variant="outline" className="text-xs">{r.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Hotels by Revenue + Top Owners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                Top Hotels By Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : (analytics?.topHotelsByBookings ?? []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="space-y-3">
                  {[...(analytics?.topHotelsByBookings ?? [])]
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((h, i) => {
                      const maxRev = Math.max(...(analytics?.topHotelsByBookings ?? []).map((x) => x.revenue), 1);
                      return (
                        <div key={h.hotelId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                                {i + 1}
                              </span>
                              <span className="font-medium text-foreground truncate max-w-[140px]">{h.hotelName}</span>
                            </div>
                            <span className="font-bold text-emerald-700">{fmtCurrency(h.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${(h.revenue / maxRev) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Top Hotel Owners
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
                </div>
              ) : (analytics?.topOwners ?? []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="space-y-3">
                  {(analytics?.topOwners ?? []).map((o, i) => (
                    <div key={o.ownerId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{o.ownerName}</div>
                        <div className="text-xs text-muted-foreground">{o.bookingCount} bookings</div>
                      </div>
                      <div className="font-bold text-emerald-700 text-sm">{fmtCurrency(o.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
