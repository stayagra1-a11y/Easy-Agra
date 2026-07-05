import { useState } from "react";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { imgUrl } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api-request";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BedDouble, MapPin, Search, Star, IndianRupee, Navigation, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Hotel {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  category: string | null;
  pricePerNight: number | null;
  rating: string | null;
  reviewCount: number;
  coverImage: string | null;
  galleryImages: string[] | null;
  categorizedPhotos: { url: string; category: string }[] | null;
  amenities: string[];
  status: string;
  policies: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
}

function HotelPhotoCarousel({ hotel }: { hotel: Hotel }) {
  const [idx, setIdx] = useState(0);

  const photos: string[] = [
    ...(hotel.categorizedPhotos ?? []).map((p) => p.url),
    ...(hotel.galleryImages ?? []),
    ...(hotel.coverImage ? [hotel.coverImage] : []),
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  if (!photos.length) return (
    <div className="h-44 bg-muted flex items-center justify-center">
      <BedDouble className="h-10 w-10 text-muted-foreground" />
    </div>
  );

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % photos.length);
  };

  return (
    <div className="relative h-44 overflow-hidden bg-black">
      <img
        src={imgUrl(photos[idx], 600)}
        alt="Hotel photo"
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {photos.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 items-center">
            {photos.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all ${i === idx ? "w-3.5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            <Images className="h-3 w-3" />
            {idx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}

interface HotelListResult {
  hotels: Hotel[];
  total: number;
  page: number;
  limit: number;
}

export default function CustomerHotels() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("status", "approved");
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "12");

  const { data, isLoading } = useQuery({
    queryKey: ["hotels-browse", search, page],
    queryFn: (): Promise<HotelListResult> => apiRequest(`/api/hotels?${params.toString()}`),
    staleTime: 30_000,
  });

  const hotels = data?.hotels ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  function doSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div
          className="relative bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5 overflow-hidden"
          style={{ minHeight: 110 }}
        >
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center rounded-2xl"
            style={{ backgroundImage: "url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80)" }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <BedDouble className="h-5 w-5 text-accent" />
              <span className="text-accent font-medium text-sm">Stay</span>
            </div>
            <h1 className="text-xl font-bold">Hotels in Agra</h1>
            <p className="text-white/70 text-sm mt-1">Find the perfect stay near the Taj Mahal</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search hotels..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
          </div>
          <Button onClick={doSearch} size="sm" className="px-4">Search</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hotels.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-2">
              <BedDouble className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No hotels found</p>
              <p className="text-sm text-muted-foreground">
                {search ? "Try a different search term" : "No hotels available yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{total} hotel{total !== 1 ? "s" : ""} found</p>
            <div className="space-y-3">
              {hotels.map((hotel) => (
                <Card
                  key={hotel.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/hotels/${hotel.id}`)}
                >
                  <HotelPhotoCarousel hotel={hotel} />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-base leading-tight">{hotel.name}</h2>
                        {(hotel as any).starRating && (hotel as any).starRating > 0 && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array.from({ length: (hotel as any).starRating }).map((_: unknown, i: number) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        )}
                        {hotel.category && (
                          <Badge variant="secondary" className="text-xs mt-1">{hotel.category}</Badge>
                        )}
                      </div>
                      {parseFloat(hotel.rating ?? "0") > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold">{parseFloat(hotel.rating!).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({hotel.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    {hotel.city && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{hotel.city}</span>
                      </div>
                    )}
                    {hotel.description && (
                      <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">About</p>
                        <p className="text-xs text-white leading-snug line-clamp-2">{hotel.description}</p>
                      </div>
                    )}

                    {/* Check-in / Check-out times */}
                    {(hotel.checkInTime || hotel.checkOutTime) && (
                      <div className="flex gap-2 flex-wrap">
                        {hotel.checkInTime && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg px-2 py-1">
                            ✓ In: {hotel.checkInTime}
                          </span>
                        )}
                        {hotel.checkOutTime && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold bg-rose-600 text-white rounded-lg px-2 py-1">
                            ✓ Out: {hotel.checkOutTime}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Policy preview — first 2 items */}
                    {hotel.policies && (() => {
                      const items = hotel.policies!
                        .split(/\s*[-–]\s+/)
                        .map(s => s.trim())
                        .filter(Boolean)
                        .slice(0, 2);
                      return (
                        <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 space-y-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              <p className="text-xs text-muted-foreground leading-snug line-clamp-1">{item}</p>
                            </div>
                          ))}
                          <p className="text-[10px] text-primary font-medium pl-6">+ more policies on detail page</p>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {hotel.pricePerNight && (
                        <div className="flex items-center gap-0.5 text-sm font-semibold text-primary">
                          <IndianRupee className="h-3.5 w-3.5" />
                          <span>{hotel.pricePerNight.toLocaleString("en-IN")}</span>
                          <span className="text-xs font-normal text-muted-foreground">/night</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const q = encodeURIComponent([hotel.name, hotel.address, hotel.city, "Agra"].filter(Boolean).join(", "));
                            window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
                          }}
                          className="flex items-center gap-1 text-xs text-[#4285F4] font-medium border border-[#4285F4]/30 rounded-full px-2.5 py-1 hover:bg-[#4285F4]/5 transition-colors"
                        >
                          <Navigation className="h-3 w-3" /> Map
                        </button>
                        <Button size="sm" className="h-7 text-xs">{t("book_now")}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
