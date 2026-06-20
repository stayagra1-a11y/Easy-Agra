import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetSpaOwnerStats } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Building2, Clock, CalendarDays, PlusCircle,
  Settings, Loader2, CalendarCheck, BadgeIndianRupee, TrendingUp,
} from "lucide-react";

export default function SpaOwnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetSpaOwnerStats();

  const statCards = [
    {
      label: "Total Spas",
      value: stats?.totalSpas ?? 0,
      icon: Building2,
      color: "text-teal-600 bg-teal-50",
    },
    {
      label: "Approved",
      value: stats?.activeSpas ?? 0,
      icon: Sparkles,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Pending Review",
      value: stats?.pendingSpas ?? 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Draft",
      value: stats?.draftSpas ?? 0,
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total Appts",
      value: stats?.totalAppointments ?? 0,
      icon: CalendarCheck,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Pending Appts",
      value: stats?.pendingAppointments ?? 0,
      icon: TrendingUp,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  const monthlyRevenue = stats?.monthlyRevenue ?? 0;

  const quickActions = [
    { label: "Add Spa", href: "/spa-owner/spas/new", icon: PlusCircle, variant: "default" as const },
    { label: "Manage Spas", href: "/spa-owner/spas", icon: Settings, variant: "outline" as const },
    { label: "Appointments", href: "/spa-owner/appointments", icon: CalendarCheck, variant: "outline" as const },
  ];

  return (
    <OwnerLayout>
      <div className="space-y-5">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-accent font-medium text-sm">Spa Owner</span>
          </div>
          <h1 className="text-xl font-bold">
            Welcome, {user?.fullName?.split(" ")[0]}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Manage your spa listings on Easy Agra
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className={`h-8 w-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-lg font-bold">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : value}
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Revenue */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <BadgeIndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month's Revenue</p>
              <p className="text-xl font-bold text-emerald-700">
                {isLoading ? "…" : `₹${monthlyRevenue.toLocaleString()}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map(({ label, href, icon: Icon, variant }) => (
                <Link key={href} href={href}>
                  <Button variant={variant} className="w-full flex flex-col gap-1 h-auto py-3 px-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending alert */}
        {!isLoading && (stats?.pendingAppointments ?? 0) > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats!.pendingAppointments} appointment{stats!.pendingAppointments !== 1 ? "s" : ""} awaiting response
                  </p>
                  <p className="text-xs text-amber-700">Respond promptly to keep customers happy</p>
                </div>
              </div>
              <Link href="/spa-owner/appointments">
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0">
                  View
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
