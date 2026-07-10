import { Switch, Route, Router as WouterRouter } from "wouter";
import { getApiBase } from "@/lib/api-base";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { OfflineBanner } from "@/components/offline-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

// Onboarding
import Onboarding from "@/pages/onboarding";

// Auth
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import VerifyEmail from "@/pages/auth/verify-email";

// Customer
import CustomerHome from "@/pages/customer/home";
import CustomerProfile from "@/pages/customer/profile";
import CustomerSettings from "@/pages/customer/settings";
import CustomerNotifications from "@/pages/customer/notifications";
import BecomeOwner from "@/pages/customer/become-owner";
import PuzzleGame from "@/pages/customer/puzzle-game";
import MyBookings from "@/pages/customer/my-bookings";
import BookingDetail from "@/pages/customer/booking-detail";
import WriteReview from "@/pages/customer/write-review";
import MyReviews from "@/pages/customer/my-reviews";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminOwnerRequests from "@/pages/admin/owner-requests";
import AdminActivityLogs from "@/pages/admin/activity-logs";
import AdminNotifications from "@/pages/admin/notifications";
import AdminBookings from "@/pages/admin/bookings";
import BookingAnalytics from "@/pages/admin/booking-analytics";
import AdminReviews from "@/pages/admin/reviews";
import AdminHotels from "@/pages/admin/admin-hotels";
import AdminTransport from "@/pages/admin/admin-transport";
import TransportForm from "@/pages/admin/transport-form";

// Super Admin
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SuperAdminUsers from "@/pages/super-admin/users";
import SuperAdminAdmins from "@/pages/super-admin/admins";
import PlatformSettings from "@/pages/super-admin/platform-settings";
import SuperAdminActivityLogs from "@/pages/super-admin/activity-logs";
import SuperAdminOwnerRequests from "@/pages/super-admin/owner-requests";
import CouponsPage from "@/pages/super-admin/coupons";
import FeaturedContent from "@/pages/super-admin/featured-content";
import MarketingPage from "@/pages/super-admin/marketing";
import SuperAdminReports from "@/pages/super-admin/reports";
import SecurityPage from "@/pages/super-admin/security";

// Owner dashboards
import HotelOwnerDashboard from "@/pages/hotel-owner/dashboard";
import HotelOwnerHotels from "@/pages/hotel-owner/hotels";
import HotelForm from "@/pages/hotel-owner/hotel-form";
import HotelOwnerRooms from "@/pages/hotel-owner/rooms";
import RoomForm from "@/pages/hotel-owner/room-form";
import HotelReviews from "@/pages/hotel-owner/hotel-reviews";
import HotelOwnerBookings from "@/pages/hotel-owner/owner-bookings";
import RestaurantOwnerDashboard from "@/pages/restaurant-owner/dashboard";
import RestaurantOwnerReviews from "@/pages/restaurant-owner/restaurant-reviews";
import OwnerRestaurants from "@/pages/restaurant-owner/restaurants";
import RestaurantForm from "@/pages/restaurant-owner/restaurant-form";
import MenuManagement from "@/pages/restaurant-owner/menu-management";
import TableManagement from "@/pages/restaurant-owner/table-management";
import OwnerReservations from "@/pages/restaurant-owner/owner-reservations";
import SpaOwnerDashboard from "@/pages/spa-owner/dashboard";
import OwnerSpas from "@/pages/spa-owner/spas";
import SpaForm from "@/pages/spa-owner/spa-form";
import SpaServices from "@/pages/spa-owner/spa-services";
import SpaOwnerReviews from "@/pages/spa-owner/spa-reviews";
import OwnerAppointments from "@/pages/spa-owner/appointments";
import OwnerNotifications from "@/pages/owner/notifications";
import AdminSpas from "@/pages/admin/admin-spas";

