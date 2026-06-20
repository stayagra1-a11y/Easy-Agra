import { Router } from "express";
import { db, tripPlansTable, tripRecommendationsTable, hotelsTable, restaurantsTable, spasTable, touristPlacesTable } from "@workspace/db";
import type { RecommendedHotel, RecommendedRestaurant, RecommendedSpa, RecommendedPlace, DayPlan, DayActivity, CostEstimation } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { logActivity } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// ─────────────────────────────────────────────────
// CURATED AGRA TOURIST PLACES (always available)
// ─────────────────────────────────────────────────
const AGRA_PLACES: RecommendedPlace[] = [
  {
    name: "Taj Mahal",
    slug: "taj-mahal",
    description: "The world's most beautiful monument of love — a UNESCO World Heritage Site.",
    ticketPriceIndian: 50,
    googleMapsLink: "https://maps.google.com/?q=Taj+Mahal,Agra",
    lat: 27.1751, lng: 78.0421,
    interests: ["historical_places", "photography", "family_activities", "luxury_experience"],
    bestTime: "Sunrise (6–8 AM)",
    duration: "2–3 hours",
  },
  {
    name: "Agra Fort",
    slug: "agra-fort",
    description: "A magnificent red sandstone fort with palaces, mosques, and beautiful gardens.",
    ticketPriceIndian: 35,
    googleMapsLink: "https://maps.google.com/?q=Agra+Fort,Agra",
    lat: 27.1795, lng: 78.0211,
    interests: ["historical_places", "photography", "family_activities"],
    bestTime: "Morning (9 AM – 12 PM)",
    duration: "2 hours",
  },
  {
    name: "Mehtab Bagh",
    slug: "mehtab-bagh",
    description: "A stunning moonlit garden offering the best sunset view of the Taj Mahal.",
    ticketPriceIndian: 20,
    googleMapsLink: "https://maps.google.com/?q=Mehtab+Bagh,Agra",
    lat: 27.1787, lng: 78.0318,
    interests: ["photography", "family_activities", "luxury_experience"],
    bestTime: "Sunset (5–7 PM)",
    duration: "1–1.5 hours",
  },
  {
    name: "Itimad-ud-Daulah",
    slug: "itimad-ud-daulah",
    description: "Called the 'Baby Taj', this exquisite marble mausoleum is a gem of Mughal architecture.",
    ticketPriceIndian: 20,
    googleMapsLink: "https://maps.google.com/?q=Itmad-ud-Daulah,Agra",
    lat: 27.1956, lng: 78.0302,
    interests: ["historical_places", "photography"],
    bestTime: "Morning (9–11 AM)",
    duration: "1.5 hours",
  },
  {
    name: "Fatehpur Sikri",
    slug: "fatehpur-sikri",
    description: "A deserted Mughal city, UNESCO World Heritage Site, 40 km from Agra.",
    ticketPriceIndian: 35,
    googleMapsLink: "https://maps.google.com/?q=Fatehpur+Sikri,Agra",
    lat: 27.0945, lng: 77.6609,
    interests: ["historical_places", "photography", "religious_places", "family_activities"],
    bestTime: "Morning (8 AM – 1 PM)",
    duration: "3–4 hours",
  },
  {
    name: "Akbar's Tomb (Sikandra)",
    slug: "akbar-tomb",
    description: "The grand mausoleum of Emperor Akbar surrounded by lush gardens.",
    ticketPriceIndian: 15,
    googleMapsLink: "https://maps.google.com/?q=Akbar+Tomb+Sikandra,Agra",
    lat: 27.2436, lng: 77.9617,
    interests: ["historical_places", "photography"],
    bestTime: "Morning (9–11 AM)",
    duration: "1.5 hours",
  },
  {
    name: "Chini Ka Rauza",
    slug: "chini-ka-rauza",
    description: "A beautifully tiled Persian-style mausoleum near the Yamuna river.",
    ticketPriceIndian: 5,
    googleMapsLink: "https://maps.google.com/?q=Chini+Ka+Rauza,Agra",
    lat: 27.1998, lng: 78.0238,
    interests: ["historical_places", "religious_places"],
    bestTime: "Anytime",
    duration: "45 minutes",
  },
  {
    name: "Jama Masjid Agra",
    slug: "jama-masjid-agra",
    description: "One of India's largest mosques, built by Shah Jahan, featuring stunning red sandstone architecture.",
    ticketPriceIndian: 0,
    googleMapsLink: "https://maps.google.com/?q=Jama+Masjid+Agra",
    lat: 27.1788, lng: 78.0173,
    interests: ["historical_places", "religious_places", "photography"],
    bestTime: "Morning or Late Afternoon",
    duration: "45 minutes",
  },
];

