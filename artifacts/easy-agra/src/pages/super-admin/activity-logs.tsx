import { useState, useMemo } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Loader2, Shield, User, Building2, IndianRupee } from "lucide-react";

const ADMIN_ROLES = ["admin"];
const SUPER_ADMIN_ROLES = ["super_admin"];
const BUSINESS_ROLES = ["hotel_owner", "restaurant_owner", "spa_owner"];
const REVENUE_ACTIONS = ["payment_completed", "refund_approved", "refund_rejected", "withdrawal_approved", "refund_requested", "coupon_created", "coupon_updated", "coupon_deleted"];

const actionColors: Record<string, string> = {
  user_login: "bg-blue-100 text-blue-700",
  user_registered: "bg-green-100 text-green-700",
  owner_request_submitted: "bg-purple-100 text-purple-700",
  owner_request_approved: "bg-emerald-100 text-emerald-700",
  owner_request_rejected: "bg-red-100 text-red-700",
  user_suspended: "bg-orange-100 text-orange-700",
  user_activated: "bg-teal-100 text-teal-700",
  user_banned: "bg-red-200 text-red-800",
  settings_updated: "bg-gray-100 text-gray-700",
  featured_updated: "bg-amber-100 text-amber-700",
  hotel_suspended: "bg-orange-100 text-orange-700",
  hotel_restored: "bg-green-100 text-green-700",
  restaurant_suspended: "bg-orange-100 text-orange-700",
  restaurant_restored: "bg-green-100 text-green-700",
  spa_suspended: "bg-orange-100 text-orange-700",
  spa_restored: "bg-green-100 text-green-700",
  coupon_created: "bg-blue-100 text-blue-700",
  coupon_updated: "bg-blue-100 text-blue-700",
  coupon_deleted: "bg-red-100 text-red-700",
  payment_completed: "bg-green-100 text-green-700",
  refund_approved: "bg-teal-100 text-teal-700",
  refund_rejected: "bg-red-100 text-red-700",
  withdrawal_approved: "bg-emerald-100 text-emerald-700",
};

function LogList({ logs }: { logs: any[] }) {
  if (!logs.length) {
    return (
      <div className="flex flex-col items-center py-16">
        <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No activity logs in this category</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-3 flex items-start gap-3">
            <Badge className={`text-xs mt-0.5 shrink-0 ${actionColors[log.actionType] || "bg-gray-100 text-gray-700"}`} variant="secondary">
              {log.actionType.replace(/_/g, " ")}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{log.description}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="capitalize">{log.userRole?.replace(/_/g, " ")}</span>
                {log.ipAddress && <><span>•</span><span>{log.ipAddress}</span></>}
                <span>•</span>
                <span>{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SuperAdminActivityLogs() {
  const { data, isLoading } = useListActivityLogs({ limit: 200 });
  const logs: any[] = data?.logs ?? [];

  const adminLogs = useMemo(() => logs.filter(l => ADMIN_ROLES.includes(l.userRole)), [logs]);
  const superAdminLogs = useMemo(() => logs.filter(l => SUPER_ADMIN_ROLES.includes(l.userRole)), [logs]);
  const businessLogs = useMemo(() => logs.filter(l => BUSINESS_ROLES.includes(l.userRole)), [logs]);
  const revenueLogs = useMemo(() => logs.filter(l => REVENUE_ACTIONS.includes(l.actionType)), [logs]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all platform activity and events across all roles</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-5 w-fit mb-4">
              <TabsTrigger value="all" className="flex items-center gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5" />All
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">{logs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" />Admin
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">{adminLogs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="super_admin" className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />Super Admin
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">{superAdminLogs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />Business
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">{businessLogs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-1.5 text-xs">
                <IndianRupee className="h-3.5 w-3.5" />Revenue
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">{revenueLogs.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all"><LogList logs={logs} /></TabsContent>
            <TabsContent value="admin"><LogList logs={adminLogs} /></TabsContent>
            <TabsContent value="super_admin"><LogList logs={superAdminLogs} /></TabsContent>
            <TabsContent value="business"><LogList logs={businessLogs} /></TabsContent>
            <TabsContent value="revenue"><LogList logs={revenueLogs} /></TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
