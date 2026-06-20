import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useListNotifications, useGetMyOwnerRequest } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, UtensilsCrossed, Sparkles, MapPin, Bell, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  rejected: "bg-gray-100 text-gray-600",
};

const requestStatusIcon: Record<string, any> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

export default function CustomerHome() {
  const { user } = useAuth();
  const { data: unreadData } = useGetUnreadNotificationCount();
  const { data: notificationsData } = useListNotifications({ limit: 3, unreadOnly: true });
  const { data: ownerRequest } = useGetMyOwnerRequest({ query: { retry: false, queryKey: ["getMyOwnerRequest"] } });

  const features = [
    { icon: UtensilsCrossed, label: "Restaurants", color: "bg-orange-50 text-orange-600", href: "/restaurants" },
    { icon: Sparkles, label: "Spas", color: "bg-purple-50 text-purple-600", href: "/spas" },
    { icon: MapPin, label: "Places", color: "bg-green-50 text-green-600", href: "/places" },
    { icon: Building2, label: "Hotels", color: "bg-blue-50 text-blue-600", coming: true },
  ];

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-sm">Good to see you,</p>
          <h1 className="text-xl font-bold mt-0.5">{user?.fullName}</h1>
          <div className="flex items-center gap-2 mt-3">
            <Badge className={`text-xs px-2 py-0.5 border-0 ${statusColors[user?.status || "active"]}`}>
              {user?.status}
            </Badge>
            <span className="text-white/60 text-xs capitalize">{user?.role?.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Notifications preview */}
        {unreadData && unreadData.count > 0 && (
          <Link href="/notifications">
            <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{unreadData.count} unread notification{unreadData.count > 1 ? "s" : ""}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Explore Agra</h2>
          <div className="grid grid-cols-4 gap-3">
            {features.map(({ icon: Icon, label, color, coming, href }: any) => {
              const tile = (
                <div key={label} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center transition-transform group-active:scale-95`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  {coming && <span className="text-xs text-muted-foreground">Soon</span>}
                </div>
              );
              return href ? <Link key={label} href={href}>{tile}</Link> : tile;
            })}
          </div>
        </div>

        {/* Owner request status / CTA */}
        {ownerRequest ? (
          <Card className="border-2 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {requestStatusIcon[ownerRequest.status] || <AlertCircle className="h-4 w-4" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm">Owner Request</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    {ownerRequest.requestedRole?.replace(/_/g, " ")} — {ownerRequest.status}
                  </p>
                  {ownerRequest.status === "rejected" && ownerRequest.rejectionReason && (
                    <p className="text-xs text-destructive mt-1">{ownerRequest.rejectionReason}</p>
                  )}
                </div>
                <Badge variant={ownerRequest.status === "approved" ? "default" : "secondary"} className="text-xs capitalize">
                  {ownerRequest.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <Building2 className="h-8 w-8 text-primary/60 mx-auto mb-2" />
              <p className="font-semibold text-sm">List your business</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Register as a hotel, restaurant, or spa owner on Easy Agra</p>
              <Link href="/become-owner">
                <Button size="sm" className="bg-primary hover:bg-primary/90">Become an Owner</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent notifications */}
        {notificationsData?.notifications && notificationsData.notifications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Alerts</h2>
              <Link href="/notifications" className="text-xs text-primary font-medium">View all</Link>
            </div>
            <div className="space-y-2">
              {notificationsData.notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="bg-white border border-border rounded-xl px-4 py-3">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support links */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <Link href="/help" className="hover:text-primary">Help Center</Link>
            <Link href="/contact" className="hover:text-primary">Contact Us</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
