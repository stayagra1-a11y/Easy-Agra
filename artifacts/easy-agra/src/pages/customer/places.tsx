import { useState, useCallback } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useListTouristPlaces } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, TicketIcon, Star, Search, ChevronRight } from "lucide-react";

function useDebouncedValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  const handler = useCallback(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  useState(handler);
  return debounced;
}

export default function CustomerPlaces() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useListTouristPlaces({
    search: debouncedSearch || undefined,
    limit: 30,
  });

  const places = data?.places ?? [];

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Tourist Places</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore Agra's magnificent heritage sites</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tourist places..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && places.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-lg">No places found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try a different search term." : "Tourist places haven't been added yet."}
            </p>
          </div>
        )}

        {/* Place cards */}
        {!isLoading && places.length > 0 && (
          <div className="space-y-4">
            {places.map((place) => {
              const coverImg = (place as any).coverImageUrl ||
                (place as any).images?.[0]?.imageUrl;
              const ticketIndian = (place as any).ticketPriceIndian;
              const isFree = ticketIndian !== null && Number(ticketIndian) === 0;

              return (
                <Link key={place.id} href={`/places/${place.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer">
                    {/* Image */}
                    <div className="relative h-44 bg-muted">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}
                      {place.isFeatured && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-accent text-accent-foreground text-xs gap-1">
                            <Star className="h-3 w-3 fill-current" /> Must Visit
                          </Badge>
                        </div>
                      )}
                      {isFree && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500 text-white text-xs">Free Entry</Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-base">{place.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {place.city}, {place.state}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      </div>

                      {place.shortDescription && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {place.shortDescription}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        {place.openingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {place.openingTime} – {place.closingTime}
                          </span>
                        )}
                        {ticketIndian !== null && (
                          <span className="flex items-center gap-1">
                            <TicketIcon className="h-3.5 w-3.5" />
                            {isFree ? "Free" : `₹${ticketIndian} Indian`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
