import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Star, Users, TrendingUp, Bell, CheckCircle2 } from "lucide-react";

export default function RestaurantOwnerDashboard() {
  const { user } = useAuth();
  const { data: unread } = useGetUnreadNotificationCount();

  return (
    <OwnerLayout>
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="h-5 w-5 text-accent" />
            <span className="text-accent font-medium text-sm">Restaurant Owner</span>
          </div>
          <h1 className="text-xl font-bold">Welcome, {user?.fullName?.split(" ")[0]}</h1>
          <p className="text-white/70 text-sm mt-1">Manage your restaurant on Easy Agra</p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Your account is active</p>
              <p className="text-xs text-green-600 mt-0.5">Restaurant listing features coming soon</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Views", value: "—", icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
            { label: "Reservations", value: "—", icon: Users, color: "text-green-600 bg-green-50" },
            { label: "Rating", value: "—", icon: Star, color: "text-yellow-600 bg-yellow-50" },
            { label: "Notifications", value: unread?.count ?? 0, icon: Bell, color: "text-purple-600 bg-purple-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-5 text-center">
            <UtensilsCrossed className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">Restaurant Management</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Menu management, table reservations, and review features are coming soon!</p>
            <Badge variant="outline" className="mt-3">Coming in Part 2</Badge>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
