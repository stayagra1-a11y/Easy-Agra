import { useAuth } from "@/hooks/use-auth";
import {
  useGetHotelStats, useListHotels, useGetRoomStats,
  useListBookings, useGetEarningsOwner,
  useGetUnreadNotificationCount,
} from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, PlusCircle, ClipboardList, CheckCircle2, Clock,
  AlertCircle, BedDouble, IndianRupee, ArrowRight,
  CalendarCheck, TrendingUp, LogIn, LogOut, Users, Bell,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  draft:      { label: "Draft",       variant: "secondary",    color: "bg-slate-100 text-slate-700" },
  pending:    { label: "Review",      variant: "default",      color: "bg-amber-100 text-amber-700" },
  approved:   { label: "Approved",    variant: "default",      color: "bg-green-100 text-green-700" },
  rejected:   { label: "Rejected",    variant: "destructive",  color: "bg-red-100 text-red-700" },
  suspended:  { label: "Suspended",   variant: "outline",      color: "bg-orange-100 text-orange-700" },
};

const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:     { label: "Pending",      color: "bg-amber-100 text-amber-700" },
  confirmed:   { label: "Confirmed",    color: "bg-blue-100 text-blue-700" },
  checked_in:  { label: "Checked In",   color: "bg-green-100 text-green-700" },
  checked_out: { label: "Checked Out",  color: "bg-slate-100 text-slate-700" },
  cancelled:   { label: "Cancelled",    color: "bg-red-100 text-red-700" },
  rejected:    { label: "Rejected",     color: "bg-red-100 text-red-700" },
};

const today = format(new Date(), "yyyy-MM-dd");

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

