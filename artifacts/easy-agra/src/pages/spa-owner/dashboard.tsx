import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetSpaOwnerStats } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Building2,
  Clock,
  CalendarDays,
  PlusCircle,
  Settings,
  Loader2,
} from "lucide-react";

const FACILITIES = [
  "Steam Bath",
  "Sauna",
  "Massage Rooms",
  "Jacuzzi",
  "Aromatherapy",
  "Couples Spa",
  "Beauty Treatments",
  "Wellness Packages",
];

export default function SpaOwnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetSpaOwnerStats();

  const statCards = [
    {
      label: "Total Spas",
      value: isLoading ? "…" : (stats?.totalSpas ?? 0),
      icon: Building2,
      color: "text-teal-600 bg-teal-50",
    },
    {
      label: "Approved Spas",
      value: isLoading ? "…" : (stats?.activeSpas ?? 0),
      icon: Sparkles,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Pending Review",
      value: isLoading ? "…" : (stats?.pendingSpas ?? 0),
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Draft Spas",
      value: isLoading ? "…" : (stats?.draftSpas ?? 0),
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
    },
  ];

  const quickActions = [
    { label: "Add Spa", href: "/spa-owner/spas/new", icon: PlusCircle, variant: "default" as const },
    { label: "Manage Spas", href: "/spa-owner/spas", icon: Settings, variant: "outline" as const },
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div
                  className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mb-2`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    value
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, href, icon: Icon, variant }) => (
                <Link key={href} href={href}>
                  <Button variant={variant} className="w-full gap-2 h-11">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Facilities Reference */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Available Facilities</p>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs">
                  {f}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Guide */}
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              Spa Approval Workflow
            </p>
            {[
              { status: "Draft", desc: "Saved, not yet submitted", color: "bg-gray-100 text-gray-700" },
              { status: "Pending", desc: "Awaiting admin review", color: "bg-amber-100 text-amber-700" },
              { status: "Approved", desc: "Live — visible to customers", color: "bg-green-100 text-green-700" },
              { status: "Rejected", desc: "Review feedback & resubmit", color: "bg-red-100 text-red-700" },
              { status: "Suspended", desc: "Contact support", color: "bg-orange-100 text-orange-700" },
            ].map(({ status, desc, color }) => (
              <div key={status} className="flex items-center gap-2">
                <Badge className={`text-xs font-medium border-0 ${color}`}>
                  {status}
                </Badge>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
