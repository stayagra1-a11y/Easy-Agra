import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const typeColors: Record<string, string> = {
  welcome: "bg-blue-100 text-blue-700",
  owner_approved: "bg-green-100 text-green-700",
  owner_rejected: "bg-red-100 text-red-700",
  account_update: "bg-yellow-100 text-yellow-700",
  announcement: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation = useMarkNotificationRead();

  const handleMarkAll = async () => {
    await markAllMutation.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  };

  const handleMarkOne = async (id: number) => {
    await markOneMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  };

  const unread = data?.notifications?.filter(n => !n.isRead).length || 0;

  return (
    <CustomerLayout>
      <div className="px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unread > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAll} disabled={markAllMutation.isPending} className="gap-1.5">
              {markAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data?.notifications?.length ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkOne(n.id)}
                className={`bg-white border rounded-xl px-4 py-3 transition-colors cursor-pointer ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      <p className="font-semibold text-sm truncate">{n.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${typeColors[n.type] || typeColors.general}`} variant="secondary">
                    {n.type.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
