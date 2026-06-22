import { useAuth } from "@/hooks/use-auth";
import {
  useGetUnreadNotificationCount, useListReservations,
  useListRestaurants, useGetEarningsOwner,
} from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  UtensilsCrossed, Star, Users, TrendingUp, Bell,
  PlusCircle, ClipboardList, CalendarCheck, ArrowRight,
  Clock, CheckCircle2, IndianRupee, ChefHat,
} from "lucide-react";
import { format } from "date-fns";

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
};

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

export default function RestaurantOwnerDashboard() {
  const { user } = useAuth();
  const { data: unread } = useGetUnreadNotificationCount();
  const { data: restaurantsPage } = useListRestaurants({ limit: 10 });
  const { data: pendingRes } = useListReservations({ status: "pending", limit: 50 });
  const { data: todayRes } = useListReservations({ date: format(new Date(), "yyyy-MM-dd"), limit: 50 });
  const { data: recentRes } = useListReservations({ limit: 5 });
  const { data: earningsData, isLoading: earningsLoading } = useGetEarningsOwner({});

  const restaurants = restaurantsPage?.restaurants ?? [];
  const earnings = earningsData?.summary;

  const thisMonthNet = (() => {
    const thisMonth = format(new Date(), "yyyy-MM");
    return earnings?.monthlyRevenue?.find((m: any) => m.month === thisMonth)?.net ?? 0;
  })();

  const statCards = [
    {
      label: "Aaj ki Reservations",
      value: todayRes?.total ?? 0,
      icon: CalendarCheck,
      color: "text-blue-600 bg-blue-50",
      href: "/restaurant-owner/reservations",
    },
    {
      label: "Pending Requests",
      value: pendingRes?.total ?? 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      href: "/restaurant-owner/reservations",
    },
    {
      label: "Mere Restaurants",
      value: restaurants.length,
      icon: UtensilsCrossed,
      color: "text-green-600 bg-green-50",
      href: "/restaurant-owner/restaurants",
    },
    {
      label: "Notifications",
      value: unread?.count ?? 0,
      icon: Bell,
      color: "text-purple-600 bg-purple-50",
      href: "/customer/notifications",
    },
  ];

  return (
    <OwnerLayout>
      <div className="space-y-5 pb-6">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary/85 text-white rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium text-xs">Restaurant Owner</span>
            </div>
            <h1 className="text-xl font-bold">
              Namaste, {user?.fullName?.split(" ")[0]} ji! 🙏
            </h1>
            <p className="text-white/70 text-sm mt-1">Easy Agra par apka restaurant manage karein</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/70">Is Mahine</p>
                <p className="font-bold text-lg">
                  {earningsLoading ? "…" : `₹${parseNum(thisMonthNet).toLocaleString("en-IN")}`}
                </p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/70">Kul Kamaayi</p>
                <p className="font-bold text-lg">
                  {earningsLoading ? "…" : `₹${parseNum(earnings?.totalEarnings).toLocaleString("en-IN")}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Alert */}
        {(pendingRes?.total ?? 0) > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingRes!.total} reservation{(pendingRes!.total ?? 0) !== 1 ? "s" : ""} ka wait hai
                  </p>
                  <p className="text-xs text-amber-700">Jaldi confirm karein — guests wait kar rahe hain</p>
                </div>
              </div>
              <Link href="/restaurant-owner/reservations">
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0">
                  Dekho
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Aaj Ka Haal</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {statCards.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href}>
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95">
                  <CardContent className="p-4">
                    <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/restaurant-owner/restaurants/new">
              <Button className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <PlusCircle className="h-5 w-5" /> Naya Restaurant
              </Button>
            </Link>
            <Link href="/restaurant-owner/reservations">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs border-primary/30 text-primary" size="sm">
                <CalendarCheck className="h-5 w-5" /> Reservations
              </Button>
            </Link>
            <Link href="/restaurant-owner/menu">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <ChefHat className="h-5 w-5" /> Menu
              </Button>
            </Link>
            <Link href="/restaurant-owner/earnings">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <TrendingUp className="h-5 w-5" /> Kamaayi
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Reservations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Haaliya Reservations</h2>
            <Link href="/restaurant-owner/reservations">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                Sab Dekho <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {(recentRes?.reservations ?? []).length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Abhi koi reservation nahi</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Jab log reserve karenge, yahan dikhega</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {(recentRes?.reservations ?? []).map((r: any) => {
                const sc = RESERVATION_STATUS[r.status] ?? RESERVATION_STATUS.pending;
                return (
                  <Card key={r.id} className="shadow-sm">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{r.customerName || "Guest"}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(r.reservationDate), "dd MMM yyyy")}</span>
                            {r.reservationTime && <span>· {r.reservationTime}</span>}
                            {r.guestCount && (
                              <span className="flex items-center gap-0.5">
                                <Users className="h-3 w-3" /> {r.guestCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* My Restaurants */}
        {restaurants.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mere Restaurants</h2>
              <Link href="/restaurant-owner/restaurants">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                  Sab Dekho <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {restaurants.slice(0, 4).map((r: any) => (
                <Card key={r.id} className="shadow-sm overflow-hidden">
                  {r.coverImage && (
                    <img src={r.coverImage} alt={r.name} className="w-full h-20 object-cover" />
                  )}
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.cuisineType || r.category || "—"}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                      r.status === "approved" ? "bg-green-100 text-green-700" :
                      r.status === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {r.status === "approved" ? "Live" : r.status === "pending" ? "Review" : r.status}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </OwnerLayout>
  );
}
