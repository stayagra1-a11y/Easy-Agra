import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useListRestaurants } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Utensils,
  MapPin,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  suspended: "bg-orange-100 text-orange-800 border-orange-200",
  deleted: "bg-red-100 text-red-700 border-red-200",
};

export default function AdminRestaurants() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [page, setPage] = useState(1);

  const listQuery = useListRestaurants({
    search: search || undefined,
    cuisine: cuisine !== "all" ? cuisine : undefined,
    page,
    limit: 15,
  });

  const restaurants = listQuery.data?.restaurants ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  function doSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const active = restaurants.filter((r) => r.status === "active").length;

  return (
    <AdminLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Restaurants</h1>
            <p className="text-sm text-muted-foreground">All registered restaurants on the platform</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{active}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{total - active}</div>
              <div className="text-xs text-muted-foreground">Other</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={doSearch} className="bg-primary flex-shrink-0">Search</Button>
        </div>

        {/* List */}
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Utensils className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No restaurants found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <Card key={r.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {r.coverPhoto ? (
                    <div className="h-28 overflow-hidden">
                      <img src={r.coverPhoto} alt={r.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-16 bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-center">
                      <Utensils className="w-6 h-6 text-primary/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-foreground">{r.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          {r.cuisineType && <span className="text-primary font-medium">{r.cuisineType}</span>}
                          {r.cuisineType && r.city && <span>·</span>}
                          {r.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {r.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_COLORS[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
                      <span className="text-muted-foreground/60">ID #{r.id}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
    </AdminLayout>
  );
}
