import { useState } from "react";
import { useListUsers, useUpdateUserStatus, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import type { UserStatusUpdateStatus, UserRoleUpdateRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, MoreVertical, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  rejected: "bg-gray-100 text-gray-600",
};

const roleColors: Record<string, string> = {
  customer: "bg-blue-50 text-blue-700",
  hotel_owner: "bg-indigo-50 text-indigo-700",
  restaurant_owner: "bg-orange-50 text-orange-700",
  spa_owner: "bg-purple-50 text-purple-700",
  admin: "bg-primary/10 text-primary",
  super_admin: "bg-red-50 text-red-700",
};

export default function SuperAdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: number; value: string } | null>(null);

  const { data, isLoading } = useListUsers({
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const statusMutation = useUpdateUserStatus();
  const roleMutation = useUpdateUserRole();

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "status") {
        await statusMutation.mutateAsync({ id: confirmAction.userId, data: { status: confirmAction.value as UserStatusUpdateStatus } });
      } else {
        await roleMutation.mutateAsync({ id: confirmAction.userId, data: { role: confirmAction.value as UserRoleUpdateRole } });
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
    setConfirmAction(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">All Users</h1>
          <Badge variant="outline">{data?.users?.length ?? 0} total</Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="hotel_owner">Hotel Owner</SelectItem>
              <SelectItem value="restaurant_owner">Restaurant Owner</SelectItem>
              <SelectItem value="spa_owner">Spa Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data?.users?.length ? (
          <div className="flex flex-col items-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.users.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={u.profilePhoto || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email} · {u.mobile}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className={`text-xs ${statusColors[u.status]}`} variant="secondary">{u.status}</Badge>
                      <Badge className={`text-xs ${roleColors[u.role]}`} variant="secondary">{u.role.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  {u.role !== "super_admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.status !== "active" && <DropdownMenuItem onClick={() => setConfirmAction({ type: "status", userId: u.id, value: "active" })}>Activate</DropdownMenuItem>}
                        {u.status !== "suspended" && <DropdownMenuItem className="text-destructive" onClick={() => setConfirmAction({ type: "status", userId: u.id, value: "suspended" })}>Suspend</DropdownMenuItem>}
                        {u.role !== "admin" && <DropdownMenuItem onClick={() => setConfirmAction({ type: "role", userId: u.id, value: "admin" })}>Make Admin</DropdownMenuItem>}
                        {u.role === "admin" && <DropdownMenuItem onClick={() => setConfirmAction({ type: "role", userId: u.id, value: "customer" })}>Revoke Admin</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => setConfirmAction({ type: "role", userId: u.id, value: "super_admin" })}>Make Super Admin</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={o => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "status"
                ? `Change user status to "${confirmAction.value}"?`
                : `Change user role to "${confirmAction?.value}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
