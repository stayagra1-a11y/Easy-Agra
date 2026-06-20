import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { tripPlansTable } from "./trip_plans";

export interface DayActivity {
  time: "morning" | "afternoon" | "evening";
  type: "attraction" | "restaurant" | "spa" | "travel" | "free" | "hotel";
  name: string;
  description?: string;
  duration?: string;
  estimatedCost?: number;
  googleMapsLink?: string;
  entityId?: number;
  entityType?: string;
  lat?: number;
  lng?: number;
}

export interface DayPlan {
  day: number;
  date?: string;
  title: string;
  theme: string;
  activities: DayActivity[];
  dailyCost: number;
}

export interface CostItem {
  category: string;
  label: string;
  cost: number;
  breakdown: string;
}

export interface CostEstimation {
  hotelCost: number;
  restaurantCost: number;
  spaCost: number;
  ticketCost: number;
  travelCost: number;
  miscCost: number;
  totalCost: number;
  perPersonCost: number;
  items: CostItem[];
}

export interface RecommendedHotel {
  id: number;
  name: string;
  category: string;
  address?: string;
  googleMapLink?: string;
  amenities?: string[];
  estimatedCostPerNight: number;
  coverImage?: string;
}

export interface RecommendedRestaurant {
  id: number;
  name: string;
  cuisineType?: string;
  address?: string;
  estimatedCostPerPerson: number;
  coverPhoto?: string;
}

export interface RecommendedSpa {
  id: number;
  name: string;
  address?: string;
  estimatedCostPerSession: number;
  coverPhoto?: string;
  facilities?: string[];
}

export interface RecommendedPlace {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  ticketPriceIndian: number;
  googleMapsLink: string;
  lat: number;
  lng: number;
  interests: string[];
  bestTime?: string;
  duration?: string;
}

export const tripRecommendationsTable = pgTable("trip_recommendations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => tripPlansTable.id),
  tripRef: text("trip_ref").notNull(),
  hotels: jsonb("hotels").$type<RecommendedHotel[]>().notNull().default([]),
  restaurants: jsonb("restaurants").$type<RecommendedRestaurant[]>().notNull().default([]),
  spas: jsonb("spas").$type<RecommendedSpa[]>().notNull().default([]),
  touristPlaces: jsonb("tourist_places").$type<RecommendedPlace[]>().notNull().default([]),
  itinerary: jsonb("itinerary").$type<DayPlan[]>().notNull().default([]),
  costEstimation: jsonb("cost_estimation").$type<CostEstimation>(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
