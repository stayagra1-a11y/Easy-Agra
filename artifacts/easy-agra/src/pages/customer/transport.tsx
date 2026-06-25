import { useState } from "react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Search, Train, Bus, Plane, MapPin, Phone, Clock, ArrowRight, Loader2, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
  railway_station: {
    icon: Train,
    label: "Railway Station",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  bus_stand: {
    icon: Bus,
    label: "Bus Stand",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  airport: {
    icon: Plane,
    label: "Airport",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
};

interface TransportLocation {
  id: number;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  googleMapsLink: string | null;
  contactNumber: string | null;
  timings: string | null;
  mainImage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchTransport(type?: string, search?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("search", search);
  params.set("limit", "50");
  const res = await fetch(`${BASE}/api/transport?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load transport");
  return res.json();
}

export default function TransportPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["transport", activeFilter, search],
    queryFn: () => fetchTransport(activeFilter || undefined, search || undefined),
  });

  const locations: TransportLocation[] = data?.locations ?? [];

  const filters = [
    { key: "railway_station", icon: Train, label: "Railway" },
    { key: "bus_stand", icon: Bus, label: "Bus" },
    { key: "airport", icon: Plane, label: "Airport" },
  ];

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Transport</h1>
          <p className="text-sm text-muted-foreground">Agra ke railway stations, bus stands, aur airport</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = activeFilter === f.key;
            return (
              <Button
                key={f.key}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`flex-1 gap-1.5 ${isActive ? "" : "text-muted-foreground"}`}
                onClick={() => setActiveFilter(isActive ? null : f.key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </Button>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No transport locations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => {
              const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.railway_station;
              const Icon = cfg.icon;
              return (
                <Link key={loc.id} href={`/transport/${loc.id}`}>
                  <Card className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${cfg.color}`}>
                    <div className="flex">
                      {loc.mainImage && (
                        <div className="w-24 h-24 shrink-0">
                          <img src={loc.mainImage} alt={loc.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3.5 w-3.5" />
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${cfg.badge}`} variant="secondary">
                            {cfg.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-sm truncate">{loc.name}</h3>
                        {loc.address && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {loc.address}
                          </p>
                        )}
                        {loc.timings && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {loc.timings}
                          </p>
                        )}
                        {loc.contactNumber && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {loc.contactNumber}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5 text-xs font-medium text-primary">
                          View Details <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
