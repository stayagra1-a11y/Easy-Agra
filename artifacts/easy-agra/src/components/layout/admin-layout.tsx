import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileCheck, Bell, Activity, Settings, LogOut, Map, Menu, X, Shield, BookOpen, BarChart2, Star, Utensils, Sparkles, Landmark, IndianRupee, TrendingUp, FileBarChart, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  href: string;
  icon: any;
  label: string;
  superAdminOnly?: boolean;
}

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/tourist-places", icon: Landmark, label: "Tourist Places" },
  { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
  { href: "/admin/booking-analytics", icon: BarChart2, label: "Analytics" },
  { href: "/admin/payments", icon: IndianRupee, label: "Payments" },
  { href: "/admin/revenue", icon: TrendingUp, label: "Revenue" },
  { href: "/admin/reports", icon: FileBarChart, label: "Reports" },
  { href: "/admin/reviews", icon: Star, label: "Reviews" },
  { href: "/admin/restaurants", icon: Utensils, label: "Restaurants" },
  { href: "/admin/spas", icon: Sparkles, label: "Spas" },
  { href: "/admin/support", icon: LifeBuoy, label: "Support Tickets" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/owner-requests", icon: FileCheck, label: "Owner Requests" },
  { href: "/admin/activity-logs", icon: Activity, label: "Activity Logs" },
  { href: "/admin/notifications", icon: Bell, label: "Announcements" },
];

const superAdminNavItems: NavItem[] = [
  { href: "/super-admin/dashboard", icon: Shield, label: "Super Dashboard" },
  { href: "/admin/tourist-places", icon: Landmark, label: "Tourist Places" },
  { href: "/admin/bookings", icon: BookOpen, label: "Bookings" },
  { href: "/admin/booking-analytics", icon: BarChart2, label: "Analytics" },
  { href: "/admin/payments", icon: IndianRupee, label: "Payments" },
  { href: "/admin/revenue", icon: TrendingUp, label: "Revenue" },
  { href: "/admin/reports", icon: FileBarChart, label: "Reports" },
  { href: "/admin/reviews", icon: Star, label: "Reviews" },
  { href: "/admin/restaurants", icon: Utensils, label: "Restaurants" },
  { href: "/admin/spas", icon: Sparkles, label: "Spas" },
  { href: "/admin/support", icon: LifeBuoy, label: "Support Tickets" },
  { href: "/super-admin/support-analytics", icon: BarChart2, label: "Support Analytics" },
  { href: "/super-admin/users", icon: Users, label: "All Users" },
  { href: "/super-admin/admins", icon: Shield, label: "Manage Admins" },
  { href: "/super-admin/owner-requests", icon: FileCheck, label: "Owner Requests" },
  { href: "/super-admin/platform-settings", icon: Settings, label: "Platform Settings" },
  { href: "/super-admin/activity-logs", icon: Activity, label: "Activity Logs" },
  { href: "/admin/notifications", icon: Bell, label: "Announcements" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();

  const isSuperAdmin = user?.role === "super_admin";
  const navItems = isSuperAdmin ? superAdminNavItems : adminNavItems;

  const handleLogout = () => {
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    logoutMutation.mutate();
    window.location.href = "/login";
  };

  const roleName = isSuperAdmin ? "Super Admin" : "Admin";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-6 py-4 border-b border-sidebar-border">
          <Map className="h-6 w-6 text-sidebar-primary" />
          <div>
            <div className="font-bold text-lg">Easy Agra</div>
            <div className="text-xs text-sidebar-foreground/60">{roleName} Panel</div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = location === href || location.startsWith(href + "/");
              return (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-3">
            <Avatar className="h-8 w-8 border-2 border-sidebar-primary">
              <AvatarImage src={user?.profilePhoto || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                {user?.fullName?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-border shadow-sm flex items-center px-4 py-3 gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <span className="text-sm text-muted-foreground">Welcome back, </span>
            <span className="font-semibold">{user?.fullName}</span>
          </div>
          <Badge variant="outline" className="text-xs">{roleName}</Badge>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
