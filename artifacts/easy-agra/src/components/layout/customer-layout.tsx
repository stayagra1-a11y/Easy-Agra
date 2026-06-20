import { Link, useLocation } from "wouter";
import { Home, Bell, User, Settings, LogOut, Map, CalendarDays, Star, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: unreadData } = useGetUnreadNotificationCount();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    logoutMutation.mutate();
    window.location.href = "/login";
  };

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/customer/bookings", icon: CalendarDays, label: "Bookings" },
    { href: "/restaurants", icon: Utensils, label: "Dine" },
    { href: "/customer/reviews", icon: Star, label: "Reviews" },
    { href: "/notifications", icon: Bell, label: "Alerts", badge: unreadData?.count },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <span className="font-bold text-lg tracking-tight">Easy Agra</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border-2 border-accent">
              <AvatarImage src={user?.profilePhoto || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                {user?.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button onClick={handleLogout} className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-lg">
        <div className="flex max-w-lg mx-auto">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                  {badge ? (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-accent text-accent-foreground border-0">
                      {badge > 9 ? "9+" : badge}
                    </Badge>
                  ) : null}
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? "text-primary" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
