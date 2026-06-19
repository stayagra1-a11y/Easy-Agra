import { useState } from "react";
import { useListOwnerRequests, useApproveOwnerRequest, useRejectOwnerRequest, getListOwnerRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileCheck, Loader2, CheckCircle2, XCircle, Building2, UtensilsCrossed, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const roleIcons: Record<string, any> = {
  hotel_owner: <Building2 className="h-4 w-4" />,
  restaurant_owner: <UtensilsCrossed className="h-4 w-4" />,
  spa_owner: <Sparkles className="h-4 w-4" />,
};

export default function AdminOwnerRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useListOwnerRequests({ status: statusFilter !== "all" ? statusFilter : undefined });
  const approveMutation = useApproveOwnerRequest();
  const rejectMutation = useRejectOwnerRequest();

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListOwnerRequestsQueryKey() });
      toast({ title: "Request approved!" });
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectDialog.id, data: { reason: rejectReason } });
      queryClient.invalidateQueries({ queryKey: getListOwnerRequestsQueryKey() });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Request rejected" });
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Owner Requests</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data?.requests?.length ? (
          <div className="flex flex-col items-center py-16">
            <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No owner requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {roleIcons[r.requestedRole]}
                        <p className="font-semibold text-sm">{r.user?.fullName}</p>
                        <Badge className={`text-xs ${statusColors[r.status]}`} variant="secondary">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{r.requestedRole.replace(/_/g, " ")}</p>
                      {r.businessName && <p className="text-sm font-medium mt-1.5">{r.businessName}</p>}
                      {r.businessDescription && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.businessDescription}</p>}
                      <p className="text-xs text-muted-foreground/60 mt-2">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => handleApprove(r.id)} disabled={approveMutation.isPending}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setRejectDialog({ id: r.id, name: r.user?.fullName || "" })}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={o => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Provide a reason for rejecting <strong>{rejectDialog?.name}</strong>'s request:</p>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Incomplete information, invalid business details..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
