import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { imgUrl } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api-request";
import { Loader2, Sparkles, MapPin, Search, Clock, Star } from "lucide-react";

interface Spa {
  id: number;
  name: string;
  city: string;
  address: string;
  description: string | null;
  priceRange: string | null;
  openingTime: string | null;
  closingTime: string | null;
  rating: string | null;
  reviewCount: number;
  coverPhoto: string | null;
  facilities: string[];
}

interface SpaBrowseResult {
  spas: Spa[];
  total: number;
  page: number;
  limit: number;
}

export default function CustomerSpas() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__spaSearchTimer);
    (window as any).__spaSearchTimer = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 400);
  };

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  params.set("page", String(page));
  params.set("limit", "12");

  const { data, isLoading } = useQuery({
    queryKey: ["spas-browse", debouncedSearch, page],
    queryFn: (): Promise<SpaBrowseResult> => apiRequest(`/api/spas/browse?${params.toString()}`),
    staleTime: 30_000,
  });

  const spas = data?.spas ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <CustomerLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-accent font-medium text-sm">Wellness</span>
          </div>
          <h1 className="text-xl font-bold">Spa & Wellness</h1>
          <p className="text-white/70 text-sm mt-1">
            Discover relaxing spas in Agra
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search spas..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : spas.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center space-y-2">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="font-medium">No spas found</p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Try a different search term" : "No spas available yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{total} spa{total !== 1 ? "s" : ""} found</p>
            <div className="space-y-3">
              {spas.map((spa) => (
                <Card
                  key={spa.id}
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/spas/${spa.id}`)}
                >
                  {spa.coverPhoto && (
                    <div className="h-36 overflow-hidden">
                      <img
                        src={imgUrl(spa.coverPhoto, 600)}
                        alt={spa.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-base leading-tight">{spa.name}</h2>
                      {(parseFloat(spa.rating ?? "0") > 0) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold">{parseFloat(spa.rating!).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({spa.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{spa.city}</span>
                    </div>
                    {spa.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{spa.description}</p>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {spa.openingTime && spa.closingTime && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {spa.openingTime} – {spa.closingTime}
                          </span>
                        )}
                        {spa.priceRange && (
                          <Badge variant="secondary" className="text-xs">
                            {spa.priceRange}
                          </Badge>
                        )}
                      </div>
                      <Button size="sm" className="h-7 text-xs">
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
