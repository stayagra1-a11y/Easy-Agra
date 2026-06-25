import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/api-request";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Train, Bus, Plane, Search, PlusCircle, Pencil, Trash2, Loader2,
  Phone, MapPin, Clock, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
  railway_station: { icon: Train, label: "Railway", color: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  bus_stand: { icon: Bus, label: "Bus", color: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  airport: { icon: Plane, label: "Airport", color: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
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

async function fetchAdminTransport(type?: string, search?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (search) params.set("search", search);
  const res = await fetch(`${BASE}/api/admin/transport?${params.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default function AdminTransport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transport", filterType, search],
    queryFn: () => fetchAdminTransport(filterType || undefined, search || undefined),
  });

  const locations: TransportLocation[] = data?.locations ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiRequest(`${BASE}/api/admin/transport/${deleteId}`, { method: "DELETE" });
      toast({ title: "Deleted", description: "Transport location removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-transport"] });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filters = [
    { key: "railway_station", label: "Railway", icon: Train },
    { key: "bus_stand", label: "Bus", icon: Bus },
    { key: "airport", label: "Airport", icon: Plane },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transport Locations</h1>
            <p className="text-sm text-muted-foreground">Manage railway stations, bus stands, and airports</p>
          </div>
          <Link href="/admin/transport/new">
            <Button className="gap-1.5">
              <PlusCircle className="h-4 w-4" /> Add Location
            </Button>
          </Link>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {filters.map((f) => {
              const Icon = f.icon;
              const active = filterType === f.key;
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="gap-1"
                  onClick={() => setFilterType(active ? null : f.key)}
                >
                  <Icon className="h-3.5 w-3.5" /> {f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No transport locations found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {locations.map((loc) => {
              const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.railway_station;
              const Icon = cfg.icon;
              return (
                <Card key={loc.id} className="overflow-hidden">
                  <div className="flex">
                    {loc.mainImage && (
                      <div className="w-28 h-28 shrink-0 bg-muted">
                        <img src={loc.mainImage} alt={loc.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                          <Badge className={`text-xs ${cfg.badge}`} variant="secondary">
                            {cfg.label}
                          </Badge>
                          {!loc.isActive && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/transport/${loc.id}/edit`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteId(loc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm">{loc.name}</h3>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {loc.address && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {loc.address}
                          </p>
                        )}
                        {loc.timings && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {loc.timings}
                          </p>
                        )}
                        {loc.contactNumber && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {loc.contactNumber}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transport Location?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