// Customer - spas
import CustomerSpas from "@/pages/customer/spas";
import CustomerHotels from "@/pages/customer/hotels";
import HotelDetail from "@/pages/customer/hotel-detail";
import SpaDetail from "@/pages/customer/spa-detail";
import BookSpa from "@/pages/customer/book-spa";
import MySpaAppointments from "@/pages/customer/my-spa-appointments";

// Customer - tourist places
import CustomerPlaces from "@/pages/customer/places";
import PlaceDetail from "@/pages/customer/place-detail";
import MyPlaces from "@/pages/customer/my-places";
import TransportPage from "@/pages/customer/transport";
import TransportDetail from "@/pages/customer/transport-detail";

// Customer - payments
import MyPayments from "@/pages/customer/my-payments";

// Customer - trips & support
import CustomerTrips from "@/pages/customer/trips";
import TripDetail from "@/pages/customer/trip-detail";
import CustomerSupportTickets from "@/pages/customer/support-tickets";
import SupportTicketDetail from "@/pages/customer/support-ticket-detail";

// Admin - support
import AdminSupport from "@/pages/admin/support";

// Super Admin - support analytics
import SuperAdminSupportAnalytics from "@/pages/super-admin/support-analytics";

// Customer - refunds & cancellations
import CustomerRefunds from "@/pages/customer/refunds";
import RefundDetail from "@/pages/customer/refund-detail";

// Owner - cancellations
import OwnerCancellations from "@/pages/owner/cancellations";

// Admin - refunds
import AdminRefunds from "@/pages/admin/refunds";

// Super Admin - refund analytics
import SuperAdminRefundAnalytics from "@/pages/super-admin/refund-analytics";

// Admin - trip analytics
import AdminTripAnalytics from "@/pages/admin/trip-analytics";

// Owner - payments
import HotelOwnerPayments from "@/pages/hotel-owner/owner-payments";
import RestaurantOwnerPayments from "@/pages/restaurant-owner/owner-payments";
import SpaOwnerPayments from "@/pages/spa-owner/owner-payments";

// Admin - payments
import AdminPayments from "@/pages/admin/payments";

// Owner - earnings
import HotelOwnerEarnings from "@/pages/hotel-owner/earnings";
import RestaurantOwnerEarnings from "@/pages/restaurant-owner/earnings";
import SpaOwnerEarnings from "@/pages/spa-owner/earnings";

// Admin - revenue & reports
import AdminRevenue from "@/pages/admin/revenue";
import AdminReports from "@/pages/admin/reports";

// Admin - tourist places
import AdminTouristPlaces from "@/pages/admin/tourist-places";
import TouristPlaceForm from "@/pages/admin/tourist-place-form";
import TouristPlacePhotos from "@/pages/admin/tourist-place-photos";

// Customer - search
import SearchPage from "@/pages/customer/search";

// Customer - restaurants & reservations
import CustomerRestaurants from "@/pages/customer/restaurants";
import RestaurantDetail from "@/pages/customer/restaurant-detail";
import MakeReservation from "@/pages/customer/make-reservation";
import MyReservations from "@/pages/customer/my-reservations";

// Admin - restaurants
import AdminRestaurants from "@/pages/admin/admin-restaurants";

// Support
import Contact from "@/pages/support/contact";
import Help from "@/pages/support/help";
import Privacy from "@/pages/support/privacy";
import Terms from "@/pages/support/terms";
import Maintenance from "@/pages/maintenance";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

const BASE = getApiBase();