export default function HotelOwnerDashboard() {
  const { user } = useAuth();

  const { data: hotelStats, isLoading: statsLoading } = useGetHotelStats();
  const { data: roomStats } = useGetRoomStats({});
  const { data: hotelsPage } = useListHotels({ limit: 4 });
  const { data: earningsData, isLoading: earningsLoading } = useGetEarningsOwner({});
  const { data: unreadData } = useGetUnreadNotificationCount();

  // Aaj ke check-ins (confirmed bookings with check-in = today)
  const { data: todayCheckIns } = useListBookings({ dateFrom: today, dateTo: today, status: "confirmed", limit: 50 });
  // Active guests (currently checked in)
  const { data: activeGuests } = useListBookings({ status: "checked_in", limit: 50 });
  // Pending approvals
  const { data: pendingBookings } = useListBookings({ status: "pending", limit: 50 });
  // Recent bookings (last 5)
  const { data: recentBookings } = useListBookings({ limit: 5 });

  const recentHotels = hotelsPage?.hotels ?? [];
  const earnings = earningsData?.summary;

  const thisMonthNet = (() => {
    const thisMonth = format(new Date(), "yyyy-MM");
    return earnings?.monthlyRevenue?.find((m: any) => m.month === thisMonth)?.net ?? 0;
  })();

  const statCards = [
    {
      label: "Aaj ke Check-ins",
      value: todayCheckIns?.total ?? 0,
      icon: LogIn,
      color: "bg-blue-50 text-blue-600",
      href: "/hotel-owner/bookings",
    },
    {
      label: "Abhi Ruke Hue",
      value: activeGuests?.total ?? 0,
      icon: Users,
      color: "bg-green-50 text-green-600",
      href: "/hotel-owner/bookings",
    },
    {
      label: "Pending Requests",
      value: pendingBookings?.total ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      href: "/hotel-owner/bookings",
    },
    {
      label: "Draft Hotels",
      value: hotelStats?.draftHotels ?? 0,
      icon: Building2,
      color: "bg-slate-50 text-slate-600",
      href: "/hotel-owner/hotels",
    },
    {
      label: "Pending Hotels",
      value: hotelStats?.pendingHotels ?? 0,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      href: "/hotel-owner/hotels",
    },
    {
      label: "Approved Hotels",
      value: hotelStats?.approvedHotels ?? 0,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
      href: "/hotel-owner/hotels",
    },
    {
      label: "Notifications",
      value: unreadData?.count ?? 0,
      icon: Bell,
      color: "bg-purple-50 text-purple-600",
      href: "/owner/notifications",
    },
    {
      label: "Total Rooms",
      value: roomStats?.totalRooms ?? 0,
      icon: BedDouble,
      color: "bg-purple-50 text-purple-600",
      href: "/hotel-owner/rooms",
    },
    {
      label: "Maintenance",
      value: roomStats?.maintenanceRooms ?? 0,
      icon: AlertCircle,
      color: "bg-orange-50 text-orange-600",
      href: "/hotel-owner/rooms",
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
              <Building2 className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium text-xs">Hotel Owner</span>
            </div>
            <h1 className="text-xl font-bold">
              Namaste, {user?.fullName?.split(" ")[0]} ji! 🙏
            </h1>
            <p className="text-white/70 text-sm mt-1">Easy Agra par apka swagat hai</p>
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

        {/* Stats Grid */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Aaj Ka Haal</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {statCards.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href}>
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95">
                  <CardContent className="p-3">
                    <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-xl font-bold">{statsLoading ? "—" : value}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending Bookings Alert */}
        {(pendingBookings?.total ?? 0) > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingBookings!.total} booking{(pendingBookings!.total ?? 0) !== 1 ? "s" : ""} ka wait hai
                  </p>
                  <p className="text-xs text-amber-700">Jaldi respond karein — guests wait kar rahe hain</p>
                </div>
              </div>
              <Link href="/hotel-owner/bookings">
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0">
                  Dekho
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/hotel-owner/hotels/new">
              <Button className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <PlusCircle className="h-5 w-5" /> Naya Hotel
              </Button>
            </Link>
            <Link href="/hotel-owner/bookings">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs border-primary/30 text-primary" size="sm">
                <CalendarCheck className="h-5 w-5" /> Bookings
              </Button>
            </Link>
            <Link href="/hotel-owner/hotels">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <ClipboardList className="h-5 w-5" /> Mere Hotels
              </Button>
            </Link>
            <Link href="/hotel-owner/earnings">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <TrendingUp className="h-5 w-5" /> Kamaayi
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Haaliya Bookings</h2>
            <Link href="/hotel-owner/bookings">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                Sab Dekho <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {(recentBookings?.bookings ?? []).length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Abhi koi booking nahi</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Jab log book karenge, yahan dikhega</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {(recentBookings?.bookings ?? []).map((b) => {
                const sc = BOOKING_STATUS_CONFIG[b.status] ?? BOOKING_STATUS_CONFIG.pending;
                return (
                  <Card key={b.id} className="shadow-sm">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{(b as any).guestName || "Guest"}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <LogIn className="h-3 w-3" />
                              {format(new Date(b.checkInDate), "dd MMM")}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-0.5">
                              <LogOut className="h-3 w-3" />
                              {format(new Date(b.checkOutDate), "dd MMM")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{b.bookingRef}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                            {sc.label}
                          </span>
                          <p className="text-sm font-bold text-primary mt-1">
                            ₹{parseNum(b.finalAmount).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* My Hotels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mere Hotels</h2>
            <Link href="/hotel-owner/hotels">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                Sab Dekho <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {recentHotels.length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <Building2 className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Koi hotel nahi abhi</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Apna pehla hotel add karein</p>
                <Link href="/hotel-owner/hotels/new">
                  <Button size="sm" className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Hotel Add Karein
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {recentHotels.map((hotel) => {
                const sc = STATUS_CONFIG[hotel.status] ?? STATUS_CONFIG.draft;
                return (
                  <Card key={hotel.id} className="shadow-sm overflow-hidden">
                    {hotel.coverImage && (
                      <img src={hotel.coverImage} alt={hotel.name} className="w-full h-20 object-cover" />
                    )}
                    <CardContent className="p-3">
                      <p className="font-semibold text-sm truncate">{hotel.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{hotel.city || "—"}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${sc.color}`}>
                        {sc.label}
                      </span>
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
