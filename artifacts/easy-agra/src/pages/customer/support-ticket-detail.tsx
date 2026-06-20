import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useGetSupportTicket, useAddTicketMessage, useCloseTicket } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Send, ArrowLeft, XCircle, Clock, CheckCircle, AlertCircle, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES: Record<string, string> = {
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
    open: "Open", in_progress: "In Progress", waiting_for_customer: "Waiting For You",
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

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props { params: { ref: string } }

export default function SupportTicketDetail({ params }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [closeConfirm, setCloseConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useGetSupportTicket(params.ref);

  const addMessage = useAddTicketMessage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [`/support/tickets/${params.ref}`] });
        setMessage("");
      },
      onError: (err: any) => {
        toast({ title: "Failed to send", description: err?.response?.data?.error ?? "Please try again.", variant: "destructive" });
      },
    },
  });

  const closeTicket = useCloseTicket({
    mutation: {
      onSuccess: () => {
        toast({ title: "Ticket closed" });
        qc.invalidateQueries({ queryKey: [`/support/tickets/${params.ref}`] });
        qc.invalidateQueries({ queryKey: ["/support/tickets"] });
        setCloseConfirm(false);
      },
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    addMessage.mutate({ ref: params.ref, data: { message: message.trim() } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-32 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </CustomerLayout>
    );
  }

  if (!ticket) {
    return (
      <CustomerLayout>
        <div className="py-16 text-center">
          <LifeBuoy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Ticket not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/support/tickets")}>Back to Tickets</Button>
        </div>
      </CustomerLayout>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";
  const messages = ticket.messages ?? [];

  return (
    <CustomerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/support/tickets")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base truncate">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground">{ticket.ticketRef}</p>
          </div>
        </div>

        {/* Ticket info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className={statusBadge(ticket.status)}>{statusLabel(ticket.status)}</Badge>
              <Badge className={priorityBadge(ticket.priority)}>{ticket.priority} priority</Badge>
              <Badge variant="outline" className="text-xs">{CATEGORIES[ticket.category] ?? ticket.category}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span>Created {fmtDateTime(ticket.createdAt)}</span>
              {ticket.resolvedAt && <span className="ml-3 text-emerald-600">Resolved {fmtDateTime(ticket.resolvedAt)}</span>}
              {ticket.closedAt && <span className="ml-3 text-gray-500">Closed {fmtDateTime(ticket.closedAt)}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card>
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[300px] max-h-[50vh] overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const isAdmin = msg.senderRole === "admin" || msg.senderRole === "super_admin";
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className={`text-xs font-medium ${isAdmin ? "text-primary" : "text-foreground"}`}>
                            {isMe ? "You" : msg.senderName}
                          </span>
                          {isAdmin && <Badge className="text-xs px-1 py-0 bg-primary/10 text-primary">Support</Badge>}
                        </div>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                          isMe
                            ? "bg-primary text-white rounded-tr-sm"
                            : "bg-gray-100 text-foreground rounded-tl-sm"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          {msg.attachmentUrl && (
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 mt-2 text-xs underline opacity-80">
                              <Paperclip className="w-3 h-3" /> Attachment
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">{fmtDateTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            {!isClosed ? (
              <div className="border-t p-4">
                <Textarea
                  placeholder="Type your message… (Ctrl+Enter to send)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between mt-3">
                  {!closeConfirm ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setCloseConfirm(true)} className="text-gray-500 text-xs">
                        <XCircle className="w-4 h-4 mr-1" /> Close Ticket
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={!message.trim() || addMessage.isPending}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        {addMessage.isPending ? "Sending…" : "Send"}
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <p className="text-sm text-muted-foreground flex-1">Close this ticket?</p>
                      <Button variant="outline" size="sm" onClick={() => setCloseConfirm(false)}>Cancel</Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => closeTicket.mutate({ ref: params.ref })}
                        disabled={closeTicket.isPending}
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`border-t p-4 text-center text-sm ${isClosed ? "text-gray-500" : "text-emerald-600"}`}>
                <div className="flex items-center justify-center gap-2">
                  {ticket.status === "resolved" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4" />}
                  This ticket is {ticket.status}. You cannot reply to a {ticket.status} ticket.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
