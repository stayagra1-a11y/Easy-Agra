import { Link, useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { imgUrl } from "@/lib/cloudinary";
import {
  useGetMyFavoritePlaces,
  useToggleTouristPlaceFavorite,
  getGetMyFavoritePlacesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MapPin, Clock, TicketIcon, Star, ChevronRight, ArrowLeft } from "lucide-react";

export default function MyPlaces() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetMyFavoritePlaces();
  const toggleFav = useToggleTouristPlaceFavorite();

  const places = (data?.places ?? []) as any[];

  const handleRemove = (e: React.MouseEvent, placeId: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav.mutate({ id: placeId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyFavoritePlacesQueryKey() });
      },
    });
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/places")}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Saved Places</h1>
            <p className="text-sm text-muted-foreground">Your personal travel wishlist</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && places.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Heart className="h-10 w-10 text-primary/40" />
            </div>
            <p className="font-bold text-lg">No saved places yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Tap the heart icon on any tourist place to save it to your wishlist.
            </p>
            <Button className="mt-5" onClick={() => navigate("/places")}>
              Explore Places
            </Button>
          </div>
        )}

        {/* Place cards */}
        {!isLoading && places.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{places.length} saved place{places.length !== 1 ? "s" : ""}</p>
            {places.map((place) => {
              const coverImg = place.coverImageUrl || place.images?.[0]?.imageUrl;
              const ticketIndian = place.ticketPriceIndian;
              const isFree = ticketIndian !== null && Number(ticketIndian) === 0;

              return (
                <Link key={place.id} href={`/places/${place.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer">
                    <div className="relative h-44 bg-muted">
                      {coverImg ? (
                        <img
                          src={imgUrl(coverImg, 600)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
                      {/* Remove heart */}
                      <button
                        onClick={(e) => handleRemove(e, place.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-red-500 text-white transition-colors"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </div>
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
