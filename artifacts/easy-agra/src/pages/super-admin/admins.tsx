import { useState } from "react";
import { useListUsers, useUpdateUserRole, useUpdateUserStatus, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, UserX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminAdmins() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListUsers({ role: "admin" });
  const roleMutation = useUpdateUserRole();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleRevoke = async () => {
    if (!confirmId) return;
    try {
      await roleMutation.mutateAsync({ id: confirmId, data: { role: "customer" } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Admin role revoked" });
    } catch {
      toast({ title: "Error", description: "Failed to revoke admin", variant: "destructive" });
    }
    setConfirmId(null);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Admins</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage admin accounts</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data?.users?.length ? (
          <div className="flex flex-col items-center py-16">
            <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No admins found</p>
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
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className={`text-xs ${statusColors[u.status] || "bg-gray-100 text-gray-600"}`} variant="secondary">{u.status}</Badge>
                      <span className="text-xs text-muted-foreground">Since {new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5 shrink-0" onClick={() => setConfirmId(u.id)}>
                    <UserX className="h-3.5 w-3.5 mr-1" /> Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmId} onOpenChange={o => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access?</AlertDialogTitle>
            <AlertDialogDescription>This user will be demoted to a regular customer account. They'll lose all admin privileges.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive hover:bg-destructive/90">Revoke Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
