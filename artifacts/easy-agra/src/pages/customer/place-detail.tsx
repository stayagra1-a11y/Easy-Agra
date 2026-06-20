import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import {
  useGetTouristPlace,
  useToggleTouristPlaceFavorite,
  useGetMyFavoritePlaces,
  useGetNearbyRecommendations,
  useGetPlaceConnections,
  getGetMyFavoritePlacesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PlaceGallery } from "@/components/ui/place-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Clock, TicketIcon, Star, ChevronLeft, Train, Plane, Bus,
  Lightbulb, Info, History, Navigation, ExternalLink, Heart,
  Compass, Hotel, Utensils, Sparkles, ArrowRight, Route,
} from "lucide-react";

// ── Haversine distance ──────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GPS hook ────────────────────────────────────────────────────────────
function useGeolocation() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLoading(false);
      },
      () => {
        setError("Location access denied");
        setLoading(false);
      },
      { timeout: 8000 },
    );
  }, []);

  return { pos, error, loading };
}

// ── Location icon ───────────────────────────────────────────────────────
function LocationIcon({ type }: { type: string }) {
  if (type === "airport") return <Plane className="h-4 w-4 text-primary" />;
  if (type === "bus_stand") return <Bus className="h-4 w-4 text-primary" />;
  return <Train className="h-4 w-4 text-primary" />;
}

