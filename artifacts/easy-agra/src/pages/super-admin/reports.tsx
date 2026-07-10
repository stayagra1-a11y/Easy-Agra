import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, TrendingUp, Users, IndianRupee, BarChart2, FileBarChart, BookOpen, RotateCcw } from "lucide-react";

const BASE = getApiBase();

async function fetchRevenue(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE}/api/reports/revenue?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch revenue report");
  return res.json();
}

async function fetchUserReport() {
  const res = await fetch(`${BASE}/api/admin/reports/users`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user report");
  return res.json();
}

async function fetchBookingsReport(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE}/api/admin/reports/bookings?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch bookings report");
  return res.json();
}

async function fetchRefundsReport(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${BASE}/api/admin/reports/refunds?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch refunds report");
  return res.json();
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DateFilter({ from, to, setFrom, setTo, onApply, onClear }: {
  from: string; to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 text-sm" />
      </div>
      <Button onClick={onApply} variant="outline" size="sm">Apply Filter</Button>
      <Button onClick={onClear} variant="ghost" size="sm">Clear</Button>
    </div>
  );
}

export default function SuperAdminReports() {
  const { toast } = useToast();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });

  const applyFilter = () => setApplied({ from, to });
  const clearFilter = () => { setFrom(""); setTo(""); setApplied({ from: "", to: "" }); };

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ["sa-revenue-report", applied.from, applied.to],
    queryFn: () => fetchRevenue(applied.from, applied.to),
  });

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["sa-user-report"],
    queryFn: fetchUserReport,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["sa-bookings-report", applied.from, applied.to],
    queryFn: () => fetchBookingsReport(applied.from, applied.to),
  });

  const { data: refundsData, isLoading: refundsLoading } = useQuery({
    queryKey: ["sa-refunds-report", applied.from, applied.to],
    queryFn: () => fetchRefundsReport(applied.from, applied.to),
  });

  const handleExport = (type: string) => {
    const params = new URLSearchParams();
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    window.open(`${BASE}/api/admin/reports/export/${type}?${params.toString()}`, "_blank");
  };

  const summary = revenueData?.summary;
  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    hotel_owner: "Hotel Owner",
    restaurant_owner: "Restaurant Owner",
    spa_owner: "Spa Owner",
    customer: "Customer",
  };
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-orange-100 text-orange-700",
    rejected: "bg-red-100 text-red-700",
    banned: "bg-red-200 text-red-800",
    confirmed: "bg-blue-100 text-blue-700",
    cancelled: "bg-gray-100 text-gray-600",
    approved: "bg-green-100 text-green-700",
    requested: "bg-yellow-100 text-yellow-700",
    processed: "bg-blue-100 text-blue-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" />Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Export reports and view platform-wide statistics</p>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList className="grid grid-cols-4 mb-6 w-fit">
            <TabsTrigger value="revenue" className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4" />Revenue</TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" />Bookings</TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-1.5"><RotateCcw className="h-4 w-4" />Refunds</TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5"><Users className="h-4 w-4" />Users</TabsTrigger>
          </TabsList>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-end gap-4">
                  <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={applyFilter} onClear={clearFilter} />
                  <div className="ml-auto">
                    <Button onClick={() => handleExport("revenue")} className="bg-primary flex items-center gap-2">
                      <Download className="h-4 w-4" />Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {revLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard label="Total Revenue" value={formatINR(summary?.totalRevenue ?? 0)} icon={TrendingUp} color="bg-blue-100 text-blue-600" />
                  <SummaryCard label="Platform Commission" value={formatINR(summary?.totalCommission ?? 0)} icon={IndianRupee} color="bg-green-100 text-green-600" />
                  <SummaryCard label="Owner Earnings" value={formatINR(summary?.totalOwnerEarnings ?? 0)} icon={IndianRupee} color="bg-purple-100 text-purple-600" />
                  <SummaryCard label="Total Bookings" value={String(summary?.totalBookings ?? 0)} icon={BarChart2} color="bg-amber-100 text-amber-600" />
                </div>

                {revenueData?.byType?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by Booking Type</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                            <TableHead className="text-right">Bookings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueData.byType.map((r: any) => (
                            <TableRow key={r.bookingType}>
                              <TableCell className="capitalize font-medium">{r.bookingType}</TableCell>
                              <TableCell className="text-right">{formatINR(r.revenue)}</TableCell>
                              <TableCell className="text-right">{formatINR(r.commission)}</TableCell>
                              <TableCell className="text-right">{r.bookings}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {revenueData?.monthly?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Breakdown</CardTitle></CardHeader>
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
                          {revenueData.monthly.slice().reverse().map((m: any) => (
                            <TableRow key={m.month}>
                              <TableCell className="font-medium">{m.month}</TableCell>
                              <TableCell className="text-right">{formatINR(m.revenue)}</TableCell>
                              <TableCell className="text-right">{formatINR(m.commission)}</TableCell>
                              <TableCell className="text-right">{formatINR(m.ownerEarnings)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-end gap-4">
                  <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={applyFilter} onClear={clearFilter} />
                  <div className="ml-auto">
                    <Button onClick={() => handleExport("bookings")} className="bg-primary flex items-center gap-2">
                      <Download className="h-4 w-4" />Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {bookingsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard label="Total Payments" value={String(bookingsData?.total ?? 0)} icon={BookOpen} color="bg-blue-100 text-blue-600" />
                  {(bookingsData?.byType ?? []).map((t: any) => (
                    <SummaryCard key={t.bookingType} label={`${t.bookingType} Bookings`} value={String(t.count)} icon={BarChart2} color="bg-amber-100 text-amber-600" />
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Payments by Type</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(bookingsData?.byType ?? []).map((r: any) => (
                            <TableRow key={r.bookingType}>
                              <TableCell className="capitalize font-medium">{r.bookingType}</TableCell>
                              <TableCell className="text-right">{r.count}</TableCell>
                              <TableCell className="text-right">{formatINR(parseFloat(r.totalAmount ?? "0"))}</TableCell>
                            </TableRow>
                          ))}
                          {!bookingsData?.byType?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Payments by Status</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(bookingsData?.byStatus ?? []).map((s: any) => (
                            <TableRow key={s.status}>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[s.status] ?? "bg-gray-100 text-gray-700"}`}>{s.status}</span></TableCell>
                              <TableCell className="text-right font-bold">{s.count}</TableCell>
                            </TableRow>
                          ))}
                          {!bookingsData?.byStatus?.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {bookingsData?.recentHotelBookings?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Recent Hotel Bookings</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Hotel</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookingsData.recentHotelBookings.map((b: any) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono text-xs">{b.bookingRef}</TableCell>
                              <TableCell className="font-medium">{b.hotelName ?? "—"}</TableCell>
                              <TableCell>{b.customerName ?? "—"}</TableCell>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[b.status] ?? "bg-gray-100 text-gray-700"}`}>{b.status}</span></TableCell>
                              <TableCell className="text-right">{formatINR(parseFloat(b.finalAmount ?? "0"))}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("en-IN")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-end gap-4">
                  <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={applyFilter} onClear={clearFilter} />
                  <div className="ml-auto">
                    <Button onClick={() => handleExport("refunds")} className="bg-primary flex items-center gap-2">
                      <Download className="h-4 w-4" />Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {refundsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard label="Total Refunds" value={String(refundsData?.totalRefunds ?? 0)} icon={RotateCcw} color="bg-red-100 text-red-600" />
                  <SummaryCard label="Cancellations" value={String(refundsData?.totalCancellations ?? 0)} icon={BarChart2} color="bg-orange-100 text-orange-600" />
                </div>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Refunds by Status</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Total (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(refundsData?.byStatus ?? []).map((s: any) => (
                          <TableRow key={s.status}>
                            <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[s.status] ?? "bg-gray-100 text-gray-700"}`}>{s.status}</span></TableCell>
                            <TableCell className="text-right">{s.count}</TableCell>
                            <TableCell className="text-right">{formatINR(parseFloat(s.totalAmount ?? "0"))}</TableCell>
                          </TableRow>
                        ))}
                        {!refundsData?.byStatus?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No refunds found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {refundsData?.recentRefunds?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Recent Refunds</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {refundsData.recentRefunds.map((r: any) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">{r.refundRef}</TableCell>
                              <TableCell>{formatINR(parseFloat(r.refundAmount ?? "0"))}</TableCell>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[r.status] ?? "bg-gray-100 text-gray-700"}`}>{r.status}</span></TableCell>
                              <TableCell className="max-w-[160px] truncate text-sm">{r.reason ?? "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {refundsData?.recentCancellations?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Recent Cancellations</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {refundsData.recentCancellations.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.cancelRef}</TableCell>
                              <TableCell className="capitalize">{c.bookingType}</TableCell>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[c.status] ?? "bg-gray-100 text-gray-700"}`}>{c.status}</span></TableCell>
                              <TableCell className="max-w-[160px] truncate text-sm">{c.reason ?? "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-IN")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => handleExport("users")} className="bg-primary flex items-center gap-2">
                <Download className="h-4 w-4" />Export Users CSV
              </Button>
            </div>

            {userLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Users by Role</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(userData?.byRole ?? []).map((r: any) => (
                          <TableRow key={r.role}>
                            <TableCell className="font-medium">{roleLabels[r.role] ?? r.role}</TableCell>
                            <TableCell className="text-right font-bold">{r.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" />Users by Status</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(userData?.byStatus ?? []).map((s: any) => (
                          <TableRow key={s.status}>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[s.status] ?? "bg-gray-100 text-gray-700"}`}>{s.status}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold">{s.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
