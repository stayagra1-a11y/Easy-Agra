import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useListNotifications, useGetMyOwnerRequest } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble, UtensilsCrossed, Leaf, Landmark, Bell, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, Star, Building2,
  Sparkles, MapPin, Search, Train,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-request";
import { imgUrl } from "@/lib/cloudinary";
import { useI18n } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchFeatured() {
  const res = await fetch(`${BASE}/api/platform-settings/featured`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

const requestStatusIcon: Record<string, any> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

const DEFAULT_HERO_SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&q=85",
    title: "Taj Mahal",
    sub: "Duniya ka sabse khoobsurat monument",
  },
  {
    img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=900&q=85",
    title: "Agra Fort",
    sub: "Mughal samrajya ki shaan",
  },
  {
    img: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=900&q=85",
    title: "Fatehpur Sikri",
    sub: "Patthar mein ukeri hui kahani",
  },
  {
    img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=900&q=85",
    title: "Mehtab Bagh",
    sub: "Taj ka najara, chandni raat mein",
  },
];

function HeroCarousel({ userName }: { userName: string }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: slidesData } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/hero-slides`);
      if (!res.ok) return null;
      return res.json() as Promise<{ heroSlides: { img: string; title: string; sub: string }[] | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides = (slidesData?.heroSlides && slidesData.heroSlides.length > 0)
    ? slidesData.heroSlides
    : DEFAULT_HERO_SLIDES;

  function startTimer() {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
  }

  useEffect(() => {
    setCurrent(0);
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  function goTo(idx: number) {
    setCurrent(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  }

  const slide = slides[current] ?? slides[0];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ height: 220 }}>
      {slides.map((s, i) => (
        <img
          key={i}
          src={s.img}
          alt={s.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" style={{ zIndex: 2 }} />

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4" style={{ zIndex: 3 }}>
        <p className="text-white/80 text-xs mb-0.5">Namaste, <span className="font-semibold">{userName} ji!</span> 🙏</p>
        <h1 className="text-white text-xl font-bold leading-tight drop-shadow">{slide.title}</h1>
        <p className="text-white/75 text-xs mt-0.5 drop-shadow">{slide.sub}</p>

        <div className="flex gap-1.5 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                height: 6,
                width: i === current ? 20 : 6,
                background: i === current ? "white" : "rgba(255,255,255,0.45)",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Hotel {
  id: number;
  name: string;
  category: string | null;
  coverImage: string | null;
  starRating: number | null;
  city: string | null;
}

interface Restaurant {
  id: number;
  name: string;
  cuisineType: string | null;
  coverPhoto: string | null;
  city: string | null;
}

function HotelCard({ hotel }: { hotel: Hotel }) {
  const [, navigate] = useLocation();
  const cover = hotel.coverImage ? imgUrl(hotel.coverImage, 320) : null;
  return (
    <button
      onClick={() => navigate(`/hotels/${hotel.id}`)}
      className="flex-shrink-0 w-40 rounded-2xl overflow-hidden border border-border bg-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150 text-left"
    >
      <div className="relative w-full" style={{ height: 100 }}>
        {cover ? (
          <img src={cover} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <BedDouble className="h-8 w-8 text-primary/40" />
          </div>
        )}
        {hotel.starRating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
            <span className="text-white text-[10px] font-bold">{hotel.starRating}</span>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="font-semibold text-xs leading-tight line-clamp-2">{hotel.name}</p>
        {hotel.category && (
          <span className="inline-block mt-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full capitalize">
            {hotel.category}
          </span>
        )}
      </div>
    </button>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const [, navigate] = useLocation();
  const cover = restaurant.coverPhoto ? imgUrl(restaurant.coverPhoto, 320) : null;
  return (
    <button
      onClick={() => navigate(`/restaurants/${restaurant.id}`)}
      className="flex-shrink-0 w-40 rounded-2xl overflow-hidden border border-border bg-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-150 text-left"
    >
      <div className="relative w-full" style={{ height: 100 }}>
        {cover ? (
          <img src={cover} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-50">
            <UtensilsCrossed className="h-8 w-8 text-orange-300" />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="font-semibold text-xs leading-tight line-clamp-2">{restaurant.name}</p>
        {restaurant.cuisineType && (
          <span className="inline-block mt-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full capitalize">
            {restaurant.cuisineType}
          </span>
        )}
      </div>
    </button>
  );
}

function HorizontalSkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-40 rounded-2xl overflow-hidden border border-border">
          <Skeleton className="w-full h-24" />
          <div className="px-2.5 py-2 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturedCard({ name, image, href, type }: { name: string; image?: string | null; href: string; type: string }) {
  const iconMap: Record<string, any> = {
    hotel: Building2, restaurant: UtensilsCrossed, spa: Sparkles, place: MapPin,
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
  const { t } = useI18n();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: unreadData } = useGetUnreadNotificationCount();
  const { data: notificationsData } = useListNotifications({ limit: 3, unreadOnly: true });
  const { data: ownerRequest } = useGetMyOwnerRequest({ query: { retry: false, queryKey: ["getMyOwnerRequest"] } });
  const { data: featured } = useQuery({ queryKey: ["featured-public"], queryFn: fetchFeatured });

  const { data: topHotelsData, isLoading: hotelsLoading } = useQuery({
    queryKey: ["top-hotels-home"],
    queryFn: (): Promise<{ hotels: Hotel[] }> =>
      apiRequest(`${BASE}/api/hotels?status=approved&sort=top&limit=8`),
    staleTime: 60_000,
  });

  const { data: topRestaurantsData, isLoading: restaurantsLoading } = useQuery({
    queryKey: ["top-restaurants-home"],
    queryFn: (): Promise<{ restaurants: Restaurant[] }> =>
      apiRequest(`${BASE}/api/restaurants?sort=top&limit=8`),
    staleTime: 60_000,
  });

  const topHotels = topHotelsData?.hotels ?? [];
  const topRestaurants = topRestaurantsData?.restaurants ?? [];

  const hasFeatured =
    featured &&
    ((featured.hotels?.length ?? 0) > 0 ||
      (featured.restaurants?.length ?? 0) > 0 ||
      (featured.spas?.length ?? 0) > 0 ||
      (featured.places?.length ?? 0) > 0);

  const firstName = user?.fullName?.split(" ")[0] ?? "Aap";

  const features = [
    { icon: BedDouble, label: "Hotels", sub: "Luxury stays", href: "/hotels", bg: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=90" },
    { icon: Train, label: "Transport", sub: "Rail, Bus, Air", href: "/transport", bg: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=90" },
    { icon: Landmark, label: "Famous Places", sub: "Iconic monuments", href: "/places", bg: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=90" },
    { icon: UtensilsCrossed, label: "Restaurants", sub: "Fine dining", href: "/restaurants", bg: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=90" },
    { icon: Leaf, label: "Spas", sub: "Wellness & relax", href: "/spas", bg: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=90" },
  ];

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">

        {/* Hero Carousel */}
        <HeroCarousel userName={firstName} />

        {/* Search bar */}
        <button
          onClick={() => navigate("/search")}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow text-left"
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">{t("search_placeholder")}</span>
          <div className="bg-primary/10 rounded-full p-1">
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          </div>
        </button>

        {/* Top Rated Hotels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              <h2 className="text-sm font-semibold">{t("top_hotels")}</h2>
            </div>
            <Link href="/hotels" className="text-xs text-primary font-medium flex items-center gap-0.5">
              {t("see_all")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {hotelsLoading ? (
            <HorizontalSkeletonRow />
          ) : topHotels.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {topHotels.map((h) => <HotelCard key={h.id} hotel={h} />)}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-xl">
              {t("no_hotels_yet")}
            </div>
          )}
        </div>

        {/* Popular Restaurants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold">{t("popular_restaurants")}</h2>
            </div>
            <Link href="/restaurants" className="text-xs text-primary font-medium flex items-center gap-0.5">
              {t("see_all")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {restaurantsLoading ? (
            <HorizontalSkeletonRow />
          ) : topRestaurants.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {topRestaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-xl">
              {t("no_restaurants_yet")}
            </div>
          )}
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

        {/* Explore Agra category grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Explore Agra</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, sub, href, bg }) => {
              const tile = (
                <div
                  key={label}
                  className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg group cursor-pointer active:scale-[0.97] transition-transform duration-150"
                >
                  <img
                    src={bg}
                    alt={label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
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
                <Badge
                  variant={ownerRequest.status === "approved" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
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
