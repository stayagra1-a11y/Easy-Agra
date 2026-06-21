import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useListNotifications, useGetMyOwnerRequest } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, UtensilsCrossed, Leaf, Landmark, Bell, ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Star, Building2, Sparkles, MapPin, Search } from "lucide-react";

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
  const [, navigate] = useLocation();
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
    { icon: BedDouble, label: "Hotels", sub: "Luxury stays", href: "/hotels", bg: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=90" },
    { icon: Landmark, label: "Famous Places", sub: "Iconic monuments", href: "/places", bg: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=90" },
    { icon: UtensilsCrossed, label: "Restaurants", sub: "Fine dining", href: "/restaurants", bg: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=90" },
    { icon: Leaf, label: "Spas", sub: "Wellness & relax", href: "/spas", bg: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=90" },
  ];

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-sm">Namaste,</p>
          <h1 className="text-xl font-bold mt-0.5">{user?.fullName?.split(" ")[0]} ji! 🙏</h1>
          <p className="text-white/60 text-xs mt-1">Agra mein aapka swagat hai</p>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate("/search")}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">Hotel, jagah, restaurant dhundho...</span>
          <div className="bg-primary/10 rounded-full p-1">
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          </div>
        </button>

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
            {features.map(({ icon: Icon, label, sub, href, bg }: any) => {
              const tile = (
                <div key={label} className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group cursor-pointer active:scale-[0.97] transition-transform duration-150">
                  {/* Background photo */}
                  <img
                    src={bg}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  {/* Top-right icon badge */}
                  <div className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {/* Bottom text */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-3">
                    <p className="text-white font-bold text-sm leading-tight drop-shadow">{label}</p>
                    <p className="text-white/75 text-xs mt-0.5 leading-tight drop-shadow">{sub}</p>
                  </div>
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
