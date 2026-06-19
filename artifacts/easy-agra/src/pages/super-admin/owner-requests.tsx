import { useState } from "react";
import {
  useListOwnerRequests,
  useGetOwnerRequest,
  useApproveOwnerRequest,
  useRejectOwnerRequest,
  useRestoreOwnerRequest,
  getListOwnerRequestsQueryKey,
  getGetOwnerRequestQueryKey,
} from "@workspace/api-client-react";
import type { OwnerRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileCheck, Loader2, CheckCircle2, XCircle, Building2, UtensilsCrossed,
  Sparkles, Clock, MapPin, Phone, Mail, FileText, Camera, ChevronRight,
  User, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const roleConfig: Record<string, { icon: any; label: string; color: string }> = {
  hotel_owner: { icon: Building2, label: "Hotel Owner", color: "text-blue-600 bg-blue-50" },
  restaurant_owner: { icon: UtensilsCrossed, label: "Restaurant Owner", color: "text-orange-600 bg-orange-50" },
  spa_owner: { icon: Sparkles, label: "Spa Owner", color: "text-purple-600 bg-purple-50" },
};

function DetailField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm mt-0.5 ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function RequestDetail({ id, onApprove, onReject, onRestore }: {
  id: number;
  onApprove: (r: OwnerRequest) => void;
  onReject: (r: OwnerRequest) => void;
  onRestore: (r: OwnerRequest) => void;
}) {
  const { data: request, isLoading } = useGetOwnerRequest(id, {
    query: { queryKey: getGetOwnerRequestQueryKey(id) },
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!request) return null;

  const role = roleConfig[request.requestedRole];
  const photos = request.businessPhotos as string[] | null;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={statusColors[request.status]} variant="secondary">{request.status}</Badge>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${role.color}`}>
          <role.icon className="h-3.5 w-3.5" />{role.label}
        </div>
        <Badge variant="outline" className="text-xs ml-auto">Super Admin View</Badge>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business</h3>
        <DetailField label="Business Name" value={request.businessName} />
        {(request.businessAddress || request.city) && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Address</p>
            <p className="text-sm font-medium mt-0.5">{[request.businessAddress, request.city, request.state].filter(Boolean).join(", ")}</p>
          </div>
        )}
        <DetailField label="Description" value={request.businessDescription} />
        <DetailField label="GST Number" value={request.gstNumber} mono />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Owner Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          {request.user?.fullName && <DetailField label="Account Name" value={request.user.fullName} />}
          {request.ownerName && <DetailField label="Owner Name" value={request.ownerName} />}
          {request.user?.email && <DetailField label="Account Email" value={request.user.email} />}
          {request.ownerEmail && <DetailField label="Contact Email" value={request.ownerEmail} />}
          {request.ownerMobile && <DetailField label="Mobile" value={request.ownerMobile} />}
        </div>
      </div>

      {photos && photos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg border" />)}
          </div>
        </div>
      )}

      {request.identityProof && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileText className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700 font-medium">Identity proof uploaded</p>
        </div>
      )}

      {request.rejectionReason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{request.rejectionReason}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
        <p>Submitted: {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        {request.approvedAt && <p>Reviewed: {new Date(request.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
        <p className="text-primary/70 font-medium mt-2">Super Admin Controls</p>
      </div>

      {/* Super Admin action buttons */}
      <div className="space-y-2">
        {request.status === "pending" && (
          <div className="flex gap-2">
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onApprove(request)}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
            <Button className="flex-1" variant="destructive" onClick={() => onReject(request)}>
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
          </div>
        )}
        {request.status === "approved" && (
          <Button className="w-full" variant="destructive" onClick={() => onReject(request)}>
            <XCircle className="h-4 w-4 mr-2" /> Override: Reject This Request
          </Button>
        )}
        {request.status === "rejected" && (
          <Button className="w-full bg-primary" onClick={() => onRestore(request)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Restore to Pending
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminOwnerRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<OwnerRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OwnerRequest | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<OwnerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useListOwnerRequests({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 100 });
  const approveMutation = useApproveOwnerRequest();
  const rejectMutation = useRejectOwnerRequest();
  const restoreMutation = useRestoreOwnerRequest();

  const invalidate = (id?: number) => {
    queryClient.invalidateQueries({ queryKey: getListOwnerRequestsQueryKey() });
    if (id) queryClient.invalidateQueries({ queryKey: getGetOwnerRequestQueryKey(id) });
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approveMutation.mutateAsync({ id: approveTarget.id });
      invalidate(approveTarget.id);
      setApproveTarget(null);
      setSelectedId(null);
      toast({ title: "Approved!", description: `Role upgraded to ${approveTarget.requestedRole.replace(/_/g, " ")}` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectTarget.id, data: { reason: rejectReason } });
      invalidate(rejectTarget.id);
      setRejectTarget(null);
      setRejectReason("");
      setSelectedId(null);
      toast({ title: "Request rejected" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restoreMutation.mutateAsync({ id: restoreTarget.id });
      invalidate(restoreTarget.id);
      setRestoreTarget(null);
      setSelectedId(null);
      toast({ title: "Request restored to pending", description: "The applicant has been notified." });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const pendingCount = data?.requests?.filter(r => r.status === "pending").length ?? 0;
  const approvedCount = data?.requests?.filter(r => r.status === "approved").length ?? 0;
  const rejectedCount = data?.requests?.filter(r => r.status === "rejected").length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-4">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Super Admin</p>
          <h1 className="text-xl font-bold mt-0.5">Owner Request Management</h1>
          <p className="text-white/60 text-sm mt-1">Full control — approve, reject, override, and restore</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", count: pendingCount, icon: Clock, color: "text-yellow-600 bg-yellow-50", filter: "pending" },
            { label: "Approved", count: approvedCount, icon: CheckCircle2, color: "text-green-600 bg-green-50", filter: "approved" },
            { label: "Rejected", count: rejectedCount, icon: XCircle, color: "text-red-600 bg-red-50", filter: "rejected" },
          ].map(({ label, count, icon: Icon, color, filter }) => (
            <Card key={label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === filter ? "all" : filter)}>
              <CardContent className="p-3 text-center">
                <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-1.5`}><Icon className="h-4 w-4" /></div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
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
            <p className="text-muted-foreground">No owner requests found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.requests.map((r) => {
              const role = roleConfig[r.requestedRole];
              return (
                <Card key={r.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedId(r.id)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${role.color} flex items-center justify-center shrink-0`}>
                      <role.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.user?.fullName || "Unknown"}</p>
                        <Badge className={`text-xs ${statusColors[r.status]}`} variant="secondary">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.user?.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{role.label}</p>
                        {r.businessName && <><span className="text-muted-foreground/40">·</span><p className="text-xs font-medium truncate">{r.businessName}</p></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <button className="h-7 w-7 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                            onClick={e => { e.stopPropagation(); setApproveTarget(r); }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button className="h-7 w-7 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center"
                            onClick={e => { e.stopPropagation(); setRejectTarget(r); }}>
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      {r.status === "rejected" && (
                        <button className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center"
                          title="Restore to pending"
                          onClick={e => { e.stopPropagation(); setRestoreTarget(r); }}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={selectedId !== null} onOpenChange={o => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle>Application Detail</SheetTitle></SheetHeader>
          {selectedId !== null && (
            <RequestDetail
              id={selectedId}
              onApprove={r => setApproveTarget(r)}
              onReject={r => setRejectTarget(r)}
              onRestore={r => setRestoreTarget(r)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Approve confirm */}
      <Dialog open={!!approveTarget} onOpenChange={o => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Application?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Approve <strong>{approveTarget?.user?.fullName}</strong>'s request to become a <strong>{approveTarget?.requestedRole?.replace(/_/g, " ")}</strong>? Their role will be upgraded immediately.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => !o && (setRejectTarget(null), setRejectReason(""))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Rejection reason for <strong>{rejectTarget?.user?.fullName}</strong>:</p>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide a clear reason for rejection..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm */}
      <Dialog open={!!restoreTarget} onOpenChange={o => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restore Application?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Restore <strong>{restoreTarget?.user?.fullName}</strong>'s rejected application back to <strong>pending</strong> status for re-review? The applicant will be notified.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
            <Button className="bg-primary" onClick={handleRestore} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Restore to Pending
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
