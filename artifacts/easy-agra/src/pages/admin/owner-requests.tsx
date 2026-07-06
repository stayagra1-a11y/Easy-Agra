import { useState } from "react";
import {
  useListOwnerRequests,
  useGetOwnerRequest,
  useApproveOwnerRequest,
  useRejectOwnerRequest,
  getListOwnerRequestsQueryKey,
  getGetOwnerRequestQueryKey,
} from "@workspace/api-client-react";
import type { OwnerRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileCheck, Loader2, CheckCircle2, XCircle, Building2, UtensilsCrossed,
  Sparkles, Clock, MapPin, Phone, Mail, FileText, Camera, Hash,
  ChevronRight, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

function RequestDetail({ id, onApprove, onReject }: { id: number; onApprove: (r: OwnerRequest) => void; onReject: (r: OwnerRequest) => void }) {
  const { data: request, isLoading } = useGetOwnerRequest(id, {
    query: { queryKey: getGetOwnerRequestQueryKey(id) },
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!request) return null;

  const role = roleConfig[request.requestedRole];
  const photos = request.businessPhotos as string[] | null;

  return (
    <div className="space-y-4 pb-6">
      {/* Status + role */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${statusColors[request.status]}`} variant="secondary">{request.status}</Badge>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${role.color}`}>
          <role.icon className="h-3.5 w-3.5" />
          {role.label}
        </div>
      </div>

      {/* Business info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Information</h3>
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

      {/* Owner contact */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Owner Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          {request.user?.fullName && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Account Name</p><p className="text-sm font-medium">{request.user.fullName}</p></div>}
          {request.ownerName && <DetailField label="Owner Name" value={request.ownerName} />}
          {request.user?.email && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Account Email</p><p className="text-sm font-medium">{request.user.email}</p></div>}
          {request.ownerEmail && <DetailField label="Contact Email" value={request.ownerEmail} />}
          {request.ownerMobile && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Mobile</p><p className="text-sm font-medium">{request.ownerMobile}</p></div>}
        </div>
      </div>

      {/* Business photos */}
      {photos && photos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Camera className="h-3.5 w-3.5" />Business Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg border" />
            ))}
          </div>
        </div>
      )}

      {/* Identity proof — show actual images */}
      {(request.identityProof || (request as any).identityProofBack) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />Identity Proof
          </h3>
          <div className={`grid gap-2 ${request.identityProof && (request as any).identityProofBack ? "grid-cols-2" : "grid-cols-1"}`}>
            {request.identityProof && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Front Side</p>
                <a href={request.identityProof} target="_blank" rel="noopener noreferrer">
                  <img src={request.identityProof} alt="ID Front" className="w-full h-36 object-cover rounded-xl border hover:opacity-90 transition-opacity cursor-zoom-in" />
                </a>
              </div>
            )}
            {(request as any).identityProofBack && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Back Side</p>
                <a href={(request as any).identityProofBack} target="_blank" rel="noopener noreferrer">
                  <img src={(request as any).identityProofBack} alt="ID Back" className="w-full h-36 object-cover rounded-xl border hover:opacity-90 transition-opacity cursor-zoom-in" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {request.rejectionReason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{request.rejectionReason}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-3">
        <p>Submitted: {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        {request.approvedAt && <p>Reviewed: {new Date(request.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
      </div>

      {/* Action buttons */}
      {request.status === "pending" && (
        <div className="flex gap-2 pt-2">
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => onApprove(request)}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
          </Button>
          <Button className="flex-1" variant="destructive" onClick={() => onReject(request)}>
            <XCircle className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminOwnerRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OwnerRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<OwnerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useListOwnerRequests({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });

  const approveMutation = useApproveOwnerRequest();
  const rejectMutation = useRejectOwnerRequest();

  const pendingCount = data?.requests?.filter(r => r.status === "pending").length ?? 0;
  const approvedCount = data?.requests?.filter(r => r.status === "approved").length ?? 0;
  const rejectedCount = data?.requests?.filter(r => r.status === "rejected").length ?? 0;

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approveMutation.mutateAsync({ id: approveTarget.id });
      queryClient.invalidateQueries({ queryKey: getListOwnerRequestsQueryKey() });
      if (selectedId === approveTarget.id) {
        queryClient.invalidateQueries({ queryKey: getGetOwnerRequestQueryKey(approveTarget.id) });
      }
      setApproveTarget(null);
      setSelectedId(null);
      toast({ title: "Request approved!", description: `${approveTarget.user?.fullName} is now a ${approveTarget.requestedRole.replace(/_/g, " ")}.` });
    } catch {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectTarget.id, data: { reason: rejectReason } });
      queryClient.invalidateQueries({ queryKey: getListOwnerRequestsQueryKey() });
      if (selectedId === rejectTarget.id) {
        queryClient.invalidateQueries({ queryKey: getGetOwnerRequestQueryKey(rejectTarget.id) });
      }
      setRejectTarget(null);
      setRejectReason("");
      setSelectedId(null);
      toast({ title: "Request rejected" });
    } catch {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Owner Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage business owner applications</p>
        </div>

        {/* Summary cards */}
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

        {/* Filter */}
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

        {/* List */}
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{role.label}</p>
                        {r.businessName && <><span className="text-muted-foreground/40">·</span><p className="text-xs font-medium truncate">{r.businessName}</p></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            className="h-7 w-7 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center transition-colors"
                            onClick={e => { e.stopPropagation(); setApproveTarget(r); }}
                          ><CheckCircle2 className="h-3.5 w-3.5" /></button>
                          <button
                            className="h-7 w-7 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition-colors"
                            onClick={e => { e.stopPropagation(); setRejectTarget(r); }}
                          ><XCircle className="h-3.5 w-3.5" /></button>
                        </div>
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
          <SheetHeader className="mb-4">
            <SheetTitle>Application Detail</SheetTitle>
          </SheetHeader>
          {selectedId !== null && (
            <RequestDetail
              id={selectedId}
              onApprove={r => setApproveTarget(r)}
              onReject={r => setRejectTarget(r)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Approve confirm dialog */}
      <Dialog open={!!approveTarget} onOpenChange={o => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            <p>Approve <strong>{approveTarget?.user?.fullName}</strong>'s application to become a <strong>{approveTarget?.requestedRole?.replace(/_/g, " ")}</strong>?</p>
            <p className="mt-2">Their account role will be automatically upgraded and they'll receive a notification.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve & Upgrade Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => !o && (setRejectTarget(null), setRejectReason(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Provide a reason for rejecting <strong>{rejectTarget?.user?.fullName}</strong>'s request. They'll see this message in their notification.</p>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete business information, invalid GST number, insufficient photos..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejectMutation.isPending}>
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
