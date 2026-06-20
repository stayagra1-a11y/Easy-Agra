import { useState } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useListRestaurants } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Utensils,
  MapPin,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

const CUISINE_TYPES = [
  "All", "North Indian", "South Indian", "Chinese", "Continental",
  "Italian", "Fast Food", "Mughlai", "Seafood", "Cafe",
];

export default function CustomerRestaurants() {
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");

  const listQuery = useListRestaurants({
    search: search || undefined,
    cuisine: cuisine !== "All" ? cuisine : undefined,
    page,
    limit: 12,
  });

  const restaurants = listQuery.data?.restaurants ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  function doSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function selectCuisine(c: string) {
    setCuisine(c);
    setPage(1);
  }

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Restaurants</h1>
          <p className="text-sm text-muted-foreground">Discover great dining in Agra</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={doSearch} className="bg-primary">Search</Button>
        </div>

        {/* Cuisine filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CUISINE_TYPES.map((c) => (
            <button
              key={c}
              onClick={() => selectCuisine(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                cuisine === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!listQuery.isLoading && (
          <p className="text-xs text-muted-foreground">{total} restaurant{total !== 1 ? "s" : ""} found</p>
        )}

        {/* Restaurant list */}
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Utensils className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No restaurants found</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setSearchInput(""); setCuisine("All"); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <Link key={r.id} href={`/restaurants/${r.id}`}>
                <Card className="border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    {/* Cover */}
                    {r.coverPhoto ? (
                      <div className="h-40 overflow-hidden">
                        <img src={r.coverPhoto} alt={r.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <Utensils className="w-8 h-8 text-primary/30" />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{r.name}</h3>
                      </div>

                      {r.cuisineType && (
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 mb-2">
                          {r.cuisineType}
                        </Badge>
                      )}

                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {r.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {r.city}
                          </span>
                        )}
                        {r.openingTime && r.closingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {r.openingTime} – {r.closingTime}
                          </span>
                        )}
                        {r.seatingCapacity && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {r.seatingCapacity} seats
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <Button size="sm" className="h-8 text-xs bg-primary">
                          View Menu & Reserve
                        </Button>
                        <span className="text-xs text-emerald-600 font-medium">Open Now</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