// ─────────────────────────────────────────────────
// Budget price tables
// ─────────────────────────────────────────────────
const BUDGET_PRICES: Record<string, { hotel: number; restaurant: number; spa: number; travel: number }> = {
  budget:   { hotel: 1500,  restaurant: 250,  spa: 600,  travel: 400  },
  standard: { hotel: 4000,  restaurant: 500,  spa: 1500, travel: 800  },
  premium:  { hotel: 10000, restaurant: 1200, spa: 3500, travel: 1500 },
  luxury:   { hotel: 25000, restaurant: 2500, spa: 7000, travel: 3000 },
};

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function interestScore(place: RecommendedPlace, interests: string[]): number {
  return place.interests.filter((i) => interests.includes(i)).length;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function selectPlaces(interests: string[], maxPlaces: number): RecommendedPlace[] {
  const scored = AGRA_PLACES.map((p) => ({
    place: p,
    score: interestScore(p, interests),
  }))
    .filter((x) => x.score > 0 || interests.length === 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return AGRA_PLACES.slice(0, maxPlaces);
  return scored.slice(0, maxPlaces).map((x) => x.place);
}

// ─────────────────────────────────────────────────
// Itinerary builder
// ─────────────────────────────────────────────────
const DAY_THEMES: Record<number, string> = {
  1: "Iconic Monuments",
  2: "Hidden Gems",
  3: "Day Trip Adventure",
  4: "Culture & Leisure",
  5: "Wellness & Shopping",
};

function buildItinerary(
  trip: { days: number; adults: number; interests: string[]; arrivalDate: string; budgetCategory: string },
  places: RecommendedPlace[],
  restaurants: RecommendedRestaurant[],
  spas: RecommendedSpa[],
): DayPlan[] {
  const prices = BUDGET_PRICES[trip.budgetCategory] ?? BUDGET_PRICES.standard;
  const numDays = Math.min(trip.days, 7);

  // Group places by geographic cluster
  const tajArea = places.filter((p) => p.lng > 78.03);
  const centralAgra = places.filter((p) => p.lng >= 78.01 && p.lng <= 78.03 && p.lat < 27.2);
  const northAgra = places.filter((p) => p.lat >= 27.2 && p.lng < 78.01);
  const farAway = places.filter((p) => p.lng < 77.7);
  const uncategorized = places.filter(
    (p) => !tajArea.includes(p) && !centralAgra.includes(p) && !northAgra.includes(p) && !farAway.includes(p),
  );

  const dayGroups: RecommendedPlace[][] = [
    [...tajArea, ...uncategorized.slice(0, 1)],
    [...centralAgra, ...northAgra.slice(0, 1)],
    [...farAway, ...northAgra.slice(1)],
  ].filter((g) => g.length > 0);

  const hasWellness = trip.interests.includes("wellness_spa");
  const hasShopping = trip.interests.includes("shopping");

  const plans: DayPlan[] = [];

  for (let day = 1; day <= numDays; day++) {
    const arrDate = new Date(trip.arrivalDate + "T00:00:00");
    arrDate.setDate(arrDate.getDate() + day - 1);
    const dateStr = arrDate.toISOString().substring(0, 10);

    const activities: DayActivity[] = [];
    const groupIdx = day - 1;
    const theme = DAY_THEMES[day] ?? (hasWellness ? "Wellness & Relaxation" : "Leisure Day");

    if (groupIdx < dayGroups.length && dayGroups[groupIdx].length > 0) {
      const dayPlaces = dayGroups[groupIdx].slice(0, 3);

      // Morning attraction
      const p1 = dayPlaces[0];
      activities.push({
        time: "morning",
        type: "attraction",
        name: p1.name,
        description: p1.description,
        duration: p1.duration ?? "2 hours",
        estimatedCost: p1.ticketPriceIndian * trip.adults,
        googleMapsLink: p1.googleMapsLink,
        lat: p1.lat,
        lng: p1.lng,
      });

      // Lunch
      const lunch = restaurants[day % restaurants.length];
      if (lunch) {
        activities.push({
          time: "afternoon",
          type: "restaurant",
          name: `Lunch at ${lunch.name}`,
          description: lunch.cuisineType ? `${lunch.cuisineType} cuisine` : undefined,
          estimatedCost: prices.restaurant * trip.adults,
          entityId: lunch.id,
          entityType: "restaurant",
        });
      }

      // Afternoon attraction
      if (dayPlaces[1]) {
        const p2 = dayPlaces[1];
        activities.push({
          time: "afternoon",
          type: "attraction",
          name: p2.name,
          description: p2.description,
          duration: p2.duration ?? "1.5 hours",
          estimatedCost: p2.ticketPriceIndian * trip.adults,
          googleMapsLink: p2.googleMapsLink,
          lat: p2.lat,
          lng: p2.lng,
        });
      }

      // Evening
      if (dayPlaces[2]) {
        const p3 = dayPlaces[2];
        activities.push({
          time: "evening",
          type: "attraction",
          name: p3.name,
          description: p3.description,
          duration: p3.duration ?? "1 hour",
          estimatedCost: p3.ticketPriceIndian * trip.adults,
          googleMapsLink: p3.googleMapsLink,
          lat: p3.lat,
          lng: p3.lng,
        });
      } else if (hasShopping && day >= 2) {
        activities.push({
          time: "evening",
          type: "free",
          name: "Shopping at Kinari Bazaar / Sadar Bazaar",
          description: "Explore Agra's famous markets for marble inlay work, leather goods, and textiles.",
          estimatedCost: 0,
          googleMapsLink: "https://maps.google.com/?q=Kinari+Bazaar+Agra",
        });
      }

      // Dinner
      const dinner = restaurants[(day + 2) % restaurants.length];
      if (dinner) {
        activities.push({
          time: "evening",
          type: "restaurant",
          name: `Dinner at ${dinner.name}`,
          description: dinner.cuisineType ? `${dinner.cuisineType} cuisine` : undefined,
          estimatedCost: prices.restaurant * trip.adults,
          entityId: dinner.id,
          entityType: "restaurant",
        });
      }
    } else {
      // Extra days — spa, shopping, leisure
      if (hasWellness && spas.length > 0 && !plans.some((p) => p.activities.some((a) => a.type === "spa"))) {
        const spa = spas[0];
        activities.push(
          {
            time: "morning",
            type: "free",
            name: "Slow Morning & Hotel Breakfast",
            description: "Enjoy a relaxed start to the day.",
            estimatedCost: 0,
          },
          {
            time: "afternoon",
            type: "spa",
            name: `Spa Session at ${spa.name}`,
            description: "Revitalize with a signature wellness treatment.",
            duration: "2–3 hours",
            estimatedCost: prices.spa * trip.adults,
            entityId: spa.id,
            entityType: "spa",
          },
        );
      } else if (hasShopping) {
        activities.push(
          {
            time: "morning",
            type: "free",
            name: "Kinari Bazaar — Marble & Crafts",
            description: "Agra's oldest market — famous for Petha sweets, marble inlay, and textiles.",
            estimatedCost: 0,
            googleMapsLink: "https://maps.google.com/?q=Kinari+Bazaar+Agra",
          },
          {
            time: "afternoon",
            type: "free",
            name: "Sadar Bazaar — Local Shopping",
            description: "Leather goods, handicrafts, and local street food.",
            estimatedCost: 0,
            googleMapsLink: "https://maps.google.com/?q=Sadar+Bazaar+Agra",
          },
        );
      } else {
        activities.push({
          time: "morning",
          type: "free",
          name: "Leisure Day",
          description: "Rest, explore at your own pace, or revisit your favourite spots.",
          estimatedCost: 0,
        });
      }

      // Always add meals for extra days
      const lunch = restaurants[day % restaurants.length];
      const dinner = restaurants[(day + 1) % restaurants.length];
      if (lunch) {
        activities.push({
          time: "afternoon",
          type: "restaurant",
          name: `Lunch at ${lunch.name}`,
          estimatedCost: prices.restaurant * trip.adults,
          entityId: lunch.id,
          entityType: "restaurant",
        });
      }
      if (dinner) {
        activities.push({
          time: "evening",
          type: "restaurant",
          name: `Dinner at ${dinner.name}`,
          estimatedCost: prices.restaurant * trip.adults,
          entityId: dinner.id,
          entityType: "restaurant",
        });
      }
    }

    const dailyCost = activities.reduce((sum, a) => sum + (a.estimatedCost ?? 0), 0) + prices.travel;

    plans.push({
      day,
      date: dateStr,
      title: `Day ${day}`,
      theme,
      activities,
      dailyCost,
    });
  }

  return plans;
}

// ─────────────────────────────────────────────────
// Cost estimator
// ─────────────────────────────────────────────────
function buildCostEstimation(
  trip: { days: number; adults: number; children: number; interests: string[]; budgetCategory: string },
  hotels: RecommendedHotel[],
  restaurants: RecommendedRestaurant[],
  spas: RecommendedSpa[],
  places: RecommendedPlace[],
): CostEstimation {
  const prices = BUDGET_PRICES[trip.budgetCategory] ?? BUDGET_PRICES.standard;
  const totalPeople = trip.adults + trip.children;
  const nights = trip.days;

  const hotelCost = (hotels[0]?.estimatedCostPerNight ?? prices.hotel) * nights;
  const mealCost = prices.restaurant * trip.adults * 2 * trip.days; // 2 meals/day
  const spaCost = trip.interests.includes("wellness_spa") ? prices.spa * trip.adults : 0;
  const ticketCost = places.reduce((sum, p) => sum + p.ticketPriceIndian * trip.adults + (p.ticketPriceIndian * 0.5 * trip.children), 0);
  const travelCost = prices.travel * trip.days;
  const miscCost = Math.round((hotelCost + mealCost) * 0.05); // 5% misc

  const totalCost = Math.round(hotelCost + mealCost + spaCost + ticketCost + travelCost + miscCost);

  const items = [
    { category: "hotel", label: "Hotel Accommodation", cost: hotelCost, breakdown: `₹${prices.hotel}/night × ${nights} nights` },
    { category: "food", label: "Meals & Dining", cost: mealCost, breakdown: `₹${prices.restaurant}/person × 2 meals × ${trip.days} days × ${trip.adults} adults` },
    ...(spaCost > 0 ? [{ category: "spa", label: "Spa & Wellness", cost: spaCost, breakdown: `₹${prices.spa}/session × ${trip.adults} adults` }] : []),
    { category: "tickets", label: "Entry Tickets", cost: Math.round(ticketCost), breakdown: `${places.length} attractions` },
    { category: "travel", label: "Local Transport", cost: travelCost, breakdown: `₹${prices.travel}/day × ${trip.days} days` },
    { category: "misc", label: "Miscellaneous", cost: miscCost, breakdown: "Tips, snacks, extras (5%)" },
  ];

  return {
    hotelCost,
    restaurantCost: mealCost,
    spaCost,
    ticketCost: Math.round(ticketCost),
    travelCost,
    miscCost,
    totalCost,
    perPersonCost: Math.round(totalCost / Math.max(totalPeople, 1)),
    items,
  };
}

// ─────────────────────────────────────────────────
// POST /trips/:ref/recommendations — generate
// ─────────────────────────────────────────────────
router.post(
  "/trips/:ref/recommendations",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;

    const [trip] = await db
      .select()
      .from(tripPlansTable)
      .where(and(eq(tripPlansTable.tripRef, req.params.ref as string), eq(tripPlansTable.customerId, user.id)));

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const interests: string[] = (trip.interests as string[]) ?? [];
    const budgetCat = trip.budgetCategory ?? "standard";
    const prices = BUDGET_PRICES[budgetCat] ?? BUDGET_PRICES.standard;

    // ── Hotels: filter by budget category, fallback to adjacent categories ──
    let dbHotels = await db
      .select()
      .from(hotelsTable)
      .where(and(eq(hotelsTable.status, "active"), eq(hotelsTable.category, budgetCat as any)))
      .limit(3);

    if (dbHotels.length === 0) {
      dbHotels = await db.select().from(hotelsTable).where(eq(hotelsTable.status, "active")).limit(3);
    }

    const hotels: RecommendedHotel[] = dbHotels.map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
      address: h.address ?? undefined,
      googleMapLink: h.googleMapLink ?? undefined,
      amenities: (h.amenities as string[] | null) ?? [],
      estimatedCostPerNight: prices.hotel,
      coverImage: h.coverImage ?? undefined,
    }));

    // ── Restaurants: top active ──
    const dbRestaurants = await db
      .select()
      .from(restaurantsTable)
      .where(eq(restaurantsTable.status, "active"))
      .limit(6);

    const restaurants: RecommendedRestaurant[] = dbRestaurants.map((r) => ({
      id: r.id,
      name: r.name,
      cuisineType: r.cuisineType ?? undefined,
      address: r.address ?? undefined,
      estimatedCostPerPerson: prices.restaurant,
      coverPhoto: r.coverPhoto ?? undefined,
    }));

    // ── Spas: top active ──
    const dbSpas = await db
      .select()
      .from(spasTable)
      .where(eq(spasTable.status, "active"))
      .limit(3);

    const spas: RecommendedSpa[] = dbSpas.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address ?? undefined,
      estimatedCostPerSession: prices.spa,
      coverPhoto: s.coverPhoto ?? undefined,
      facilities: (s.facilities as string[] | null) ?? [],
    }));

    // ── Tourist places: query DB first, merge with curated ──
    const dbPlaces = await db
      .select()
      .from(touristPlacesTable)
      .where(eq(touristPlacesTable.isActive, true))
      .limit(20);

    const dbPlacesMapped: RecommendedPlace[] = dbPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.shortDescription ?? undefined,
      ticketPriceIndian: parseFloat(String(p.ticketPriceIndian ?? "0")),
      googleMapsLink: p.googleMapsLink ?? `https://maps.google.com/?q=${encodeURIComponent(p.name + " Agra")}`,
      lat: parseFloat(String(p.latitude ?? "27.1767")),
      lng: parseFloat(String(p.longitude ?? "78.0081")),
      interests: interests.length > 0 ? interests.slice(0, 2) : ["historical_places"],
      bestTime: p.bestTimeToVisit ?? undefined,
    }));

    // Merge: prefer DB, fall back to curated for any not already covered
    const coveredSlugs = new Set(dbPlacesMapped.map((p) => p.slug));
    const curatedFallback = AGRA_PLACES.filter((p) => !coveredSlugs.has(p.slug));
    const allPlaces = [...dbPlacesMapped, ...curatedFallback];

    // Select by interest, limit to prevent overloading itinerary
    const maxPlaces = Math.min(trip.days * 3, 8);
    const selectedPlaces = selectPlaces(interests, maxPlaces).filter((p) =>
      allPlaces.some((ap) => ap.name === p.name),
    );
    const finalPlaces = selectedPlaces.length > 0 ? selectedPlaces : allPlaces.slice(0, maxPlaces);

    // ── Generate itinerary ──
    const itinerary = buildItinerary(
      { days: trip.days, adults: trip.adults, interests, arrivalDate: trip.arrivalDate, budgetCategory: budgetCat },
      finalPlaces,
      restaurants,
      spas,
    );

    // ── Cost estimation ──
    const costEstimation = buildCostEstimation(
      { days: trip.days, adults: trip.adults, children: trip.children, interests, budgetCategory: budgetCat },
      hotels,
      restaurants,
      spas,
      finalPlaces,
    );

    // ── Upsert recommendation ──
    const existing = await db
      .select()
      .from(tripRecommendationsTable)
      .where(eq(tripRecommendationsTable.tripId, trip.id))
      .limit(1);

    let rec;
    if (existing.length > 0) {
      const [updated] = await db
        .update(tripRecommendationsTable)
        .set({
          hotels,
          restaurants,
          spas,
          touristPlaces: finalPlaces,
          itinerary,
          costEstimation,
          updatedAt: new Date(),
        })
        .where(eq(tripRecommendationsTable.id, existing[0].id))
        .returning();
      rec = updated;
    } else {
      const [created] = await db
        .insert(tripRecommendationsTable)
        .values({
          tripId: trip.id,
          tripRef: trip.tripRef,
          hotels,
          restaurants,
          spas,
          touristPlaces: finalPlaces,
          itinerary,
          costEstimation,
        })
        .returning();
      rec = created;
    }

    await logActivity(req, "trip_recommendations_generated", `Recommendations generated for ${trip.tripRef}`, user.id, user.role);
    res.json(rec);
  },
);

