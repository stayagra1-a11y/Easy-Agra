import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
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
        {/* Back */}
        <div className="p-4 pb-0">
          <button onClick={() => navigate("/restaurants")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Restaurants
          </button>
        </div>

        {/* Cover */}
        {r.coverPhoto ? (
          <div className="h-56 overflow-hidden">
            <img src={r.coverPhoto} alt={r.name} className="w-full h-full object-cover" />
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
                    <img src={p} alt="" className="w-full h-full object-cover" />
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
                          <img src={item.itemPhoto} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border" />
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

        {/* Reserve CTA */}
        {r.status === "active" && user?.role === "customer" && (
          <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t max-w-lg mx-auto">
            <Link href={`/reservations/new?restaurantId=${r.id}`}>
              <Button className="w-full h-12 bg-primary text-base font-semibold">
                <CalendarCheck className="w-5 h-5 mr-2" />
                Reserve a Table
              </Button>
            </Link>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
