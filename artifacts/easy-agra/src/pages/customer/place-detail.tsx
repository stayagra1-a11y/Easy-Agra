import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useGetTouristPlace } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Clock, TicketIcon, Star, ChevronLeft, Train, Plane,
  Lightbulb, Info, History, Navigation, ChevronLeft as Left, ChevronRight as Right,
  ExternalLink,
} from "lucide-react";

export default function PlaceDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const placeId = parseInt(params.id);
  const [activeImg, setActiveImg] = useState(0);

  const { data: place, isLoading } = useGetTouristPlace(placeId);

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
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
    (a: any, b: any) => a.sortOrder - b.sortOrder,
  );
  const tips = ((place as any).tips ?? []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const distances = (place as any).distances ?? [];

  const currentImg = images[activeImg];
  const ticketIndian = (place as any).ticketPriceIndian;
  const ticketForeign = (place as any).ticketPriceForeign;
  const ticketChild = (place as any).ticketPriceChild;
  const isFree = ticketIndian !== null && Number(ticketIndian) === 0 && Number(ticketForeign ?? 0) === 0;

  const locationIcon = (type: string) => {
    if (type === "airport") return Plane;
    return Train;
  };

  return (
    <CustomerLayout>
      <div className="pb-6">
        {/* Back */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate("/places")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Places
          </button>
        </div>

        {/* Image Gallery */}
        <div className="relative bg-muted">
          {images.length > 0 ? (
            <>
              <div className="relative h-64 sm:h-80">
                <img
                  src={currentImg?.imageUrl}
                  alt={currentImg?.caption ?? place.name}
                  className="w-full h-full object-cover"
                  key={currentImg?.id}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {currentImg?.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <p className="text-white text-xs">{currentImg.caption}</p>
                  </div>
                )}
                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                    >
                      <Left className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setActiveImg((prev) => (prev + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                    >
                      <Right className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-1.5 px-4 py-2 overflow-x-auto">
                  {images.map((img: any, idx: number) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImg(idx)}
                      className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                        idx === activeImg ? "border-primary" : "border-transparent opacity-60"
                      }`}
                    >
                      <img
                        src={img.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <MapPin className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="px-4 space-y-5 mt-4">
          {/* Title & badges */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold leading-tight">{place.name}</h1>
              {place.isFeatured && (
                <Badge className="bg-accent text-accent-foreground shrink-0 gap-1">
                  <Star className="h-3 w-3 fill-current" /> Must Visit
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {place.city}, {place.state}
            </p>
            {place.shortDescription && (
              <p className="text-sm text-muted-foreground mt-2 italic">{place.shortDescription}</p>
            )}
          </div>

          {/* Quick info cards */}
          <div className="grid grid-cols-2 gap-3">
            {place.openingTime && (
              <Card className="border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Timings</span>
                  </div>
                  <p className="text-sm font-medium">{place.openingTime} – {place.closingTime}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Closed Fridays (Taj Mahal)</p>
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
                      <p className="text-xs">Indian: <strong>₹{Number(ticketIndian) === 0 ? "Free" : ticketIndian}</strong></p>
                    )}
                    {ticketForeign != null && (
                      <p className="text-xs">Foreign: <strong>₹{ticketForeign}</strong></p>
                    )}
                    {ticketChild != null && (
                      <p className="text-xs">Child: <strong>{Number(ticketChild) === 0 ? "Free" : `₹${ticketChild}`}</strong></p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Best time */}
          {place.bestTimeToVisit && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Star className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Best Time to Visit</span>
                </div>
                <p className="text-sm">{place.bestTimeToVisit}</p>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {place.description && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Info className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">About</h2>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{place.description}</p>
            </div>
          )}

          {/* Historical info */}
          {place.historicalInfo && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <History className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Historical Background</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{place.historicalInfo}</p>
            </div>
          )}

          {/* Visitor Tips */}
          {tips.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Lightbulb className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">Visitor Tips</h2>
              </div>
              <div className="space-y-2">
                {tips.map((tip: any) => (
                  <div key={tip.id} className="flex gap-3 items-start bg-muted/50 rounded-lg p-3">
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

          {/* Distance info */}
          {distances.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Navigation className="h-4 w-4" />
                <h2 className="font-semibold text-sm uppercase tracking-wide">How to Reach</h2>
              </div>
              <div className="space-y-2">
                {distances.map((dist: any) => {
                  const Icon = locationIcon(dist.locationType);
                  return (
                    <div key={dist.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{dist.fromLocation}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {dist.locationType.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {dist.distanceKm && (
                          <p className="text-sm font-bold">{dist.distanceKm} km</p>
                        )}
                        {dist.estimatedTimeMinutes && (
                          <p className="text-xs text-muted-foreground">~{dist.estimatedTimeMinutes} min</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google Maps */}
          {place.googleMapsLink && (
            <a
              href={place.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full gap-2">
                <MapPin className="h-4 w-4" />
                Open in Google Maps
                <ExternalLink className="h-3.5 w-3.5 ml-auto" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
