import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut, Map, Bell, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, getGetMeQueryKey, useGetUnreadNotificationCount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ownerLabels: Record<string, string> = {
  hotel_owner: "Hotel Owner",
  restaurant_owner: "Restaurant Owner",
  spa_owner: "Spa Owner",
};

export function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();
  const { data: unreadData } = useGetUnreadNotificationCount();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    window.location.href = "/login";
  };

  const roleLabel = ownerLabels[user?.role || ""] || "Owner";
  const dashboardPath = `/${user?.role?.replace(/_/g, "-")}/dashboard`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <div>
              <div className="font-bold text-sm">Easy Agra</div>
              <div className="text-xs text-primary-foreground/70">{roleLabel} Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadData?.count ? (
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center bg-accent text-accent-foreground border-0">
                  {unreadData.count > 9 ? "9+" : unreadData.count}
                </Badge>
              ) : null}
            </div>
            <Avatar className="h-8 w-8 border-2 border-accent">
              <AvatarImage src={user?.profilePhoto || undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                {user?.fullName?.charAt(0) || "O"}
              </AvatarFallback>
            </Avatar>
            <button onClick={handleLogout} className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      <footer className="bg-white border-t border-border py-3 px-4 text-center text-xs text-muted-foreground">
        Easy Agra &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
