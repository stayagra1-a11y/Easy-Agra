import { useGetDashboardStats, useGetRoleBreakdown } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, FileCheck, Activity, Settings, Bell, TrendingUp, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

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
