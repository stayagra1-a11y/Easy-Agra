import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Hotel, Utensils, MapPin, Calendar, Wallet, Clock, Navigation,
  RefreshCw, ExternalLink, ChevronDown, ChevronUp, Star, Loader2,
  Plane, Building2, Wind, Map, IndianRupee, CheckCircle2, BookOpen,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const BASE = getApiBase();

async function fetchRecommendations(tripRef: string) {
  const res = await fetch(`${BASE}/api/trips/${tripRef}/recommendations`);
  if (!res.ok) throw new Error("No recommendations");
  return res.json();
}

async function generateRecommendations(tripRef: string) {
  const res = await fetch(`${BASE}/api/trips/${tripRef}/recommendations`, { method: "POST" });
  if (!res.ok) throw new Error("Generation failed");
  return res.json();
}

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

const TIME_ICONS: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
};

const TYPE_COLORS: Record<string, string> = {
  attraction: "border-l-primary bg-primary/5",
  restaurant: "border-l-amber-400 bg-amber-50",
  spa: "border-l-emerald-400 bg-emerald-50",
  free: "border-l-purple-400 bg-purple-50",
  travel: "border-l-gray-300 bg-gray-50",
  hotel: "border-l-blue-400 bg-blue-50",
};

const BUDGET_CAT_COLORS: Record<string, string> = {
  budget: "bg-green-100 text-green-700",
  standard: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  luxury: "bg-amber-100 text-amber-700",
};

interface Props {
  tripRef: string;
  tripStatus: string;
  interests: string[];
  budgetCategory: string;
}

