import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut, Map, Bell, User, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, getGetMeQueryKey, useGetUnreadNotificationCount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ownerLabels: Record<string, string> = {
  hotel_owner: "Hotel Owner",
  restaurant_owner: "Restaurant Owner",
  spa_owner: "Spa Owner",
};

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const bottomNav: NavItem[] = [
  { href: "/hotel-owner/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["hotel_owner"] },
  { href: "/restaurant-owner/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["restaurant_owner"] },
  { href: "/spa-owner/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["spa_owner"] },
  { href: "/hotel-owner/hotels", icon: Building2, label: "Hotels", roles: ["hotel_owner"] },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: unreadData } = useGetUnreadNotificationCount();

  const handleLogout = () => {
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    logoutMutation.mutate();
    window.location.href = "/login";
  };

  const roleLabel = ownerLabels[user?.role || ""] || "Owner";
  const role = user?.role || "";

  // Filter nav items for current role
  const visibleNav = bottomNav.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  });

  // Deduplicate: if Dashboard appears more than once (shouldn't after filter), keep first
  const navItems = visibleNav.filter((item, idx) => {
    return visibleNav.findIndex((i) => i.label === item.label) === idx;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <div>
              <div className="font-bold text-sm">Easy Agra</div>
              <div className="text-xs text-primary-foreground/70">{roleLabel} Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border-2 border-accent">
              <AvatarImage src={user?.profilePhoto || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                {user?.fullName?.charAt(0) || "O"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = location === href || location.startsWith(href + "/");
            const showBadge = label === "Alerts" && (unreadData?.count ?? 0) > 0;

            return (
              <Link key={href} href={href}>
                <button
                  className={`flex flex-col items-center gap-1 px-4 py-2.5 text-xs transition-colors relative ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-accent text-accent-foreground border-0">
                        {(unreadData?.count ?? 0) > 9 ? "9+" : unreadData!.count}
                      </Badge>
                    )}
                  </div>
                  <span className={isActive ? "font-semibold" : ""}>{label}</span>
                  {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary rounded-full" />}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
