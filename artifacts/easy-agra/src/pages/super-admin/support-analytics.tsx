import { AdminLayout as SuperAdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetSupportAnalytics, useListSupportTickets, useReopenTicket, useDeleteSupportTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, BarChart2, RefreshCw, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS: Record<string, string> = {
  hotel_issue: "Hotel Issue", booking_issue: "Booking Issue", payment_issue: "Payment Issue",
  refund_issue: "Refund Issue", restaurant_issue: "Restaurant Issue", spa_issue: "Spa Issue",
  technical_issue: "Technical Issue", other: "Other",
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700",
    waiting_for_customer: "bg-purple-100 text-purple-700", resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-gray-100 text-gray-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    open: "Open", in_progress: "In Progress", waiting_for_customer: "Waiting",
    resolved: "Resolved", closed: "Closed",
  };
  return map[s] ?? s;
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-600", medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
  };
  return map[p] ?? "bg-gray-100 text-gray-600";
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SuperAdminSupportAnalytics() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: analytics, refetch: refetchAnalytics } = useGetSupportAnalytics();
  const { data: ticketsData, refetch: refetchTickets } = useListSupportTickets(
    { ...(statusFilter !== "all" ? { status: statusFilter } : {}), limit: 100 },
  );

  const reopenTicket = useReopenTicket({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ticket reopened" });
        qc.invalidateQueries({ queryKey: ["/support/tickets"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to reopen", description: err?.response?.data?.error, variant: "destructive" });
      },
    },
  });

  const deleteTicket = useDeleteSupportTicket({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ticket deleted" });
        qc.invalidateQueries({ queryKey: ["/support/tickets"] });
        setDeleteConfirm(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete", description: err?.response?.data?.error, variant: "destructive" });
        setDeleteConfirm(null);
      },
    },
  });

  const tickets = ticketsData?.tickets ?? [];
  const totalTickets = analytics?.total ?? 0;
  const resolvedPct = totalTickets > 0
    ? Math.round(((analytics?.resolved ?? 0) + (analytics?.closed ?? 0)) / totalTickets * 100)
    : 0;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" /> Support Analytics
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Full overview and management of all support tickets</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchAnalytics(); refetchTickets(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: analytics?.total ?? 0, color: "text-foreground" },
            { label: "Open", value: analytics?.open ?? 0, color: "text-blue-600" },
            { label: "In Progress", value: analytics?.inProgress ?? 0, color: "text-amber-600" },
            { label: "Waiting", value: analytics?.waitingForCustomer ?? 0, color: "text-purple-600" },
            { label: "Resolved", value: analytics?.resolved ?? 0, color: "text-emerald-600" },
            { label: "Closed", value: analytics?.closed ?? 0, color: "text-gray-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resolution rate */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">Resolution Rate</p>
              <p className="text-4xl font-bold text-emerald-700 mt-1">{resolvedPct}%</p>
              <p className="text-xs text-emerald-600 mt-1">
                {(analytics?.resolved ?? 0) + (analytics?.closed ?? 0)} of {totalTickets} tickets resolved or closed
              </p>
            </div>
            <div className="w-20 h-20 rounded-full border-8 border-emerald-200 flex items-center justify-center bg-white">
              <span className="text-emerald-700 font-bold text-lg">{resolvedPct}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4" /> By Category</CardTitle></CardHeader>
            <CardContent>
              {(analytics?.byCategory ?? []).map((c) => {
                const pct = totalTickets > 0 ? Math.round(c.count / totalTickets * 100) : 0;
                return (
                  <div key={c.category} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      <span className="font-semibold">{c.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
            <CardContent>
              {(analytics?.byPriority ?? []).map((p) => {
                const pct = totalTickets > 0 ? Math.round(p.count / totalTickets * 100) : 0;
                return (
                  <div key={p.priority} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${priorityBadge(p.priority)} text-xs px-1.5 py-0`}>{p.priority}</Badge>
                      </div>
                      <span className="font-semibold">{p.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* All tickets table */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">All Tickets (Super Admin View)</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all", "open", "in_progress", "waiting_for_customer", "resolved", "closed"].map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All Status" : statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Ref</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Subject</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Priority</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Category</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Created</th>
                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No tickets found</td></tr>
                  ) : (
                    tickets.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-xs text-primary">{t.ticketRef}</td>
                        <td className="p-3 text-xs">{t.userFullName ?? "Unknown"}</td>
                        <td className="p-3 text-xs max-w-[200px] truncate">{t.subject}</td>
                        <td className="p-3"><Badge className={`text-xs ${statusBadge(t.status)}`}>{statusLabel(t.status)}</Badge></td>
                        <td className="p-3"><Badge className={`text-xs ${priorityBadge(t.priority)}`}>{t.priority}</Badge></td>
                        <td className="p-3 text-xs">{CATEGORY_LABELS[t.category] ?? t.category}</td>
                        <td className="p-3 text-xs text-muted-foreground">{fmtDate(t.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {(t.status === "closed" || t.status === "resolved") && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => reopenTicket.mutate({ ref: t.ticketRef })}
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                                title="Reopen ticket"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {deleteConfirm === t.ticketRef ? (
                              <div className="flex gap-1 items-center">
                                <Button
                                  variant="destructive" size="sm"
                                  onClick={() => deleteTicket.mutate({ ref: t.ticketRef })}
                                  className="h-7 px-2 text-xs"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="h-7 px-2 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => setDeleteConfirm(t.ticketRef)}
                                className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                                title="Delete ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
