import { useAuth } from "@/hooks/use-auth";
import { useGetHotelStats, useListHotels } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, PlusCircle, ClipboardList, CheckCircle2, Clock, XCircle, AlertCircle, Layers, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "default" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  suspended: { label: "Suspended", variant: "outline" },
};

const CATEGORY_LABELS: Record<string, string> = {
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
  luxury: "Luxury",
};

export default function HotelOwnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetHotelStats();
  const { data: hotelsPage } = useListHotels({ limit: 3 });

  const recentHotels = hotelsPage?.hotels ?? [];

  const statCards = [
    { label: "Total Hotels", value: stats?.totalHotels ?? 0, icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: "Approved", value: stats?.approvedHotels ?? 0, icon: CheckCircle2, color: "bg-green-50 text-green-600" },
    { label: "Pending Review", value: stats?.pendingHotels ?? 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Draft", value: stats?.draftHotels ?? 0, icon: Layers, color: "bg-slate-50 text-slate-600" },
    { label: "Rejected", value: stats?.rejectedHotels ?? 0, icon: XCircle, color: "bg-red-50 text-red-600" },
    { label: "Suspended", value: stats?.suspendedHotels ?? 0, icon: AlertCircle, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <OwnerLayout>
      <div className="space-y-5">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-accent" />
            <span className="text-accent font-medium text-sm">Hotel Owner</span>
          </div>
          <h1 className="text-xl font-bold">Welcome, {user?.fullName?.split(" ")[0]}</h1>
          <p className="text-white/70 text-sm mt-1">Manage your hotel listings on Easy Agra</p>
        </div>

        {/* Stats grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4">
                  <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{statsLoading ? "—" : value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/hotel-owner/hotels/new">
              <Button className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <PlusCircle className="h-5 w-5" />
                Add Hotel
              </Button>
            </Link>
            <Link href="/hotel-owner/hotels">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <ClipboardList className="h-5 w-5" />
                Manage Hotels
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Hotels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Hotels</h2>
            <Link href="/hotel-owner/hotels">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {recentHotels.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <Building2 className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">No hotels yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Add your first hotel to get started</p>
                <Link href="/hotel-owner/hotels/new">
                  <Button size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Add Hotel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentHotels.map((hotel) => {
                const sc = STATUS_CONFIG[hotel.status] ?? { label: hotel.status, variant: "secondary" as const };
                return (
                  <Card key={hotel.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{hotel.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {hotel.city || "—"} · {CATEGORY_LABELS[hotel.category] ?? hotel.category}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {format(new Date(hotel.createdAt), "dd MMM yyyy")}
                          </p>
                        </div>
                        <Badge variant={sc.variant} className="shrink-0 text-xs">
                          {sc.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
