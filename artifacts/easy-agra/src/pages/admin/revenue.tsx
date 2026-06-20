import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetEarningsAnalytics,
  useGetEarningsAdmin,
  useGetPayoutsAdmin,
  usePatchPayoutsRef,
  useGetCommissionsConfig,
  usePutCommissionsConfig,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Users, Building2, Utensils, Sparkles, CheckCircle, Clock, Settings, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function payoutStatusColor(s: string) {
  if (s === "paid") return "bg-emerald-100 text-emerald-700";
  if (s === "approved") return "bg-blue-100 text-blue-700";
  if (s === "pending") return "bg-amber-100 text-amber-700";
  if (s === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

export default function AdminRevenue() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [tab, setTab] = useState<"overview" | "earnings" | "payouts" | "commission">("overview");
  const [commissionRates, setCommissionRates] = useState<Record<string, string>>({});

  const { data: analytics } = useGetEarningsAnalytics({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const { data: earningsData } = useGetEarningsAdmin({ page: 1, limit: 50 });
  const { data: payoutsData } = useGetPayoutsAdmin({
    ...(payoutStatusFilter && payoutStatusFilter !== "all" ? { status: payoutStatusFilter } : {}),
  });
  const { data: commissionConfigs } = useGetCommissionsConfig();

  const processPayout = usePatchPayoutsRef({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payout updated" });
        qc.invalidateQueries({ queryKey: ["/payouts/admin"] });
      },
      onError: () => toast({ title: "Failed to update payout", variant: "destructive" }),
    },
  });

  const updateCommission = usePutCommissionsConfig({
    mutation: {
      onSuccess: () => {
        toast({ title: "Commission rates updated" });
        qc.invalidateQueries({ queryKey: ["/commissions/config"] });
        setCommissionRates({});
      },
      onError: () => toast({ title: "Failed to update rates", variant: "destructive" }),
    },
  });

  const handlePayoutAction = (ref: string, action: "approve" | "reject" | "mark_paid") => {
    processPayout.mutate({ ref, data: { action } });
  };

  const handleSaveCommissions = () => {
    if (!commissionConfigs) return;
    const configs = commissionConfigs.map((c) => ({
      bookingType: c.bookingType,
      rate: commissionRates[c.bookingType] !== undefined ? parseFloat(commissionRates[c.bookingType]) : c.rate,
      isActive: c.isActive,
      description: c.description ?? null,
    }));
    updateCommission.mutate({ data: { configs } });
  };

  const typeIcons: Record<string, React.ReactNode> = {
    hotel: <Building2 className="w-4 h-4" />,
    restaurant: <Utensils className="w-4 h-4" />,
    spa: <Sparkles className="w-4 h-4" />,
  };
  const typeColors: Record<string, string> = {
    hotel: "bg-blue-100 text-blue-700",
    restaurant: "bg-orange-100 text-orange-700",
    spa: "bg-purple-100 text-purple-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary" />
              Revenue Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Platform earnings, commissions and payouts</p>
          </div>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 text-sm" placeholder="From" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36 text-sm" placeholder="To" />
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Platform Revenue", value: analytics?.totalPlatformRevenue ?? 0, icon: IndianRupee, color: "text-primary", bg: "bg-primary/10" },
            { label: "Commission Earned", value: analytics?.totalCommissionEarned ?? 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
            { label: "Owner Payouts Paid", value: analytics?.totalOwnerPayouts ?? 0, icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100" },
            { label: "Pending to Pay Out", value: analytics?.pendingPayouts ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
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

        {/* Tab Nav */}
        <div className="flex gap-1 border-b">
          {(["overview", "earnings", "payouts", "commission"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "commission" ? "Commission Config" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* By Type Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(analytics?.earningsByType ?? []).map((bt) => (
                <Card key={bt.bookingType}>
                  <CardContent className="p-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-3 ${typeColors[bt.bookingType] ?? "bg-gray-100 text-gray-700"}`}>
                      {typeIcons[bt.bookingType]} <span className="capitalize">{bt.bookingType}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Revenue</span><span className="font-medium">{fmtCurrency(bt.gross)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Commission</span><span className="text-emerald-600 font-medium">{fmtCurrency(bt.commission)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Owner Earnings</span><span className="font-medium">{fmtCurrency(bt.net)}</span></div>
                      <div className="flex justify-between text-sm pt-1 border-t"><span className="text-muted-foreground">Bookings</span><span className="font-semibold">{bt.count}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Monthly Commission */}
            {(analytics?.monthlyCommission ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Monthly Commission Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...(analytics?.monthlyCommission ?? [])].reverse().slice(0, 6).map((m) => (
                      <div key={m.month} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm text-muted-foreground">{m.month}</span>
                        <div className="flex gap-6 text-sm">
                          <span>{fmtCurrency(m.gross)} <span className="text-muted-foreground">gross</span></span>
                          <span className="text-emerald-600 font-semibold">{fmtCurrency(m.commission)} commission</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Owners */}
            {(analytics?.topOwners ?? []).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Top Earning Owners</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.topOwners ?? []).map((o, i) => (
                        <TableRow key={`${o.ownerId}-${o.bookingType}`}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{o.ownerName}</TableCell>
                          <TableCell><Badge className={typeColors[o.bookingType] ?? ""}>{o.bookingType}</Badge></TableCell>
                          <TableCell className="text-right font-semibold">{fmtCurrency(o.totalEarnings)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {tab === "earnings" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Owner Earnings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!earningsData?.earnings.length ? (
                <div className="p-8 text-center text-muted-foreground">No earnings data yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earningsData.earnings.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{fmtDate(e.createdAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{e.earningRef}</TableCell>
                          <TableCell>{e.ownerName ?? "—"}</TableCell>
                          <TableCell><Badge className={typeColors[e.bookingType] ?? ""}>{e.bookingType}</Badge></TableCell>
                          <TableCell className="text-right">{fmtCurrency(e.grossAmount)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{fmtCurrency(e.commissionAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtCurrency(e.netAmount)}</TableCell>
                          <TableCell>
                            <Badge className={e.status === "credited" ? "bg-emerald-100 text-emerald-700" : e.status === "withdrawn" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}>
                              {e.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payouts Tab */}
        {tab === "payouts" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0">
                {!payoutsData?.payouts.length ? (
                  <div className="p-8 text-center text-muted-foreground">No payout requests</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Ref</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutsData.payouts.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{fmtDate(p.createdAt)}</TableCell>
                            <TableCell className="font-mono text-xs">{p.payoutRef}</TableCell>
                            <TableCell>{(p as any).ownerName ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtCurrency(p.amount)}</TableCell>
                            <TableCell>
                              <Badge className={payoutStatusColor(p.status)}>{p.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {p.status === "pending" && (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 h-7 text-xs"
                                    onClick={() => handlePayoutAction(p.payoutRef, "approve")}>Approve</Button>
                                  <Button size="sm" variant="outline" className="text-red-500 border-red-300 h-7 text-xs"
                                    onClick={() => handlePayoutAction(p.payoutRef, "reject")}>Reject</Button>
                                </div>
                              )}
                              {p.status === "approved" && (
                                <Button size="sm" className="bg-primary text-white h-7 text-xs"
                                  onClick={() => handlePayoutAction(p.payoutRef, "mark_paid")}>Mark Paid</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Commission Config Tab */}
        {tab === "commission" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Commission Rates
              </CardTitle>
              <p className="text-sm text-muted-foreground">Configure the platform commission percentage per booking type</p>
            </CardHeader>
            <CardContent>
              {!commissionConfigs?.length ? (
                <div className="text-muted-foreground text-sm">Loading commission config…</div>
              ) : (
                <div className="space-y-4">
                  {commissionConfigs.map((c) => (
                    <div key={c.bookingType} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeColors[c.bookingType] ?? "bg-gray-100"}`}>
                          {typeIcons[c.bookingType]}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{c.bookingType}</p>
                          <p className="text-xs text-muted-foreground">{c.description ?? "Platform commission"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            className="w-20 text-right"
                            defaultValue={c.rate}
                            value={commissionRates[c.bookingType] ?? String(c.rate)}
                            onChange={(e) => setCommissionRates({ ...commissionRates, [c.bookingType]: e.target.value })}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <Badge className={c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveCommissions} disabled={updateCommission.isPending} className="bg-primary text-white">
                      {updateCommission.isPending ? "Saving…" : "Save Commission Rates"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
