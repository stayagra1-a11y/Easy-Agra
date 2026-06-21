import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import {
  useListHotels,
  useListRestaurants,
  useGetAllSpas,
  useListTouristPlaces,
} from "@workspace/api-client-react";
import { imgUrl } from "@/lib/cloudinary";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  BedDouble,
  UtensilsCrossed,
  Leaf,
  Landmark,
  MapPin,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";

function useSearchQuery() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") || "";
  const setQ = (val: string) => {
    setLocation(`/search?q=${encodeURIComponent(val)}`);
  };
  return { q, setQ };
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  href,
  color,
}: {
  icon: any;
  label: string;
  count: number;
  href: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
          {count}
        </Badge>
      </div>
      <Link href={href} className="text-xs text-primary font-medium flex items-center gap-0.5">
        Sab dekho <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function HotelCard({ hotel }: { hotel: any }) {
  return (
    <Link href={`/hotels/${hotel.id}`}>
      <div className="flex gap-3 p-3 bg-white rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {hotel.coverImage ? (
            <img src={imgUrl(hotel.coverImage, 200)} alt={hotel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BedDouble className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{hotel.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {hotel.city}
          </p>
          {hotel.pricePerNight && (
            <p className="text-xs font-medium text-primary mt-1">
              ₹{Number(hotel.pricePerNight).toLocaleString("en-IN")}/raat
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </div>
    </Link>
  );
}

function PlaceCard({ place }: { place: any }) {
  const cover = place.coverImageUrl || place.images?.[0]?.imageUrl;
  return (
    <Link href={`/places/${place.id}`}>
      <div className="flex gap-3 p-3 bg-white rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {cover ? (
            <img src={imgUrl(cover, 200)} alt={place.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Landmark className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{place.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {place.city}
          </p>
          {place.ticketPriceIndian !== null && place.ticketPriceIndian !== undefined && (
            <p className="text-xs font-medium text-primary mt-1">
              {Number(place.ticketPriceIndian) === 0 ? "Free Entry" : `₹${Number(place.ticketPriceIndian)} Indian`}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </div>
    </Link>
  );
}

function RestaurantCard({ restaurant }: { restaurant: any }) {
  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="flex gap-3 p-3 bg-white rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {restaurant.coverPhoto ? (
            <img src={imgUrl(restaurant.coverPhoto, 200)} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{restaurant.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {restaurant.city}
          </p>
          {restaurant.cuisineType && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 mt-1">{restaurant.cuisineType}</Badge>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </div>
    </Link>
  );
}

function SpaCard({ spa }: { spa: any }) {
  return (
    <Link href={`/spas/${spa.id}`}>
      <div className="flex gap-3 p-3 bg-white rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {spa.coverPhoto ? (
            <img src={imgUrl(spa.coverPhoto, 200)} alt={spa.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Leaf className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-1">{spa.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {spa.city}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-border">
      <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { q, setQ } = useSearchQuery();
  const [inputVal, setInputVal] = useState(q);

  useEffect(() => {
    setInputVal(q);
  }, [q]);

  const searchTerm = q.trim().length >= 2 ? q.trim() : undefined;

  const { data: hotelsData, isLoading: hotelsLoading } = useListHotels({ search: searchTerm, limit: 5 });
  const { data: placesData, isLoading: placesLoading } = useListTouristPlaces({ search: searchTerm, limit: 5 });
  const { data: restaurantsData, isLoading: restaurantsLoading } = useListRestaurants({ search: searchTerm, limit: 5 });
  const { data: spasData, isLoading: spasLoading } = useGetAllSpas({ search: searchTerm, limit: 5 });

  const hotels = hotelsData?.hotels ?? [];
  const places = placesData?.places ?? [];
  const restaurants = restaurantsData?.restaurants ?? [];
  const spas = spasData?.spas ?? [];

  const isLoading = hotelsLoading || placesLoading || restaurantsLoading || spasLoading;
  const totalResults = hotels.length + places.length + restaurants.length + spas.length;
  const hasResults = totalResults > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) setQ(inputVal.trim());
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-4 space-y-5">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={() => { if (inputVal.trim() && inputVal !== q) setQ(inputVal.trim()); }}
              placeholder="Hotel, jagah, restaurant dhundho..."
              className="pl-9 pr-9 bg-muted border-0 rounded-full text-sm"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => { setInputVal(""); setQ(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </form>

        {/* Empty state — before search */}
        {!q.trim() && (
          <div className="text-center py-16">
            <Search className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold text-base">Kuch dhundho</p>
            <p className="text-sm text-muted-foreground mt-1">Hotel, jagah, restaurant ya spa ka naam likhein</p>
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              {["Taj Mahal", "Hotel", "Biryani", "Massage"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInputVal(s); setQ(s); }}
                  className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Too short */}
        {q.trim().length === 1 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Aur likho...
          </div>
        )}

        {/* Loading */}
        {searchTerm && isLoading && (
          <div className="space-y-5">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                {[1, 2].map((i) => <CardSkeleton key={i} />)}
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {searchTerm && !isLoading && !hasResults && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold">Koi result nahi mila</p>
            <p className="text-sm text-muted-foreground mt-1">
              "<span className="font-medium">{q}</span>" ke liye kuch nahi mila
            </p>
          </div>
        )}

        {/* Results */}
        {searchTerm && !isLoading && hasResults && (
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              "<strong>{q}</strong>" ke liye {totalResults} result mila
            </p>

            {/* Tourist Places */}
            {places.length > 0 && (
              <div>
                <SectionHeader icon={Landmark} label="Famous Jagahen" count={places.length} href="/places" color="bg-amber-500" />
                <div className="space-y-2">
                  {places.slice(0, 4).map((p) => <PlaceCard key={p.id} place={p} />)}
                </div>
              </div>
            )}

            {/* Hotels */}
            {hotels.length > 0 && (
              <div>
                <SectionHeader icon={BedDouble} label="Hotels" count={hotels.length} href="/hotels" color="bg-blue-500" />
                <div className="space-y-2">
                  {hotels.slice(0, 4).map((h) => <HotelCard key={h.id} hotel={h} />)}
                </div>
              </div>
            )}

            {/* Restaurants */}
            {restaurants.length > 0 && (
              <div>
                <SectionHeader icon={UtensilsCrossed} label="Restaurants" count={restaurants.length} href="/restaurants" color="bg-orange-500" />
                <div className="space-y-2">
                  {restaurants.slice(0, 4).map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                </div>
              </div>
            )}

            {/* Spas */}
            {spas.length > 0 && (
              <div>
                <SectionHeader icon={Leaf} label="Spas" count={spas.length} href="/spas" color="bg-green-500" />
                <div className="space-y-2">
                  {spas.slice(0, 4).map((s) => <SpaCard key={s.id} spa={s} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
