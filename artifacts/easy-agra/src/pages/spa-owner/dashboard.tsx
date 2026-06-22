import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetSpaOwnerStats, useGetOwnerSpaAppointments, useGetEarningsOwner } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Building2, Clock, CalendarDays, PlusCircle,
  Settings, CalendarCheck, TrendingUp, Users,
  ArrowRight, CheckCircle2, Loader2,
} from "lucide-react";
import { format } from "date-fns";

const APPT_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-700" },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700" },
};

function parseNum(v: unknown): number {
  if (v == null) return 0;
  return parseFloat(String(v));
}

export default function SpaOwnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetSpaOwnerStats();
  const { data: recentAppts } = useGetOwnerSpaAppointments({ limit: 5 });
  const { data: pendingAppts } = useGetOwnerSpaAppointments({ status: "pending", limit: 50 });
  const { data: todayAppts } = useGetOwnerSpaAppointments({ limit: 50 });
  const { data: earningsData, isLoading: earningsLoading } = useGetEarningsOwner({});

  const earnings = earningsData?.summary;
  const thisMonthNet = (() => {
    const thisMonth = format(new Date(), "yyyy-MM");
    return earnings?.monthlyRevenue?.find((m: any) => m.month === thisMonth)?.net ?? 0;
  })();

  const statCards = [
    {
      label: "Aaj ki Appointments",
      value: todayAppts?.total ?? 0,
      icon: CalendarCheck,
      color: "text-blue-600 bg-blue-50",
      href: "/spa-owner/appointments",
    },
    {
      label: "Pending Requests",
      value: pendingAppts?.total ?? 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      href: "/spa-owner/appointments",
    },
    {
      label: "Approved Spas",
      value: stats?.activeSpas ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50",
      href: "/spa-owner/spas",
    },
    {
      label: "Total Spas",
      value: stats?.totalSpas ?? 0,
      icon: Building2,
      color: "text-teal-600 bg-teal-50",
      href: "/spa-owner/spas",
    },
    {
      label: "Total Appointments",
      value: stats?.totalAppointments ?? 0,
      icon: Users,
      color: "text-purple-600 bg-purple-50",
      href: "/spa-owner/appointments",
    },
    {
      label: "Draft Spas",
      value: stats?.draftSpas ?? 0,
      icon: CalendarDays,
      color: "text-slate-600 bg-slate-50",
      href: "/spa-owner/spas",
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
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium text-xs">Spa Owner</span>
            </div>
            <h1 className="text-xl font-bold">
              Namaste, {user?.fullName?.split(" ")[0]} ji! 🙏
            </h1>
            <p className="text-white/70 text-sm mt-1">Easy Agra par apka spa manage karein</p>
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
        {!isLoading && (pendingAppts?.total ?? 0) > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingAppts!.total} appointment{(pendingAppts!.total ?? 0) !== 1 ? "s" : ""} ka wait hai
                  </p>
                  <p className="text-xs text-amber-700">Jaldi respond karein — guests wait kar rahe hain</p>
                </div>
              </div>
              <Link href="/spa-owner/appointments">
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
          <div className="grid grid-cols-3 gap-2.5">
            {statCards.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href}>
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95">
                  <CardContent className="p-3">
                    <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-xl font-bold">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : value}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/spa-owner/spas/new">
              <Button className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <PlusCircle className="h-4 w-4" /> Naya Spa
              </Button>
            </Link>
            <Link href="/spa-owner/appointments">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs border-primary/30 text-primary" size="sm">
                <CalendarCheck className="h-4 w-4" /> Appointments
              </Button>
            </Link>
            <Link href="/spa-owner/services">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <Sparkles className="h-4 w-4" /> Services
              </Button>
            </Link>
            <Link href="/spa-owner/spas">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs" size="sm">
                <Settings className="h-4 w-4" /> Mere Spas
              </Button>
            </Link>
            <Link href="/spa-owner/earnings">
              <Button variant="outline" className="w-full h-14 flex-col gap-1 text-xs col-span-2" size="sm">
                <TrendingUp className="h-4 w-4" /> Kamaayi Dekho
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Haaliya Appointments</h2>
            <Link href="/spa-owner/appointments">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-primary">
                Sab Dekho <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          {(recentAppts?.appointments ?? []).length === 0 ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Abhi koi appointment nahi</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Jab log book karenge, yahan dikhega</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {(recentAppts?.appointments ?? []).map((a: any) => {
                const sc = APPT_STATUS[a.status] ?? APPT_STATUS.pending;
                return (
                  <Card key={a.id} className="shadow-sm">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{a.customerName || "Guest"}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(a.appointmentDate), "dd MMM yyyy")}</span>
                            {a.appointmentTime && <span>· {a.appointmentTime}</span>}
                          </div>
                          {a.serviceName && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> {a.serviceName}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                            {sc.label}
                          </span>
                          {a.finalAmount && (
                            <p className="text-sm font-bold text-primary mt-1">
                              ₹{parseNum(a.finalAmount).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
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
