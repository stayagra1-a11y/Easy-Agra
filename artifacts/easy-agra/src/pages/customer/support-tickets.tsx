import { useState } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useListSupportTickets, useCreateSupportTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, Clock, CheckCircle, AlertCircle, XCircle, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "hotel_issue", label: "Hotel Issue" },
  { value: "booking_issue", label: "Booking Issue" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "refund_issue", label: "Refund Issue" },
  { value: "restaurant_issue", label: "Restaurant Issue" },
  { value: "spa_issue", label: "Spa Issue" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    waiting_for_customer: "bg-purple-100 text-purple-700",
    resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-gray-100 text-gray-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    waiting_for_customer: "Waiting For You",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[s] ?? s;
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return map[p] ?? "bg-gray-100 text-gray-600";
}

function statusIcon(s: string) {
  if (s === "open") return <Clock className="w-4 h-4 text-blue-500" />;
  if (s === "in_progress") return <AlertCircle className="w-4 h-4 text-amber-500" />;
  if (s === "resolved") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (s === "closed") return <XCircle className="w-4 h-4 text-gray-400" />;
  return <Clock className="w-4 h-4 text-purple-500" />;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function catLabel(c: string) {
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export default function CustomerSupportTickets() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: "",
  });

  const { data, isLoading } = useListSupportTickets(
    statusFilter !== "all" ? { status: statusFilter } : {},
  );

  const createTicket = useCreateSupportTicket({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ticket created", description: "We'll get back to you soon." });
        qc.invalidateQueries({ queryKey: ["/support/tickets"] });
        setOpen(false);
        setForm({ subject: "", category: "", priority: "medium", description: "" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create ticket", description: err?.response?.data?.error ?? "Please try again.", variant: "destructive" });
      },
    },
  });

  const tickets = data?.tickets ?? [];
  const counts = { open: 0, in_progress: 0, resolved: 0 };
  tickets.forEach((t) => {
    if (t.status === "open") counts.open++;
    else if (t.status === "in_progress") counts.in_progress++;
    else if (t.status === "resolved") counts.resolved++;
  });

  const handleSubmit = () => {
    if (!form.subject.trim() || !form.category || !form.description.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createTicket.mutate({ data: form as any });
  };

  return (
    <CustomerLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" /> My Support Tickets
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Get help from the Easy Agra support team</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" /> New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-primary" /> Create Support Ticket
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Subject <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Briefly describe your issue"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category <span className="text-red-500">*</span></Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    className="mt-1 resize-none"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={createTicket.isPending}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  {createTicket.isPending ? "Submitting…" : "Submit Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Open", count: tickets.filter((t) => t.status === "open").length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "In Progress", count: tickets.filter((t) => t.status === "in_progress").length, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Resolved", count: tickets.filter((t) => t.status === "resolved").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((s) => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "open", "in_progress", "waiting_for_customer", "resolved", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : statusLabel(s)}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <LifeBuoy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a support ticket if you need help</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link key={t.id} href={`/support/tickets/${t.ticketRef}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 shrink-0">{statusIcon(t.status)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{t.subject}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs px-2 py-0 ${statusBadge(t.status)}`}>
                              {statusLabel(t.status)}
                            </Badge>
                            <Badge className={`text-xs px-2 py-0 ${priorityBadge(t.priority)}`}>
                              {t.priority}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{catLabel(t.category)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {t.ticketRef} · {fmtDate(t.createdAt)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
