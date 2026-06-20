import { useState } from "react";
import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2, Trash2, BellOff } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  const { toast } = useToast();
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation = useMarkNotificationRead();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();
  const [pushLoading, setPushLoading] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/api/notifications/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
    },
    onError: () => toast({ title: "Error", description: "Could not delete notification", variant: "destructive" }),
  });

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

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast({ title: "Push notifications disabled" });
      } else {
        const ok = await subscribe();
        if (ok) toast({ title: "Push notifications enabled" });
        else if (permission === "denied") toast({ title: "Permission denied", description: "Enable notifications in browser settings", variant: "destructive" });
      }
    } finally {
      setPushLoading(false);
    }
  };

  const unread = data?.notifications?.filter(n => !n.isRead).length || 0;

  return (
    <CustomerLayout>
      <div className="px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unread > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAll} disabled={markAllMutation.isPending} className="gap-1.5">
              {markAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Mark all read
            </Button>
          )}
        </div>

        {/* Push notification toggle */}
        {isSupported && (
          <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2">
              {isSubscribed
                ? <Bell className="h-4 w-4 text-primary" />
                : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{isSubscribed ? "Push notifications on" : "Push notifications off"}</p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed ? "You'll receive alerts on this device" : "Enable to get instant alerts"}
                </p>
              </div>
            </div>
            <Button size="sm" variant={isSubscribed ? "outline" : "default"} onClick={handlePushToggle} disabled={pushLoading} className="shrink-0">
              {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isSubscribed ? "Disable" : "Enable"}
            </Button>
          </div>
        )}

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
                className={`bg-white border rounded-xl px-4 py-3 transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !n.isRead && handleMarkOne(n.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      <p className="font-semibold text-sm truncate">{n.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge className={`text-xs ${typeColors[n.type] || typeColors.general}`} variant="secondary">
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
