import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useListNotifications, useGetMyOwnerRequest } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, UtensilsCrossed, Leaf, Landmark, Bell, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Star, Building2, Sparkles, MapPin } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchFeatured() {
  const res = await fetch(`${BASE}/api/platform-settings/featured`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

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

function FeaturedCard({ name, image, href, type }: { name: string; image?: string | null; href: string; type: string }) {
  const iconMap: Record<string, any> = {
    hotel: Building2,
    restaurant: UtensilsCrossed,
    spa: Sparkles,
    place: MapPin,
  };
  const Icon = iconMap[type] || MapPin;
  return (
    <Link href={href}>
      <div className="relative flex-shrink-0 w-36 rounded-xl overflow-hidden border border-border bg-muted cursor-pointer hover:shadow-md transition-shadow">
        {image ? (
          <img src={image} alt={name} className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 flex items-center justify-center bg-primary/10">
            <Icon className="h-8 w-8 text-primary/50" />
          </div>
        )}
        <div className="p-2">
          <p className="text-xs font-semibold line-clamp-2 leading-tight">{name}</p>
        </div>
      </div>
    </Link>
  );
}

export default function CustomerHome() {
  const { user } = useAuth();
  const { data: unreadData } = useGetUnreadNotificationCount();
  const { data: notificationsData } = useListNotifications({ limit: 3, unreadOnly: true });
  const { data: ownerRequest } = useGetMyOwnerRequest({ query: { retry: false, queryKey: ["getMyOwnerRequest"] } });
  const { data: featured } = useQuery({ queryKey: ["featured-public"], queryFn: fetchFeatured });

  const hasFeatured =
    featured && (
      (featured.hotels?.length ?? 0) > 0 ||
      (featured.restaurants?.length ?? 0) > 0 ||
      (featured.spas?.length ?? 0) > 0 ||
      (featured.places?.length ?? 0) > 0
    );

  const features = [
    { icon: BedDouble, label: "Hotels", href: "/hotels", bg: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80", color: "text-blue-100" },
    { icon: Landmark, label: "Famous Places", href: "/places", bg: "https://images.unsplash.com/photo-1548013146-72479768bada?w=200&q=80", color: "text-amber-100" },
    { icon: UtensilsCrossed, label: "Best Restaurants", href: "/restaurants", bg: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80", color: "text-orange-100" },
    { icon: Leaf, label: "Spas", href: "/spas", bg: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200&q=80", color: "text-green-100" },
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
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, color, href, bg }: any) => {
              const tile = (
                <div key={label} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-md transition-transform group-active:scale-95">
                    <img src={bg} alt={label} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-semibold text-foreground text-center leading-tight">{label}</span>
                </div>
              );
              return href ? <Link key={label} href={href} className="block">{tile}</Link> : tile;
            })}
          </div>
        </div>

        {/* Featured section */}
        {hasFeatured && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Featured in Agra</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {featured.hotels?.map((h: any) => (
                <FeaturedCard key={`hotel-${h.id}`} name={h.name} image={h.coverImage} href="/hotels" type="hotel" />
              ))}
              {featured.restaurants?.map((r: any) => (
                <FeaturedCard key={`rest-${r.id}`} name={r.name} image={r.coverPhoto} href="/restaurants" type="restaurant" />
              ))}
              {featured.spas?.map((s: any) => (
                <FeaturedCard key={`spa-${s.id}`} name={s.name} image={s.coverPhoto} href="/spas" type="spa" />
              ))}
              {featured.places?.map((p: any) => (
                <FeaturedCard key={`place-${p.id}`} name={p.name} image={null} href="/places" type="place" />
              ))}
            </div>
          </div>
        )}

        {/* Owner request status */}
        {ownerRequest && (
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

      </div>
    </CustomerLayout>
  );
}
