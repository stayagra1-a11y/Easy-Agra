import { useState } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Loader2 } from "lucide-react";

const actionColors: Record<string, string> = {
  user_login: "bg-blue-100 text-blue-700",
  user_registered: "bg-green-100 text-green-700",
  owner_request_submitted: "bg-purple-100 text-purple-700",
  owner_request_approved: "bg-emerald-100 text-emerald-700",
  owner_request_rejected: "bg-red-100 text-red-700",
  user_suspended: "bg-orange-100 text-orange-700",
  user_activated: "bg-teal-100 text-teal-700",
  platform_settings_updated: "bg-gray-100 text-gray-700",
};

export default function ActivityLogs() {
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading } = useListActivityLogs({
    actionType: actionFilter !== "all" ? actionFilter : undefined,
    limit: 100,
  });

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all platform activity and events</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="user_login">User Login</SelectItem>
              <SelectItem value="user_registered">User Registered</SelectItem>
              <SelectItem value="owner_request_submitted">Owner Request Submitted</SelectItem>
              <SelectItem value="owner_request_approved">Owner Request Approved</SelectItem>
              <SelectItem value="owner_request_rejected">Owner Request Rejected</SelectItem>
              <SelectItem value="user_suspended">User Suspended</SelectItem>
              <SelectItem value="user_activated">User Activated</SelectItem>
              <SelectItem value="platform_settings_updated">Settings Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data?.logs?.length ? (
          <div className="flex flex-col items-center py-16">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.logs.map((log) => (
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
        )}
      </div>
    </AdminLayout>
  );
}
