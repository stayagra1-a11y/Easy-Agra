import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Hotel, Utensils, Sparkles, Users, Search, Ban, CheckCircle, AlertTriangle } from "lucide-react";

const BASE = getApiBase();

async function fetchBusinesses() {
  const res = await fetch(`${BASE}/api/admin/security/businesses`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch businesses");
  return res.json();
}

async function fetchUsers(search: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  const res = await fetch(`${BASE}/api/users?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    approved: "bg-green-100 text-green-700 border-green-200",
    active: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    suspended: "bg-orange-100 text-orange-700 border-orange-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    banned: "bg-red-200 text-red-800 border-red-300",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <Badge variant="outline" className={`text-xs capitalize ${colors[status] ?? ""}`}>{status}</Badge>;
};

function BusinessTable({
  items,
  type,
  onAction,
}: {
  items: any[];
  type: "hotels" | "restaurants" | "spas";
  onAction: (id: number, type: string, action: "suspend" | "restore", reason?: string) => void;
}) {
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: number; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const handleSuspend = (id: number, name: string) => {
    setPendingAction({ id, name });
    setReason("");
    setReasonDialogOpen(true);
  };

  const confirmSuspend = () => {
    if (pendingAction) {
      onAction(pendingAction.id, type.replace(/s$/, ""), "suspend", reason);
      setReasonDialogOpen(false);
      setPendingAction(null);
    }
  };

  if (items.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No {type} found</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{statusBadge(item.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  {item.status === "suspended" ? (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => onAction(item.id, type.replace(/s$/, ""), "restore")}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Restore
                    </Button>
                  ) : item.status !== "rejected" && (
                    <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleSuspend(item.id, item.name)}>
                      <Ban className="h-3.5 w-3.5 mr-1" />Suspend
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend "{pendingAction?.name}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">This will prevent the listing from receiving new bookings and notify the owner.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Policy violation, Quality issues..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={confirmSuspend}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SecurityPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [userReasonDialog, setUserReasonDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ id: number; name: string; action: "suspended" | "banned" } | null>(null);
  const [userReason, setUserReason] = useState("");

  const { data: bizData, isLoading: bizLoading } = useQuery({ queryKey: ["security-businesses"], queryFn: fetchBusinesses });
  const { data: usersData, isLoading: usersLoading } = useQuery({ queryKey: ["security-users", userSearch], queryFn: () => fetchUsers(userSearch) });

  const bizMutation = useMutation({
    mutationFn: async ({ id, type, action, reason }: { id: number; type: string; action: string; reason?: string }) => {
      const res = await fetch(`${BASE}/api/admin/security/${type}s/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["security-businesses"] });
      toast({ title: vars.action === "suspend" ? "Business suspended" : "Business restored" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const userStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: string; reason?: string }) => {
      const res = await fetch(`${BASE}/api/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["security-users"] });
      const labels: Record<string, string> = { suspended: "suspended", banned: "banned", active: "restored" };
      toast({ title: `User ${labels[vars.status] ?? vars.status}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleBizAction = (id: number, type: string, action: "suspend" | "restore", reason?: string) => {
    bizMutation.mutate({ id, type, action, reason });
  };

  const openUserAction = (user: any, action: "suspended" | "banned") => {
    setPendingUser({ id: user.id, name: user.fullName, action });
    setUserReason("");
    setUserReasonDialog(true);
  };

  const confirmUserAction = () => {
    if (pendingUser) {
      userStatusMutation.mutate({ id: pendingUser.id, status: pendingUser.action, reason: userReason });
      setUserReasonDialog(false);
      setPendingUser(null);
    }
  };

  const hotels: any[] = bizData?.hotels ?? [];
  const restaurants: any[] = bizData?.restaurants ?? [];
  const spas: any[] = bizData?.spas ?? [];
  const users: any[] = usersData?.users ?? [];

  const nonAdminUsers = users.filter((u: any) => !["super_admin", "admin"].includes(u.role));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-red-500" />Security Controls</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage business listings and user access controls</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-1.5 text-xs"><Hotel className="h-3.5 w-3.5" />Hotels</TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-1.5 text-xs"><Utensils className="h-3.5 w-3.5" />Restaurants</TabsTrigger>
            <TabsTrigger value="spas" className="flex items-center gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" />Spas</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">User Access Control</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name, email or phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : nonAdminUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonAdminUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{user.role?.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>{statusBadge(user.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1.5 justify-end">
                              {user.status === "active" && (
                                <>
                                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs h-7"
                                    onClick={() => openUserAction(user, "suspended")}>
                                    Suspend
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                                    onClick={() => openUserAction(user, "banned")}>
                                    Ban
                                  </Button>
                                </>
                              )}
                              {(user.status === "suspended" || user.status === "banned") && (
                                <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                                  onClick={() => userStatusMutation.mutate({ id: user.id, status: "active" })}>
                                  Restore
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hotels">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Hotel Listings Control</CardTitle></CardHeader>
              <CardContent className="p-0">
                {bizLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  : <BusinessTable items={hotels} type="hotels" onAction={handleBizAction} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Restaurant Listings Control</CardTitle></CardHeader>
              <CardContent className="p-0">
                {bizLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  : <BusinessTable items={restaurants} type="restaurants" onAction={handleBizAction} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spas">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Spa Listings Control</CardTitle></CardHeader>
              <CardContent className="p-0">
                {bizLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  : <BusinessTable items={spas} type="spas" onAction={handleBizAction} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={userReasonDialog} onOpenChange={setUserReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingUser?.action === "banned" ? "Ban" : "Suspend"} user "{pendingUser?.name}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                {pendingUser?.action === "banned"
                  ? "Banning will permanently block this user from logging in. They will be notified."
                  : "Suspending will temporarily block this user's access. They will be notified."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input value={userReason} onChange={e => setUserReason(e.target.value)} placeholder="e.g. Terms of service violation..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserReasonDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmUserAction}
              disabled={userStatusMutation.isPending}>
              {userStatusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {pendingUser?.action === "banned" ? "Ban User" : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
