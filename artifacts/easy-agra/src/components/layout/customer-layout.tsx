import { Link, useLocation } from "wouter";
import { Home, Bell, User, Settings, LogOut, Map, CalendarDays, Star, Utensils, Sparkles, Landmark, IndianRupee, LifeBuoy, ReceiptText, Menu, Building2, ChevronRight, X, ShieldCheck, FileText, Phone, Train, Puzzle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGetUnreadNotificationCount, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function CustomerLayout({ children, backHref, backLabel }: { children: React.ReactNode; backHref?: string; backLabel?: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: unreadData } = useGetUnreadNotificationCount();
  const logoutMutation = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    logoutMutation.mutate();
    window.location.href = "/login";
  };

  const navItems: { href: string; icon: any; label: string; badge?: number }[] = [
    { href: "/", icon: Home, label: t("home") },
    { href: "/hotels", icon: Building2, label: t("hotels") },
    { href: "/restaurants", icon: Utensils, label: t("restaurants") },
    { href: "/transport", icon: Train, label: "Transport" },
    { href: "/profile", icon: User, label: t("profile") },
  ];

  const menuLinks = [
    { href: "/profile", icon: User, label: t("profile") },
    { href: "/customer/bookings", icon: CalendarDays, label: t("my_bookings") },
    { href: "/hotels", icon: Building2, label: t("hotels") },
    { href: "/transport", icon: Train, label: "Transport" },
    { href: "/restaurants", icon: Utensils, label: t("restaurants") },
    { href: "/spas", icon: Sparkles, label: t("spas") },
    { href: "/puzzle", icon: Puzzle, label: "Puzzle" },
    { href: "/places", icon: Landmark, label: t("places") },
    { href: "/trips", icon: Map, label: t("trips") ?? "Trips" },
    { href: "/my-payments", icon: IndianRupee, label: t("my_payments") },
    { href: "/my-reservations", icon: Star, label: t("my_reservations") },
    { href: "/refunds", icon: ReceiptText, label: t("refunds") ?? "Refunds" },
    { href: "/support/tickets", icon: LifeBuoy, label: t("help_support") },
    { href: "/notifications", icon: Bell, label: t("notifications") },
    { href: "/settings", icon: Settings, label: t("settings") },
    { href: "/become-owner", icon: Building2, label: t("list_your_business"), highlight: true },
  ];

  const infoLinks = [
    { href: "/support/tickets", icon: Phone, label: t("contact_us") },
    { href: "/privacy", icon: ShieldCheck, label: t("privacy_policy") },
    { href: "/terms", icon: FileText, label: t("terms_of_use") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-[9999] bg-primary text-primary-foreground shadow-md will-change-transform pt-[env(safe-area-inset-top)]"
        style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {backHref ? (
              <button
                onClick={() => window.history.back()}
                className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors flex items-center gap-1"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
                {backLabel && <span className="text-sm font-medium">{backLabel}</span>}
              </button>
            ) : (
              <button
                onClick={() => setMenuOpen(true)}
                className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Map className="h-5 w-5 text-accent" />
              <span className="font-bold text-lg tracking-tight">Easy Agra</span>
            </div>
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

      {/* Side drawer menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          {/* Drawer header */}
          <div className="bg-primary text-primary-foreground px-5 pt-6 pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-accent" />
                <span className="font-bold text-lg">Easy Agra</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-primary-foreground/10 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-accent">
                <AvatarImage src={user?.profilePhoto || undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">
                  {user?.fullName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{user?.fullName}</p>
                <p className="text-xs text-primary-foreground/60 capitalize">{user?.role?.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto py-3">
            {menuLinks.map(({ href, icon: Icon, label, highlight }: any) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                  highlight
                    ? "text-primary font-semibold bg-primary/5 border-l-4 border-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm">{label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}

            {/* Info links section */}
            <div className="mt-2 pt-2 border-t border-border mx-3">
              <p className="text-xs text-muted-foreground uppercase font-semibold px-2 py-2 tracking-wide">Information</p>
              {infoLinks.map(({ href, icon: Icon, label }: any) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-2 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Logout */}
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-1 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9998] bg-white border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]">
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
