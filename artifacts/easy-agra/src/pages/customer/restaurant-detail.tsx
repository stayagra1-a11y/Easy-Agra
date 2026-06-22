import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import { imgUrl } from "@/lib/cloudinary";
import { useGetRestaurant, useGetRestaurantMenu } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  Leaf,
  Drumstick,
  Star,
  CalendarCheck,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "starters", label: "Starters" },
  { value: "main_course", label: "Main Course" },
  { value: "fast_food", label: "Fast Food" },
  { value: "desserts", label: "Desserts" },
  { value: "beverages", label: "Beverages" },
];

const CATEGORY_COLORS: Record<string, string> = {
  starters: "bg-orange-100 text-orange-700",
  main_course: "bg-teal-100 text-teal-700",
  fast_food: "bg-red-100 text-red-700",
  desserts: "bg-pink-100 text-pink-700",
  beverages: "bg-blue-100 text-blue-700",
};

export default function RestaurantDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const restaurantQuery = useGetRestaurant(id);
  const menuQuery = useGetRestaurantMenu(id);

  const r = restaurantQuery.data;
  const allMenuItems = menuQuery.data ?? [];
  const filtered = activeCategory === "all"
    ? allMenuItems
    : allMenuItems.filter((i) => i.category === activeCategory);

  const vegItems = allMenuItems.filter((i) => i.isVeg).length;
  const nonVegItems = allMenuItems.filter((i) => !i.isVeg).length;

  if (restaurantQuery.isLoading) {
    return (
      <CustomerLayout>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!r) {
    return (
      <CustomerLayout>
        <div className="p-4 text-center py-16">
          <p className="text-muted-foreground">Restaurant not found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/restaurants")}>
            Back to Restaurants
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const gallery = Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [];

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-28">
        {/* Back + Share */}
        <div className="p-4 pb-0 flex items-center justify-between">
          <button onClick={() => navigate("/restaurants")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back to Restaurants
          </button>
          <button
            onClick={() => {
              const text = encodeURIComponent(`Yeh restaurant dekho: ${r.name} — ${window.location.href}`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] border border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/15 rounded-full px-3 py-1.5 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp pe share karo
          </button>
        </div>

        {/* Cover */}
        {r.coverPhoto ? (
          <div className="h-56 overflow-hidden">
            <img src={imgUrl(r.coverPhoto, 1000)} alt={r.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Restaurant info */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">{r.name}</h1>
              <Badge variant="outline" className={`text-xs ${r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600"}`}>
                {r.status}
              </Badge>
            </div>
            {r.cuisineType && (
              <Badge variant="outline" className="mt-1 bg-primary/5 text-primary border-primary/20">
                {r.cuisineType}
              </Badge>
            )}
          </div>

          {r.description && (
            <p className="text-sm text-muted-foreground">{r.description}</p>
          )}

          {/* Details card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              {(r.address || r.city) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">
                    {[r.address, r.city, r.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {r.openingTime && r.closingTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/80">{r.openingTime} – {r.closingTime}</span>
                </div>
              )}
              {r.contactNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${r.contactNumber}`} className="text-primary">{r.contactNumber}</a>
                </div>
              )}
              {r.contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${r.contactEmail}`} className="text-primary">{r.contactEmail}</a>
                </div>
              )}
              {r.seatingCapacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/80">{r.seatingCapacity} seating capacity</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <MapEmbed
            name={r.name}
            address={r.address}
            city={r.city}
          />

          {/* Gallery */}
          {gallery.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Gallery</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((p, i) => (
                  <div key={i} className="flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden border">
                    <img src={imgUrl(p, 400)} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Menu</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {vegItems > 0 && <span className="flex items-center gap-0.5 text-green-700"><Leaf className="w-3 h-3" />{vegItems} veg</span>}
                {nonVegItems > 0 && <span className="flex items-center gap-0.5 text-red-700"><Drumstick className="w-3 h-3" />{nonVegItems} non-veg</span>}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {CATEGORIES.map((c) => {
                const count = c.value === "all" ? allMenuItems.length : allMenuItems.filter((i) => i.category === c.value).length;
                if (c.value !== "all" && count === 0) return null;
                return (
                  <button
                    key={c.value}
                    onClick={() => setActiveCategory(c.value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === c.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {c.label} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {menuQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No items in this category</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <Card key={item.id} className={`border-0 shadow-sm overflow-hidden ${!item.isAvailable ? "opacity-60" : ""}`}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.itemPhoto ? (
                          <img src={imgUrl(item.itemPhoto, 200)} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            {item.isVeg ? <Leaf className="w-6 h-6 text-green-600" /> : <Drumstick className="w-6 h-6 text-red-600" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm">{item.name}</span>
                                {item.isVeg
                                  ? <span className="w-3 h-3 border border-green-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-600"></span></span>
                                  : <span className="w-3 h-3 border border-red-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span></span>
                                }
                                {!item.isAvailable && <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1">Unavailable</span>}
                              </div>
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] ?? "bg-muted text-muted-foreground"}`}>
                                {CATEGORIES.find((c) => c.value === item.category)?.label}
                              </span>
                            </div>
                            <div className="font-bold text-primary flex-shrink-0">₹{typeof item.price === "number" ? item.price.toFixed(2) : item.price}</div>
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reserve CTA + WhatsApp share */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t max-w-lg mx-auto">
          <div className="flex gap-3 items-center">
            {r.status === "active" && user?.role === "customer" && (
              <Link href={`/reservations/new?restaurantId=${r.id}`} className="flex-1">
                <Button className="w-full h-12 bg-primary text-base font-semibold">
                  <CalendarCheck className="w-5 h-5 mr-2" />
                  Reserve a Table
                </Button>
              </Link>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Yeh restaurant dekho: ${r.name} — ${window.location.origin}/restaurants/${id}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-full border-2 border-[#25D366] text-[#25D366] bg-white text-sm font-semibold hover:bg-[#25D366]/5 transition-colors whitespace-nowrap shrink-0"
            >
              <svg className="h-4 w-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp pe share karo
            </a>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
