import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { useGetDashboardStats, useGetRoleBreakdown } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Shield, FileCheck, Activity, Settings, Bell, TrendingUp, Clock, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BASE = getApiBase();

async function fetchMaintenanceStatus() {
  const res = await fetch(`${BASE}/api/maintenance-status`);
  if (!res.ok) return { maintenanceMode: false };
  return res.json() as Promise<{ maintenanceMode: boolean }>;
}

async function setMaintenanceMode(value: boolean) {
  const res = await fetch(`${BASE}/api/platform-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ maintenanceMode: value }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

function MaintenanceModeCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<boolean | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: fetchMaintenanceStatus,
    refetchInterval: 10_000,
  });

  const mutation = useMutation({
    mutationFn: setMaintenanceMode,
    onSuccess: (_, value) => {
      qc.invalidateQueries({ queryKey: ["maintenance-status"] });
      toast({ title: value ? "Maintenance Mode ON" : "Maintenance Mode OFF", description: value ? "Customers now see the maintenance page." : "App is back to normal." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isOn = data?.maintenanceMode ?? false;

  function handleToggle(newValue: boolean) {
    if (newValue) {
      setConfirmDialog(true);
    } else {
      mutation.mutate(false);
    }
  }

  return (
    <>
      <Card className={`border-2 ${isOn ? "border-red-400 bg-red-50" : "border-green-300 bg-green-50"} transition-colors`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${isOn ? "bg-red-100" : "bg-green-100"}`}>
                <Wrench className={`h-5 w-5 ${isOn ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <h3 className="font-bold text-base">Maintenance Mode</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isOn
                    ? "App is in maintenance — customers see the maintenance page."
                    : "App is live and accessible to everyone."}
                </p>
                {isOn && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-700 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Customers cannot access the app right now
                  </div>
                )}
                {!isOn && (
                  <div className="flex items-center gap-1.5 mt-2 text-green-700 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All systems normal
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {isLoading || mutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={isOn}
                  onCheckedChange={handleToggle}
                  className={isOn ? "data-[state=checked]:bg-red-500" : ""}
                />
              )}
            </div>
          </div>

          {isOn && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => mutation.mutate(false)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Turn OFF — Restore App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog === true} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Enable Maintenance Mode?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All customers and business owners will immediately see the maintenance page and won't be able to access the app. Only admins and super admins can still log in and use the app. Turn it OFF when you're done fixing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { setConfirmDialog(null); mutation.mutate(true); }}
            >
              Yes, Enable Maintenance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: roleData } = useGetRoleBreakdown();

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50", href: "/super-admin/users" },
    { label: "Pending Requests", value: stats?.pendingOwnerRequests ?? 0, icon: Clock, color: "text-yellow-600 bg-yellow-50", href: "/admin/owner-requests" },
    { label: "Active Users", value: stats?.activeUsers ?? 0, icon: Shield, color: "text-green-600 bg-green-50", href: "/super-admin/users" },
    { label: "Total Admins", value: stats?.totalAdmins ?? 0, icon: Shield, color: "text-primary/80 bg-primary/10", href: "/super-admin/admins" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5">
          <p className="text-white/70 text-sm">Super Admin Control Panel</p>
          <h1 className="text-2xl font-bold mt-1">Platform Overview</h1>
          <p className="text-white/60 text-sm mt-1">Full platform access and control</p>
        </div>

        {/* Maintenance Mode Toggle — most prominent control */}
        <MaintenanceModeCard />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Role breakdown */}
        {roleData && roleData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Platform Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roleData.map((r) => (
                  <div key={r.role} className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground capitalize w-36">{r.role.replace(/_/g, " ")}</div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (r.count / (stats?.totalUsers || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-sm font-semibold w-6 text-right">{r.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "All Users", icon: Users, href: "/super-admin/users" },
            { label: "Manage Admins", icon: Shield, href: "/super-admin/admins" },
            { label: "Owner Requests", icon: FileCheck, href: "/admin/owner-requests" },
            { label: "Platform Settings", icon: Settings, href: "/super-admin/platform-settings" },
            { label: "Activity Logs", icon: Activity, href: "/super-admin/activity-logs" },
            { label: "Announcements", icon: Bell, href: "/admin/notifications" },
          ].map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
