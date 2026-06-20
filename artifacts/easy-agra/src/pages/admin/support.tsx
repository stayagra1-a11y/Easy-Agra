import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useListSupportTickets, useGetSupportTicket, useAddTicketMessage,
  useUpdateTicketStatus, useAssignTicket, useGetSupportAnalytics,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Search, MessageSquare, RefreshCw, CheckCircle, Clock, AlertCircle, BarChart2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const STATUS_OPTIONS = ["all", "open", "in_progress", "waiting_for_customer", "resolved", "closed"];
const PRIORITY_OPTIONS = ["all", "low", "medium", "high", "urgent"];
const CATEGORY_LABELS: Record<string, string> = {
  hotel_issue: "Hotel", booking_issue: "Booking", payment_issue: "Payment",
  refund_issue: "Refund", restaurant_issue: "Restaurant", spa_issue: "Spa",
  technical_issue: "Technical", other: "Other",
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
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSupport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tickets" | "analytics">("tickets");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading, refetch } = useListSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
    ...(search ? { search } : {}),
    limit: 50,
  });

  const { data: ticketDetail } = useGetSupportTicket(selectedRef ?? "", { query: { enabled: !!selectedRef } as any });
  const { data: analytics } = useGetSupportAnalytics({ query: { enabled: tab === "analytics" } as any });

  const addReply = useAddTicketMessage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [`/support/tickets/${selectedRef}`] });
        setReplyText("");
        toast({ title: "Reply sent" });
      },
    },
  });

  const updateStatus = useUpdateTicketStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/support/tickets"] });
        if (selectedRef) qc.invalidateQueries({ queryKey: [`/support/tickets/${selectedRef}`] });
        toast({ title: "Status updated" });
        setNewStatus("");
      },
    },
  });

  const tickets = data?.tickets ?? [];

  const handleReply = () => {
    if (!selectedRef || !replyText.trim()) return;
    addReply.mutate({ ref: selectedRef, data: { message: replyText.trim(), isInternal: false } });
  };

  const handleStatusChange = (status: string) => {
    if (!selectedRef) return;
    updateStatus.mutate({ ref: selectedRef, data: { status } });
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" /> Support Tickets
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage customer support requests</p>
          </div>
          <div className="flex gap-2">
            <Button variant={tab === "tickets" ? "default" : "outline"} size="sm" onClick={() => setTab("tickets")}>
              <MessageSquare className="w-4 h-4 mr-1" /> Tickets
            </Button>
            <Button variant={tab === "analytics" ? "default" : "outline"} size="sm" onClick={() => setTab("analytics")}>
              <BarChart2 className="w-4 h-4 mr-1" /> Analytics
            </Button>
          </div>
        </div>

        {tab === "analytics" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total", value: analytics?.total ?? 0, color: "text-foreground" },
                { label: "Open", value: analytics?.open ?? 0, color: "text-blue-600" },
                { label: "In Progress", value: analytics?.inProgress ?? 0, color: "text-amber-600" },
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
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">By Category</CardTitle></CardHeader>
                <CardContent>
                  {(analytics?.byCategory ?? []).map((c) => (
                    <div key={c.category} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      <Badge variant="outline">{c.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
                <CardContent>
                  {(analytics?.byPriority ?? []).map((p) => (
                    <div key={p.priority} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityBadge(p.priority)}>{p.priority}</Badge>
                      </div>
                      <span className="text-sm font-semibold">{p.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-4">
            {/* Ticket list panel */}
            <div className="md:col-span-2 space-y-3">
              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All Status" : statusLabel(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p === "all" ? "All Priority" : p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Ticket cards */}
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {isLoading ? (
                  [1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)
                ) : tickets.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No tickets found</div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedRef(t.ticketRef)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRef === t.ticketRef ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{t.subject}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.userFullName ?? "Unknown"}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            <Badge className={`text-xs px-1.5 py-0 ${statusBadge(t.status)}`}>{statusLabel(t.status)}</Badge>
                            <Badge className={`text-xs px-1.5 py-0 ${priorityBadge(t.priority)}`}>{t.priority}</Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{fmtDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ticket detail panel */}
            <div className="md:col-span-3">
              {!selectedRef ? (
                <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl border-border">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select a ticket to view details</p>
                  </div>
                </div>
              ) : ticketDetail ? (
                <Card className="h-full">
                  <CardHeader className="pb-3 border-b">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{ticketDetail.subject}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ticketDetail.ticketRef} · {ticketDetail.userFullName ?? "Unknown"} · {fmtDate(ticketDetail.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={statusBadge(ticketDetail.status)}>{statusLabel(ticketDetail.status)}</Badge>
                        <Badge className={priorityBadge(ticketDetail.priority)}>{ticketDetail.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[ticketDetail.category] ?? ticketDetail.category}</Badge>
                      </div>
                      {/* Status changer */}
                      <div className="flex gap-2 items-center">
                        <Select value={newStatus || ticketDetail.status} onValueChange={(v) => handleStatusChange(v)}>
                          <SelectTrigger className="h-8 text-xs w-48">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            {["open", "in_progress", "waiting_for_customer", "resolved", "closed"].map((s) => (
                              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 min-h-[280px] max-h-[40vh] overflow-y-auto p-4 space-y-4">
                      {(ticketDetail.messages ?? []).map((msg) => {
                        const isAdmin = msg.senderRole === "admin" || msg.senderRole === "super_admin";
                        return (
                          <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
                              <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "flex-row-reverse" : ""}`}>
                                <span className="text-xs font-medium">{msg.senderName}</span>
                                {isAdmin && <Badge className="text-xs px-1 py-0 bg-primary/10 text-primary">Support</Badge>}
                              </div>
                              <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                                isAdmin
                                  ? "bg-primary text-white rounded-tr-sm"
                                  : "bg-gray-100 text-foreground rounded-tl-sm"
                              }`}>
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1">{fmtDateTime(msg.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Reply box */}
                    {ticketDetail.status !== "closed" && (
                      <div className="border-t p-4">
                        <Textarea
                          placeholder="Type admin reply…"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={handleReply}
                          disabled={!replyText.trim() || addReply.isPending}
                          className="mt-2 bg-primary text-white hover:bg-primary/90 w-full"
                        >
                          {addReply.isPending ? "Sending…" : "Send Reply"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground text-sm">Loading ticket…</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
