import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Sparkles, Users, TrendingUp, Hotel, Utensils, MapPin, BarChart2, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchTripAnalytics() {
  const res = await fetch(`${BASE}/api/admin/trip-analytics`);
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-emerald-100 text-emerald-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-600",
  draft: "bg-gray-100 text-gray-600",
};

const INTEREST_LABELS: Record<string, string> = {
  historical_places: "Historical Places",
  photography: "Photography",
  food_restaurants: "Food & Restaurants",
  shopping: "Shopping",
  family_activities: "Family Activities",
  luxury_experience: "Luxury Experience",
  wellness_spa: "Wellness & Spa",
  religious_places: "Religious Places",
};

const TRAVEL_TYPE_ICONS: Record<string, string> = {
  solo: "🧳",
  couple: "💑",
  family: "👨‍👩‍👧‍👦",
  friends: "👯",
  business: "💼",
};

const BUDGET_COLORS: Record<string, string> = {
  budget: "bg-green-100 text-green-700",
  standard: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  luxury: "bg-amber-100 text-amber-700",
};

export default function AdminTripAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["/admin/trip-analytics"],
    queryFn: fetchTripAnalytics,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const totalTrips: number = data?.totalTrips ?? 0;
  const recsGenerated: number = data?.recommendationsGenerated ?? 0;
  const byStatus: Record<string, number> = data?.byStatus ?? {};
  const byTravelType: Record<string, number> = data?.byTravelType ?? {};
  const byBudgetCat: Record<string, number> = data?.byBudgetCat ?? {};
  const topInterests: { interest: string; count: number }[] = data?.topInterests ?? [];
  const topHotels: { name: string; count: number }[] = data?.topHotels ?? [];
  const topRestaurants: { name: string; count: number }[] = data?.topRestaurants ?? [];
  const topPlaces: { name: string; count: number }[] = data?.topPlaces ?? [];

  const maxInterestCount = Math.max(...topInterests.map((i) => i.count), 1);
  const maxPlaceCount = Math.max(...topPlaces.map((p) => p.count), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" /> Trip Planner Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of customer trip planning activity</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Trips</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalTrips}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Map className="w-3 h-3" /> Plans created
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">AI Plans Generated</p>
              <p className="text-2xl font-bold text-primary mt-1">{recsGenerated}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Recommendations
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Upcoming Trips</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{byStatus.upcoming ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Active planners</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Completed Trips</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{byStatus.completed ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Finished trips</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Trip Status Distribution */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Trip Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`capitalize text-xs border-0 px-2 py-0 ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
                      {status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${totalTrips > 0 ? (count / totalTrips) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(byStatus).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No trip data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Travel Types */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Travel Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byTravelType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <span className="text-sm flex items-center gap-2">
                      <span>{TRAVEL_TYPE_ICONS[type] ?? "🌍"}</span>
                      <span className="capitalize">{type}</span>
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${totalTrips > 0 ? (count / totalTrips) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              {Object.keys(byTravelType).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Budget Categories */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Budget Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byBudgetCat)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between gap-3">
                    <Badge className={`capitalize text-xs border-0 px-2 py-0.5 ${BUDGET_COLORS[cat] ?? "bg-gray-100"}`}>
                      {cat}
                    </Badge>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-purple-400"
                          style={{ width: `${totalTrips > 0 ? (count / totalTrips) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              {Object.keys(byBudgetCat).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Popular Interests */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Popular Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topInterests.map(({ interest, count }) => (
                <div key={interest} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-foreground flex-1 truncate">
                    {INTEREST_LABELS[interest] ?? interest}
                  </p>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(count / maxInterestCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {topInterests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No interest data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Most Recommended Hotels */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hotel className="w-4 h-4 text-blue-500" /> Top Recommended Hotels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topHotels.length > 0 ? topHotels.map(({ name, count }, idx) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <p className="text-sm text-foreground truncate">{name}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{count}x</Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recommendation data</p>
              )}
            </CardContent>
          </Card>

          {/* Most Recommended Restaurants */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-500" /> Top Recommended Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topRestaurants.length > 0 ? topRestaurants.map(({ name, count }, idx) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <p className="text-sm text-foreground truncate">{name}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{count}x</Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recommendation data</p>
              )}
            </CardContent>
          </Card>

          {/* Most Visited Attractions */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" /> Top Attractions Planned
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topPlaces.length > 0 ? topPlaces.slice(0, 6).map(({ name, count }, idx) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <p className="text-sm text-foreground truncate">{name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-rose-400"
                        style={{ width: `${(count / maxPlaceCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{count}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