export default function PlaceDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const placeId = parseInt(params.id);
  const [isFavorited, setIsFavorited] = useState(false);
  const favInitialized = useRef(false);

  const { data: place, isLoading } = useGetTouristPlace(placeId);
  const { data: favData } = useGetMyFavoritePlaces();
  const { data: nearbyData } = useGetNearbyRecommendations(placeId, {
    query: { enabled: !isNaN(placeId) } as any,
  });
  const { data: connectionsData } = useGetPlaceConnections(placeId, {
    query: { enabled: !isNaN(placeId) } as any,
  });
  const toggleFav = useToggleTouristPlaceFavorite();
  const { pos: gpsPos, loading: gpsLoading } = useGeolocation();

  // Init favorited state from my-favorites list
  useEffect(() => {
    if (favData && !favInitialized.current) {
      const ids = (favData.places ?? []).map((p: any) => p.id);
      setIsFavorited(ids.includes(placeId));
      favInitialized.current = true;
    }
  }, [favData, placeId]);

  const handleToggleFav = () => {
    setIsFavorited((v) => !v);
    toggleFav.mutate({ id: placeId }, {
      onSuccess: (data) => {
        setIsFavorited(data.isFavorited);
        queryClient.invalidateQueries({ queryKey: getGetMyFavoritePlacesQueryKey() });
      },
      onError: () => setIsFavorited((v) => !v),
    });
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <div className="px-4 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!place) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-bold text-lg">Place not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/places")}>
            Back to Places
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const images = ((place as any).images ?? []).sort(
    (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const tips = ((place as any).tips ?? []).sort(
    (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const distances = (place as any).distances ?? [];
  const connections = (connectionsData?.connections ?? []) as any[];
  const nearby = nearbyData;

  const lat = (place as any).latitude ? parseFloat(String((place as any).latitude)) : null;
  const lng = (place as any).longitude ? parseFloat(String((place as any).longitude)) : null;

  const gpsDistance =
    gpsPos && lat && lng ? haversineKm(gpsPos.lat, gpsPos.lng, lat, lng) : null;
  const estimatedDriveMin = gpsDistance ? Math.round((gpsDistance / 30) * 60) : null;

  const ticketIndian = (place as any).ticketPriceIndian;
  const ticketForeign = (place as any).ticketPriceForeign;
  const ticketChild = (place as any).ticketPriceChild;
  const isFree =
    ticketIndian !== null && Number(ticketIndian) === 0 && Number(ticketForeign ?? 0) === 0;

  const mapsUrl = (place as any).googleMapsLink ||
    (lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null);
  const directionsUrl = gpsPos && lat && lng
    ? `https://www.google.com/maps/dir/${gpsPos.lat},${gpsPos.lng}/${lat},${lng}`
    : mapsUrl;

  return (
    <CustomerLayout>
      <div className="pb-10">
        {/* Back button */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={() => navigate("/places")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleToggleFav}
            disabled={toggleFav.isPending}
            className={`p-2 rounded-full transition-all ${
              isFavorited
                ? "bg-red-50 text-red-500"
                : "bg-muted text-muted-foreground hover:text-red-400"
            }`}
            title={isFavorited ? "Remove from saved" : "Save place"}
          >
            <Heart
              className={`h-5 w-5 transition-all ${isFavorited ? "fill-current scale-110" : ""}`}
            />
          </button>
        </div>

        {/* Photo gallery */}
        <PlaceGallery images={images} placeName={place.name} />

        <div className="px-4 space-y-6 mt-5">
          {/* Title + badges */}
          <div>
            <div className="flex items-start gap-2 justify-between">
              <h1 className="text-2xl font-bold leading-tight flex-1">{place.name}</h1>
              {place.isFeatured && (
                <Badge className="bg-accent text-accent-foreground shrink-0 gap-1">
                  <Star className="h-3 w-3 fill-current" /> Must Visit
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {place.address || `${place.city}, ${place.state}`}
            </p>
            {(place as any).shortDescription && (
              <p className="text-sm text-muted-foreground mt-2 italic leading-relaxed">
                {(place as any).shortDescription}
              </p>
            )}
          </div>

          {/* GPS distance widget */}
          {!gpsLoading && gpsDistance !== null && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center">
                    <Compass className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">
                      You are here
                    </p>
                    <p className="text-lg font-bold leading-tight">
                      {gpsDistance < 1
                        ? `${Math.round(gpsDistance * 1000)} m away`
                        : `${gpsDistance.toFixed(1)} km away`}
                    </p>
                    {estimatedDriveMin && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ~{estimatedDriveMin} min by car · {gpsDistance.toFixed(1)} km straight line
                      </p>
                    )}
                  </div>
                  {directionsUrl && (
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs">
                        <Navigation className="h-3.5 w-3.5" />
                        Route
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick info cards */}
          <div className="grid grid-cols-2 gap-3">
            {(place as any).openingTime && (
              <Card className="border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Timings</span>
                  </div>
                  <p className="text-sm font-medium">
                    {(place as any).openingTime} – {(place as any).closingTime}
                  </p>
                  {place.name === "Taj Mahal" && (
                    <p className="text-xs text-destructive mt-0.5">Closed Fridays</p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <TicketIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Entry</span>
                </div>
                {isFree ? (
                  <p className="text-sm font-bold text-green-600">Free Entry</p>
                ) : (
                  <div className="space-y-0.5">
                    {ticketIndian != null && (
                      <p className="text-xs">
                        Indian: <strong>₹{Number(ticketIndian) === 0 ? "Free" : ticketIndian}</strong>
                      </p>
                    )}
                    {ticketForeign != null && (
                      <p className="text-xs">Foreign: <strong>₹{ticketForeign}</strong></p>
                    )}
                    {ticketChild != null && (
                      <p className="text-xs">
                        Child:{" "}
                        <strong>{Number(ticketChild) === 0 ? "Free" : `₹${ticketChild}`}</strong>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Best time */}
          {(place as any).bestTimeToVisit && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Star className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Best Time to Visit
                  </span>
                </div>
                <p className="text-sm">{(place as any).bestTimeToVisit}</p>
              </CardContent>
            </Card>
          )}

          {/* Map */}
          <MapEmbed
            lat={lat}
            lng={lng}
            name={place.name}
            address={(place as any).address}
            city={place.city}
            googleMapLink={(place as any).googleMapsLink}
          />

          {/* About */}
          {(place as any).description && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Info className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">About</h2>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {(place as any).description}
              </p>
            </div>
          )}

          {/* Historical background */}
          {(place as any).historicalInfo && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <History className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">
                  Historical Background
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {(place as any).historicalInfo}
              </p>
            </div>
          )}

          {/* Visitor tips */}
          {tips.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Lightbulb className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Visitor Tips</h2>
              </div>
              <div className="space-y-2">
                {tips.map((tip: any) => (
                  <div
                    key={tip.id}
                    className="flex gap-3 items-start bg-muted/50 rounded-lg p-3"
                  >
                    <div className="mt-0.5 shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lightbulb className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      {tip.category && (
                        <p className="text-xs text-primary font-semibold mb-0.5">{tip.category}</p>
                      )}
                      <p className="text-sm leading-relaxed">{tip.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transport distances — How to Reach */}
          {distances.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Navigation className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">How to Reach</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {distances.map((dist: any) => (
                  <div
                    key={dist.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <LocationIcon type={dist.locationType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{dist.fromLocation}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {dist.locationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {dist.distanceKm != null && (
                        <p className="text-sm font-bold">{dist.distanceKm} km</p>
                      )}
                      {dist.estimatedTimeMinutes != null && (
                        <p className="text-xs text-muted-foreground">
                          ~{dist.estimatedTimeMinutes} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inter-place distance grid */}
          {connections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Route className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">
                  Distances from Here
                </h2>
              </div>
              <div className="space-y-2">
                {connections.map((conn: any) => {
                  const isFrom = conn.fromPlaceId === placeId;
                  const otherName = isFrom ? conn.toPlaceName : conn.fromPlaceName;
                  const otherSlug = isFrom ? conn.toPlaceSlug : conn.fromPlaceSlug;
                  const otherId = isFrom ? conn.toPlaceId : conn.fromPlaceId;
                  return (
                    <Link key={conn.id} href={`/places/${otherId}`}>
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer">
                        <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{otherName}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            {conn.distanceKm != null && (
                              <p className="text-sm font-bold">{conn.distanceKm} km</p>
                            )}
                            {conn.estimatedTimeMinutes != null && (
                              <p className="text-xs text-muted-foreground">
                                ~{conn.estimatedTimeMinutes} min
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nearby recommendations */}
          {nearby && (nearby.hotels.length > 0 || nearby.restaurants.length > 0 || nearby.spas.length > 0) && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Compass className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">
                  Recommended Nearby
                </h2>
                <span className="text-xs text-muted-foreground font-normal">in Agra</span>
              </div>

              {/* Hotels */}
              {nearby.hotels.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hotel className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Hotels
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nearby.hotels.map((h: any) => (
                      <Link key={h.id} href={`/hotels/${h.id}`}>
                        <div className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <div className="h-24 bg-muted relative">
                            {h.imageUrl ? (
                              <img
                                src={h.imageUrl}
                                alt={h.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Hotel className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold line-clamp-2 leading-tight">{h.name}</p>
                            {h.city && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.city}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Restaurants */}
              {nearby.restaurants.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Utensils className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Restaurants
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nearby.restaurants.map((r: any) => (
                      <Link key={r.id} href={`/restaurants/${r.id}`}>
                        <div className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <div className="h-24 bg-muted relative">
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold line-clamp-2 leading-tight">{r.name}</p>
                            {r.city && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.city}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Spas */}
              {nearby.spas.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Spas & Wellness
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nearby.spas.map((s: any) => (
                      <Link key={s.id} href={`/spas/${s.id}`}>
                        <div className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                          <div className="h-24 bg-muted relative">
                            {s.imageUrl ? (
                              <img
                                src={s.imageUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold line-clamp-2 leading-tight">{s.name}</p>
                            {s.city && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.city}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
