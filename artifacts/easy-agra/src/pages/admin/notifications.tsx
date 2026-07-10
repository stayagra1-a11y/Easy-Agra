import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { useListNotifications, useSendAnnouncement, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Loader2, Send, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = getApiBase();

const typeColors: Record<string, string> = {
  welcome: "bg-blue-100 text-blue-700",
  owner_approved: "bg-green-100 text-green-700",
  owner_rejected: "bg-red-100 text-red-700",
  announcement: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
};

async function callPushSend(body: { title: string; body: string; targetRole: string }) {
  const res = await fetch(`${BASE}/api/admin/push-notifications/send`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to send"); }
  return res.json();
}

async function callEmergency(body: { title: string; body: string }) {
  const res = await fetch(`${BASE}/api/admin/push-notifications/emergency`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
  return res.json();
}

const TARGET_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "customer", label: "Customers" },
  { value: "hotel_owner", label: "Hotel Owners" },
  { value: "restaurant_owner", label: "Restaurant Owners" },
  { value: "spa_owner", label: "Spa Owners" },
  { value: "admin", label: "Admins" },
];

const EMPTY_ANNOUNCE = { title: "", message: "", type: "announcement", targetRole: "all" };
const EMPTY_PUSH = { title: "", body: "", targetRole: "all" };
const EMPTY_EMERGENCY = { title: "🚨 Emergency Alert", body: "" };

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const announceMutation = useSendAnnouncement();
  const { data, isLoading } = useListNotifications({ limit: 50 });
  const [announce, setAnnounce] = useState({ ...EMPTY_ANNOUNCE });
  const [push, setPush] = useState({ ...EMPTY_PUSH });
  const [emergency, setEmergency] = useState({ ...EMPTY_EMERGENCY });

  const pushMutation = useMutation({
    mutationFn: callPushSend,
    onSuccess: (d: any) => { toast({ title: "Push sent!", description: d.message }); setPush({ ...EMPTY_PUSH }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const emergencyMutation = useMutation({
    mutationFn: callEmergency,
    onSuccess: (d: any) => { toast({ title: "Emergency alert sent!", description: d.message }); setEmergency({ ...EMPTY_EMERGENCY }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await announceMutation.mutateAsync({ data: announce as any });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      setAnnounce({ ...EMPTY_ANNOUNCE });
      toast({ title: "Announcement sent!" });
    } catch {
      toast({ title: "Error", description: "Failed to send announcement", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />Notification Center
        </h1>

        <Tabs defaultValue="announce">
          <TabsList className="grid grid-cols-3 w-fit">
            <TabsTrigger value="announce" className="gap-1.5 text-xs"><Send className="h-3.5 w-3.5" />In-App</TabsTrigger>
            <TabsTrigger value="push" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Push</TabsTrigger>
            <TabsTrigger value="emergency" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" />Emergency</TabsTrigger>
          </TabsList>

          {/* ── In-App Announcement ── */}
          <TabsContent value="announce">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Send In-App Announcement</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAnnounce} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input placeholder="Announcement title..." value={announce.title} onChange={e => setAnnounce(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Textarea placeholder="Your message..." value={announce.message} onChange={e => setAnnounce(f => ({ ...f, message: e.target.value }))} required rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Target</Label>
                      <Select value={announce.targetRole} onValueChange={v => setAnnounce(f => ({ ...f, targetRole: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TARGET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={announce.type} onValueChange={v => setAnnounce(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={announceMutation.isPending} className="w-full gap-2 bg-primary">
                    {announceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Announcement
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Push Notification ── */}
          <TabsContent value="push">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />Send Push Notification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input placeholder="Push title..." value={push.title} onChange={e => setPush(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Textarea placeholder="Push message..." value={push.body} onChange={e => setPush(f => ({ ...f, body: e.target.value }))} rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target Audience</Label>
                    <Select value={push.targetRole} onValueChange={v => setPush(f => ({ ...f, targetRole: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TARGET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => pushMutation.mutate(push)}
                    disabled={pushMutation.isPending || !push.title || !push.body}
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {pushMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Send Push Notification
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Only reaches users who have enabled push on their device
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Emergency Alert ── */}
          <TabsContent value="emergency">
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />Emergency Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
                    Emergency alerts are pushed to ALL users regardless of their settings. Use only for genuine emergencies.
                  </div>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={emergency.title} onChange={e => setEmergency(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Emergency Message</Label>
                    <Textarea placeholder="Describe the emergency..." value={emergency.body} onChange={e => setEmergency(f => ({ ...f, body: e.target.value }))} rows={3} />
                  </div>
                  <Button
                    onClick={() => emergencyMutation.mutate(emergency)}
                    disabled={emergencyMutation.isPending || !emergency.body}
                    variant="destructive"
                    className="w-full gap-2"
                  >
                    {emergencyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    Send Emergency Alert to All Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sent notifications log */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Announcements</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !data?.notifications?.length ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No announcements sent yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.notifications
                .filter((n: any) => n.type === "announcement")
                .slice(0, 20)
                .map((n: any) => (
                  <Card key={n.id} className="border-muted">
                    <CardContent className="p-3 flex items-start gap-3">
                      <Badge className={`text-xs mt-0.5 shrink-0 ${typeColors[n.type] || typeColors.general}`} variant="secondary">
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
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
