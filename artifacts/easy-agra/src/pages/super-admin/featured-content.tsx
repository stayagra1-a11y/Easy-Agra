import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Hotel, Utensils, Sparkles, Landmark, Save, X, Check } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchFeatured() {
  const res = await fetch(`${BASE}/api/admin/featured-content`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch featured content");
  return res.json();
}

function ToggleCard({
  item,
  isFeatured,
  onToggle,
}: { item: { id: number; name: string; status?: string; category?: string }; isFeatured: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all select-none ${
        isFeatured ? "border-amber-400 bg-amber-50 shadow-sm" : "border-border bg-white hover:border-primary/30 hover:bg-muted/30"
      }`}
    >
      {isFeatured && (
        <span className="absolute top-2 right-2">
          <Check className="h-4 w-4 text-amber-600" />
        </span>
      )}
      <div className="font-medium text-sm truncate pr-6">{item.name}</div>
      <div className="flex gap-2 mt-1">
        {item.status && (
          <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
        )}
        {item.category && (
          <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
        )}
      </div>
    </div>
  );
}

export default function FeaturedContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["featured-content"], queryFn: fetchFeatured });

  const [featuredIds, setFeaturedIds] = useState<{
    hotels: number[];
    restaurants: number[];
    spas: number[];
    touristPlaces: number[];
  }>({ hotels: [], restaurants: [], spas: [], touristPlaces: [] });

  useEffect(() => {
    if (data?.featuredIds) setFeaturedIds(data.featuredIds);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/admin/featured-content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          featuredHotelIds: featuredIds.hotels,
          featuredRestaurantIds: featuredIds.restaurants,
          featuredSpaIds: featuredIds.spas,
          featuredTouristPlaceIds: featuredIds.touristPlaces,
        }),
      });
      if (!res.ok) throw new Error("Failed to save featured content");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["featured-content"] });
      toast({ title: "Featured content saved", description: "Homepage feature selections updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save featured content", variant: "destructive" }),
  });

  const toggle = (type: keyof typeof featuredIds, id: number) => {
    setFeaturedIds(prev => {
      const arr = prev[type];
      return { ...prev, [type]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
    });
  };

  const all = data?.all ?? {};
  const hotels: any[] = all.hotels ?? [];
  const restaurants: any[] = all.restaurants ?? [];
  const spas: any[] = all.spas ?? [];
  const touristPlaces: any[] = all.touristPlaces ?? [];

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-amber-500" />Featured Content</h1>
            <p className="text-sm text-muted-foreground mt-1">Select which listings appear as featured on the homepage</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-primary">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Featured Selection
          </Button>
        </div>

        <Tabs defaultValue="hotels">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="hotels" className="flex gap-1.5 items-center text-xs">
              <Hotel className="h-3.5 w-3.5" />Hotels
              {featuredIds.hotels.length > 0 && <Badge className="h-4 px-1 text-xs bg-amber-500">{featuredIds.hotels.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex gap-1.5 items-center text-xs">
              <Utensils className="h-3.5 w-3.5" />Restaurants
              {featuredIds.restaurants.length > 0 && <Badge className="h-4 px-1 text-xs bg-amber-500">{featuredIds.restaurants.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="spas" className="flex gap-1.5 items-center text-xs">
              <Sparkles className="h-3.5 w-3.5" />Spas
              {featuredIds.spas.length > 0 && <Badge className="h-4 px-1 text-xs bg-amber-500">{featuredIds.spas.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="places" className="flex gap-1.5 items-center text-xs">
              <Landmark className="h-3.5 w-3.5" />Places
              {featuredIds.touristPlaces.length > 0 && <Badge className="h-4 px-1 text-xs bg-amber-500">{featuredIds.touristPlaces.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hotels">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hotels ({featuredIds.hotels.length} featured)</CardTitle>
                <p className="text-xs text-muted-foreground">Click to toggle featured. Featured hotels appear on the homepage.</p>
              </CardHeader>
              <CardContent>
                {hotels.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No hotels available</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {hotels.map((h: any) => (
                      <ToggleCard key={h.id} item={h} isFeatured={featuredIds.hotels.includes(h.id)} onToggle={() => toggle("hotels", h.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurants">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Restaurants ({featuredIds.restaurants.length} featured)</CardTitle>
                <p className="text-xs text-muted-foreground">Click to toggle featured restaurants.</p>
              </CardHeader>
              <CardContent>
                {restaurants.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No restaurants available</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {restaurants.map((r: any) => (
                      <ToggleCard key={r.id} item={r} isFeatured={featuredIds.restaurants.includes(r.id)} onToggle={() => toggle("restaurants", r.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spas">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Spas ({featuredIds.spas.length} featured)</CardTitle>
                <p className="text-xs text-muted-foreground">Click to toggle featured spas.</p>
              </CardHeader>
              <CardContent>
                {spas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No spas available</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {spas.map((s: any) => (
                      <ToggleCard key={s.id} item={s} isFeatured={featuredIds.spas.includes(s.id)} onToggle={() => toggle("spas", s.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="places">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tourist Places ({featuredIds.touristPlaces.length} featured)</CardTitle>
                <p className="text-xs text-muted-foreground">Click to toggle featured tourist places.</p>
              </CardHeader>
              <CardContent>
                {touristPlaces.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No tourist places available</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {touristPlaces.map((p: any) => (
                      <ToggleCard key={p.id} item={p} isFeatured={featuredIds.touristPlaces.includes(p.id)} onToggle={() => toggle("touristPlaces", p.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