// ─────────────────────────────────────────────────
// GET /trips/:ref/recommendations
// ─────────────────────────────────────────────────
router.get(
  "/trips/:ref/recommendations",
  requireAuth,
  requireRole("customer"),
  async (req, res): Promise<void> => {
    const user = (req as any).currentUser;

    const [trip] = await db
      .select()
      .from(tripPlansTable)
      .where(and(eq(tripPlansTable.tripRef, req.params.ref as string), eq(tripPlansTable.customerId, user.id)));

    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const [rec] = await db
      .select()
      .from(tripRecommendationsTable)
      .where(eq(tripRecommendationsTable.tripId, trip.id));

    if (!rec) {
      res.status(404).json({ error: "No recommendations yet" });
      return;
    }

    res.json(rec);
  },
);

// ─────────────────────────────────────────────────
// GET /admin/trip-analytics
// ─────────────────────────────────────────────────
router.get(
  "/admin/trip-analytics",
  requireRole("admin", "super_admin"),
  async (req, res): Promise<void> => {
    const [trips, recommendations] = await Promise.all([
      db.select().from(tripPlansTable),
      db.select().from(tripRecommendationsTable),
    ]);

    const byStatus = trips.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    }, {});

    const byTravelType = trips.reduce<Record<string, number>>((acc, t) => {
      acc[t.travelType] = (acc[t.travelType] ?? 0) + 1;
      return acc;
    }, {});

    const byBudgetCat = trips.reduce<Record<string, number>>((acc, t) => {
      acc[t.budgetCategory] = (acc[t.budgetCategory] ?? 0) + 1;
      return acc;
    }, {});

    const interestCounts: Record<string, number> = {};
    trips.forEach((t) => {
      const interests = (t.interests as string[]) ?? [];
      interests.forEach((i) => {
        interestCounts[i] = (interestCounts[i] ?? 0) + 1;
      });
    });

    const topInterests = Object.entries(interestCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([interest, count]) => ({ interest, count }));

    // Hotel/restaurant/spa recommendation frequency
    const hotelCounts: Record<string, number> = {};
    const restaurantCounts: Record<string, number> = {};
    const placeCounts: Record<string, number> = {};

    recommendations.forEach((r) => {
      (r.hotels as any[] ?? []).forEach((h: any) => {
        hotelCounts[h.name] = (hotelCounts[h.name] ?? 0) + 1;
      });
      (r.restaurants as any[] ?? []).forEach((re: any) => {
        restaurantCounts[re.name] = (restaurantCounts[re.name] ?? 0) + 1;
      });
      (r.touristPlaces as any[] ?? []).forEach((p: any) => {
        placeCounts[p.name] = (placeCounts[p.name] ?? 0) + 1;
      });
    });

    const topHotels = Object.entries(hotelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    const topRestaurants = Object.entries(restaurantCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    const topPlaces = Object.entries(placeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    res.json({
      totalTrips: trips.length,
      recommendationsGenerated: recommendations.length,
      byStatus,
      byTravelType,
      byBudgetCat,
      topInterests,
      topHotels,
      topRestaurants,
      topPlaces,
    });
  },
);

export default router;