const ADMIN_ROLES = ["admin", "super_admin"];

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/maintenance-status`);
      if (!res.ok) return { maintenanceMode: false };
      return res.json() as Promise<{ maintenanceMode: boolean }>;
    },
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const isOn = data?.maintenanceMode ?? false;

  if (isOn && user && !ADMIN_ROLES.includes(user.role)) {
    return <Maintenance />;
  }

  if (isOn && (!user || !ADMIN_ROLES.includes(user.role))) {
    return <Maintenance />;
  }

  return (
    <>
      {isOn && user && ADMIN_ROLES.includes(user.role) && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span><strong>Maintenance Mode ON</strong> — Customers see the maintenance page. Only admins can access the app.</span>
        </div>
      )}
      {children}
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const onboarded = localStorage.getItem("ea_onboarded");
    window.location.href = onboarded ? "/login" : "/onboarding";
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    const role = user.role;
    if (role === "super_admin") { window.location.href = "/super-admin/dashboard"; return null; }
    if (role === "admin") { window.location.href = "/admin/dashboard"; return null; }
    if (role === "hotel_owner") { window.location.href = "/hotel-owner/dashboard"; return null; }
    if (role === "restaurant_owner") { window.location.href = "/restaurant-owner/dashboard"; return null; }
    if (role === "spa_owner") { window.location.href = "/spa-owner/dashboard"; return null; }
    window.location.href = "/";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Onboarding */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Auth - public */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/maintenance" component={Maintenance} />

      {/* Support - public */}
      <Route path="/contact" component={Contact} />
      <Route path="/help" component={Help} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Customer routes */}
      <Route path="/" component={() => <ProtectedRoute component={CustomerHome} allowedRoles={["customer"]} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={CustomerProfile} allowedRoles={["customer", "hotel_owner", "restaurant_owner", "spa_owner"]} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={CustomerSettings} allowedRoles={["customer", "hotel_owner", "restaurant_owner", "spa_owner"]} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={CustomerNotifications} allowedRoles={["customer", "hotel_owner", "restaurant_owner", "spa_owner"]} />} />
      <Route path="/become-owner" component={() => <ProtectedRoute component={BecomeOwner} allowedRoles={["customer"]} />} />
      <Route path="/puzzle" component={() => <ProtectedRoute component={PuzzleGame} allowedRoles={["customer"]} />} />
      <Route path="/customer/bookings/:id" component={() => <ProtectedRoute component={BookingDetail} allowedRoles={["customer"]} />} />
      <Route path="/customer/bookings" component={() => <ProtectedRoute component={MyBookings} allowedRoles={["customer"]} />} />
      <Route path="/customer/write-review/:bookingId" component={() => <ProtectedRoute component={WriteReview} allowedRoles={["customer"]} />} />
      <Route path="/customer/reviews" component={() => <ProtectedRoute component={MyReviews} allowedRoles={["customer"]} />} />
      <Route path="/hotels" component={() => <ProtectedRoute component={CustomerHotels} allowedRoles={["customer"]} />} />
      <Route path="/hotels/:id" component={() => <ProtectedRoute component={HotelDetail} allowedRoles={["customer"]} />} />
      <Route path="/restaurants" component={() => <ProtectedRoute component={CustomerRestaurants} allowedRoles={["customer"]} />} />
      <Route path="/restaurants/:id" component={() => <ProtectedRoute component={RestaurantDetail} allowedRoles={["customer"]} />} />
      <Route path="/reservations/new" component={() => <ProtectedRoute component={MakeReservation} allowedRoles={["customer"]} />} />
      <Route path="/my-reservations" component={() => <ProtectedRoute component={MyReservations} allowedRoles={["customer"]} />} />

      {/* Owner dashboards */}
      <Route path="/hotel-owner/dashboard" component={() => <ProtectedRoute component={HotelOwnerDashboard} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/hotels/new" component={() => <ProtectedRoute component={HotelForm} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/hotels/:id/edit" component={() => <ProtectedRoute component={HotelForm} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/hotels" component={() => <ProtectedRoute component={HotelOwnerHotels} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/rooms/new" component={() => <ProtectedRoute component={RoomForm} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/rooms/:id/edit" component={() => <ProtectedRoute component={RoomForm} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/rooms" component={() => <ProtectedRoute component={HotelOwnerRooms} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/bookings" component={() => <ProtectedRoute component={HotelOwnerBookings} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/reviews" component={() => <ProtectedRoute component={HotelReviews} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/payments" component={() => <ProtectedRoute component={HotelOwnerPayments} allowedRoles={["hotel_owner"]} />} />
      <Route path="/hotel-owner/earnings" component={() => <ProtectedRoute component={HotelOwnerEarnings} allowedRoles={["hotel_owner"]} />} />
      <Route path="/restaurant-owner/dashboard" component={() => <ProtectedRoute component={RestaurantOwnerDashboard} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/restaurants/new" component={() => <ProtectedRoute component={RestaurantForm} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/restaurants/:id/edit" component={() => <ProtectedRoute component={RestaurantForm} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/restaurants/:restaurantId/menu" component={() => <ProtectedRoute component={MenuManagement} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/restaurants/:restaurantId/tables" component={() => <ProtectedRoute component={TableManagement} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/restaurants" component={() => <ProtectedRoute component={OwnerRestaurants} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/reservations" component={() => <ProtectedRoute component={OwnerReservations} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/reviews" component={() => <ProtectedRoute component={RestaurantOwnerReviews} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/payments" component={() => <ProtectedRoute component={RestaurantOwnerPayments} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/restaurant-owner/earnings" component={() => <ProtectedRoute component={RestaurantOwnerEarnings} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/spa-owner/dashboard" component={() => <ProtectedRoute component={SpaOwnerDashboard} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/spas/new" component={() => <ProtectedRoute component={SpaForm} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/spas/:id/edit" component={() => <ProtectedRoute component={SpaForm} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/spas/:id/services" component={() => <ProtectedRoute component={SpaServices} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/spas" component={() => <ProtectedRoute component={OwnerSpas} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/appointments" component={() => <ProtectedRoute component={OwnerAppointments} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/reviews" component={() => <ProtectedRoute component={SpaOwnerReviews} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/payments" component={() => <ProtectedRoute component={SpaOwnerPayments} allowedRoles={["spa_owner"]} />} />
      <Route path="/spa-owner/earnings" component={() => <ProtectedRoute component={SpaOwnerEarnings} allowedRoles={["spa_owner"]} />} />

      {/* Customer spa routes */}
      <Route path="/spas/:id/book" component={() => <ProtectedRoute component={BookSpa} allowedRoles={["customer"]} />} />
      <Route path="/spas/:id" component={() => <ProtectedRoute component={SpaDetail} allowedRoles={["customer"]} />} />
      <Route path="/spas" component={() => <ProtectedRoute component={CustomerSpas} allowedRoles={["customer"]} />} />
      <Route path="/my-spa-appointments" component={() => <ProtectedRoute component={MySpaAppointments} allowedRoles={["customer"]} />} />

      <Route path="/search" component={() => <ProtectedRoute component={SearchPage} allowedRoles={["customer"]} />} />
      <Route path="/my-places" component={() => <ProtectedRoute component={MyPlaces} allowedRoles={["customer"]} />} />
      <Route path="/places/:id" component={() => <ProtectedRoute component={PlaceDetail} allowedRoles={["customer"]} />} />
      <Route path="/places" component={() => <ProtectedRoute component={CustomerPlaces} allowedRoles={["customer"]} />} />
      <Route path="/transport" component={() => <ProtectedRoute component={TransportPage} allowedRoles={["customer"]} />} />
      <Route path="/transport/:id" component={() => <ProtectedRoute component={TransportDetail} allowedRoles={["customer"]} />} />
      <Route path="/my-payments" component={() => <ProtectedRoute component={MyPayments} allowedRoles={["customer"]} />} />

      {/* Customer - trips */}
      <Route path="/trips" component={() => <ProtectedRoute component={CustomerTrips} allowedRoles={["customer"]} />} />
      <Route path="/trips/:ref" component={() => <ProtectedRoute component={TripDetail} allowedRoles={["customer"]} />} />

      {/* Customer - support tickets */}
      <Route path="/support/tickets" component={() => <ProtectedRoute component={CustomerSupportTickets} allowedRoles={["customer"]} />} />
      <Route path="/support/tickets/:ref" component={() => <ProtectedRoute component={SupportTicketDetail} allowedRoles={["customer"]} />} />

      {/* Customer - refunds & cancellations */}
      <Route path="/refunds" component={() => <ProtectedRoute component={CustomerRefunds} allowedRoles={["customer"]} />} />
      <Route path="/refunds/:ref" component={() => <ProtectedRoute component={RefundDetail} allowedRoles={["customer"]} />} />

      {/* Owner - cancellations */}
      <Route path="/owner/cancellations" component={() => <ProtectedRoute component={OwnerCancellations} allowedRoles={["hotel_owner", "restaurant_owner", "spa_owner"]} />} />
      {/* Owner - notifications */}
      <Route path="/owner/notifications" component={() => <ProtectedRoute component={OwnerNotifications} allowedRoles={["hotel_owner", "restaurant_owner", "spa_owner"]} />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/owner-requests" component={() => <ProtectedRoute component={AdminOwnerRequests} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/activity-logs" component={() => <ProtectedRoute component={AdminActivityLogs} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/notifications" component={() => <ProtectedRoute component={AdminNotifications} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/bookings" component={() => <ProtectedRoute component={AdminBookings} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/booking-analytics" component={() => <ProtectedRoute component={BookingAnalytics} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/reviews" component={() => <ProtectedRoute component={AdminReviews} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/hotels" component={() => <ProtectedRoute component={AdminHotels} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/restaurants" component={() => <ProtectedRoute component={AdminRestaurants} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/spas" component={() => <ProtectedRoute component={AdminSpas} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/payments" component={() => <ProtectedRoute component={AdminPayments} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/revenue" component={() => <ProtectedRoute component={AdminRevenue} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/reports" component={() => <ProtectedRoute component={AdminReports} allowedRoles={["admin", "super_admin"]} />} />

      <Route path="/admin/tourist-places/new" component={() => <ProtectedRoute component={TouristPlaceForm} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/tourist-places/:id/edit" component={() => <ProtectedRoute component={TouristPlaceForm} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/tourist-places/:id/photos" component={() => <ProtectedRoute component={TouristPlacePhotos} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/tourist-places" component={() => <ProtectedRoute component={AdminTouristPlaces} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/transport" component={() => <ProtectedRoute component={AdminTransport} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/transport/new" component={() => <ProtectedRoute component={TransportForm} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/transport/:id/edit" component={() => <ProtectedRoute component={TransportForm} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/support" component={() => <ProtectedRoute component={AdminSupport} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/refunds" component={() => <ProtectedRoute component={AdminRefunds} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/trip-analytics" component={() => <ProtectedRoute component={AdminTripAnalytics} allowedRoles={["admin", "super_admin"]} />} />

      {/* Super Admin routes */}
      <Route path="/super-admin/dashboard" component={() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/users" component={() => <ProtectedRoute component={SuperAdminUsers} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/admins" component={() => <ProtectedRoute component={SuperAdminAdmins} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/platform-settings" component={() => <ProtectedRoute component={PlatformSettings} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/activity-logs" component={() => <ProtectedRoute component={SuperAdminActivityLogs} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/owner-requests" component={() => <ProtectedRoute component={SuperAdminOwnerRequests} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/support-analytics" component={() => <ProtectedRoute component={SuperAdminSupportAnalytics} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/refund-analytics" component={() => <ProtectedRoute component={SuperAdminRefundAnalytics} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/coupons" component={() => <ProtectedRoute component={CouponsPage} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/featured-content" component={() => <ProtectedRoute component={FeaturedContent} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/marketing" component={() => <ProtectedRoute component={MarketingPage} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/reports" component={() => <ProtectedRoute component={SuperAdminReports} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/security" component={() => <ProtectedRoute component={SecurityPage} allowedRoles={["super_admin"]} />} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <OfflineBanner />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <MaintenanceGate>
                <Router />
                <PwaInstallBanner />
              </MaintenanceGate>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