export function TripRecommendations({ tripRef, tripStatus, interests, budgetCategory }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  const queryKey = [`/trips/${tripRef}/recommendations`];

  const { data: rec, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchRecommendations(tripRef),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const generate = useMutation({
    mutationFn: () => generateRecommendations(tripRef),
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
      toast({ title: "✨ Trip plan generated!", description: "Your personalised Agra itinerary is ready." });
    },
    onError: () => {
      toast({ title: "Could not generate plan", description: "Please try again.", variant: "destructive" });
    },
  });

  // ─── No recommendations yet ───
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className={`h-${i === 1 ? 24 : 16} bg-muted rounded-2xl`} />)}
      </div>
    );
  }

  if (isError || !rec) {
    return (
      <Card className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-amber-50">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base">Generate Your Smart Trip Plan</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Get personalised hotel picks, day-wise itinerary, restaurant recommendations, and full cost estimate — all based on your interests and budget.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {[
              { icon: Hotel, label: "Hotel recommendations" },
              { icon: Map, label: "Day-wise itinerary" },
              { icon: Utensils, label: "Restaurant picks" },
              { icon: IndianRupee, label: "Cost estimation" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-background rounded-lg p-2">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="w-full bg-primary text-white hover:bg-primary/90 h-11 font-semibold"
          >
            {generate.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating plan…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate My Trip Plan</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const cost = rec.costEstimation;
  const hotels: any[] = rec.hotels ?? [];
  const restaurants: any[] = rec.restaurants ?? [];
  const spas: any[] = rec.spas ?? [];
  const places: any[] = rec.touristPlaces ?? [];
  const itinerary: any[] = rec.itinerary ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> Your Trip Plan
        </h2>
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          Regenerate
        </Button>
      </div>

      {/* Cost Summary Banner */}
      {cost && (
        <div
          className="rounded-2xl p-4 text-white"
          style={{ background: "linear-gradient(135deg, hsl(38 92% 40%) 0%, hsl(38 92% 55%) 100%)" }}
        >
          <p className="text-white/70 text-xs mb-1">Estimated Trip Cost</p>
          <p className="text-3xl font-bold">₹{cost.totalCost.toLocaleString("en-IN")}</p>
          <p className="text-white/80 text-sm mt-0.5">₹{cost.perPersonCost.toLocaleString("en-IN")} per person</p>
          <div className="flex gap-4 mt-3 flex-wrap">
            {cost.items.slice(0, 4).map((item: any) => (
              <div key={item.category} className="text-center">
                <p className="text-lg font-semibold">₹{item.cost.toLocaleString("en-IN")}</p>
                <p className="text-xs text-white/60">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hotels */}
      {hotels.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Hotel className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm text-foreground">Recommended Hotels</h3>
          </div>
          <div className="space-y-2">
            {hotels.map((hotel: any, idx: number) => (
              <Card key={hotel.id ?? idx} className="rounded-xl border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">{hotel.name}</p>
                        <Badge className={`text-xs capitalize border-0 px-2 py-0 ${BUDGET_CAT_COLORS[hotel.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {hotel.category}
                        </Badge>
                      </div>
                      {hotel.address && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {hotel.address}
                        </p>
                      )}
                      <p className="text-xs text-primary font-medium mt-1">
                        ≈ ₹{hotel.estimatedCostPerNight?.toLocaleString("en-IN")}/night
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {hotel.googleMapLink && (
                        <a href={hotel.googleMapLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                            <Navigation className="w-3 h-3 mr-1" /> Map
                          </Button>
                        </a>
                      )}
                      <Link href={`/hotels/${hotel.id}`}>
                        <Button size="sm" className="h-7 text-xs px-2 bg-primary text-white hover:bg-primary/90">
                          Book
                        </Button>
                      </Link>
                    </div>
                  </div>
                  {hotel.amenities && hotel.amenities.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {hotel.amenities.slice(0, 4).map((a: string) => (
                        <span key={a} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{a}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Day-wise Itinerary */}
      {itinerary.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Day-wise Itinerary</h3>
          </div>
          <div className="space-y-2">
            {itinerary.map((dayPlan: any) => (
              <Card key={dayPlan.day} className="rounded-xl border-border/60 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === dayPlan.day ? null : dayPlan.day)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {dayPlan.day}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-foreground">{dayPlan.title}</p>
                      <p className="text-xs text-muted-foreground">{dayPlan.theme}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      ₹{dayPlan.dailyCost?.toLocaleString("en-IN")}
                    </span>
                    {expandedDay === dayPlan.day
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {expandedDay === dayPlan.day && (
                  <div className="border-t border-border/40 px-3 pb-3 pt-2 space-y-2">
                    {dayPlan.date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(dayPlan.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                    )}
                    {dayPlan.activities.map((act: any, idx: number) => (
                      <div
                        key={idx}
                        className={`border-l-4 rounded-r-lg p-2.5 ${TYPE_COLORS[act.type] ?? "border-l-gray-300 bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm">{TIME_ICONS[act.time]}</span>
                              <p className="font-medium text-xs text-foreground">{act.name}</p>
                            </div>
                            {act.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{act.description}</p>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {act.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {act.duration}
                                </span>
                              )}
                              {act.estimatedCost !== undefined && act.estimatedCost > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <IndianRupee className="w-3 h-3" /> {act.estimatedCost.toLocaleString("en-IN")}
                                </span>
                              )}
                              {act.estimatedCost === 0 && (
                                <span className="text-xs text-emerald-600 font-medium">Free</span>
                              )}
                            </div>
                          </div>
                          {act.googleMapsLink && (
                            <a href={act.googleMapsLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <Navigation className="w-3.5 h-3.5 text-primary" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Tourist Places */}
      {places.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <h3 className="font-semibold text-sm text-foreground">Must-Visit Attractions</h3>
          </div>
          <div className="space-y-2">
            {places.map((place: any, idx: number) => (
              <div key={place.id ?? place.name} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{place.name}</p>
                  {place.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{place.description}</p>
                  )}
                  <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                    {place.ticketPriceIndian === 0
                      ? <span className="text-emerald-600 font-medium">Free entry</span>
                      : <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{place.ticketPriceIndian} per adult</span>}
                    {place.bestTime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{place.bestTime}</span>}
                    {place.duration && <span className="flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />{place.duration}</span>}
                  </div>
                </div>
                {place.googleMapsLink && (
                  <a href={place.googleMapsLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs px-2.5">
                      <ExternalLink className="w-3 h-3 mr-1" /> Maps
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Restaurants */}
      {restaurants.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-foreground">Recommended Restaurants</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {restaurants.slice(0, 4).map((r: any, idx: number) => (
              <div key={r.id ?? idx} className="flex items-center justify-between gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{r.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    {r.cuisineType && <span>{r.cuisineType}</span>}
                    {r.address && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{r.address}</span>}
                    <span className="flex items-center gap-0.5 text-amber-700 font-medium">
                      <IndianRupee className="w-3 h-3" /> ≈ ₹{r.estimatedCostPerPerson}/person
                    </span>
                  </div>
                </div>
                <Link href={`/restaurants/${r.id}`}>
                  <Button size="sm" className="h-8 text-xs px-2.5 bg-amber-500 text-white hover:bg-amber-600 shrink-0">
                    Reserve
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spas */}
      {spas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-foreground">Wellness & Spa</h3>
          </div>
          <div className="space-y-2">
            {spas.map((spa: any, idx: number) => (
              <div key={spa.id ?? idx} className="flex items-center justify-between gap-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{spa.name}</p>
                  {spa.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {spa.address}
                    </p>
                  )}
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    ≈ ₹{spa.estimatedCostPerSession?.toLocaleString("en-IN")}/session
                  </p>
                </div>
                <Link href={`/spas/${spa.id}`}>
                  <Button size="sm" className="h-8 text-xs px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 shrink-0">
                    Book
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cost breakdown */}
      {cost && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Cost Breakdown</h3>
          </div>
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-3 space-y-2">
              {cost.items.map((item: any) => (
                <div key={item.category} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-foreground font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.breakdown}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0">
                    ₹{item.cost.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-bold text-foreground">Total Estimated</p>
                <p className="font-bold text-primary text-lg">₹{cost.totalCost.toLocaleString("en-IN")}</p>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                ₹{cost.perPersonCost.toLocaleString("en-IN")} per person
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        * Estimates are approximate and may vary. Prices subject to availability.
      </p>
    </div>
  );
}
