import { useState } from "react";
import { useListNotifications, useSendAnnouncement, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sendMutation = useSendAnnouncement();
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const [form, setForm] = useState({ title: "", message: "", type: "announcement", targetRole: "all" });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMutation.mutateAsync({ data: form as any });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      setForm({ title: "", message: "", type: "announcement", targetRole: "all" });
      toast({ title: "Announcement sent!", description: `Sent to ${form.targetRole === "all" ? "all users" : form.targetRole.replace(/_/g, " ")}` });
    } catch {
      toast({ title: "Error", description: "Failed to send announcement", variant: "destructive" });
    }
  };

  const typeColors: Record<string, string> = {
    welcome: "bg-blue-100 text-blue-700",
    owner_approved: "bg-green-100 text-green-700",
    owner_rejected: "bg-red-100 text-red-700",
    announcement: "bg-purple-100 text-purple-700",
    general: "bg-gray-100 text-gray-700",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Announcements</h1>

        {/* Send form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Send Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Announcement title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea placeholder="Your message..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target</Label>
                  <Select value={form.targetRole} onValueChange={v => setForm(f => ({ ...f, targetRole: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="hotel_owner">Hotel Owners</SelectItem>
                      <SelectItem value="restaurant_owner">Restaurant Owners</SelectItem>
                      <SelectItem value="spa_owner">Spa Owners</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary" disabled={sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Announcement
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sent notifications */}
        <div>
          <h2 className="font-semibold mb-3">Sent Announcements</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !data?.notifications?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              No announcements yet
            </div>
          ) : (
            <div className="space-y-2">
              {data.notifications.map((n) => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1.5">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${typeColors[n.type] || typeColors.general}`} variant="secondary">
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
