import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

// Auth
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";

// Customer
import CustomerHome from "@/pages/customer/home";
import CustomerProfile from "@/pages/customer/profile";
import CustomerSettings from "@/pages/customer/settings";
import CustomerNotifications from "@/pages/customer/notifications";
import BecomeOwner from "@/pages/customer/become-owner";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminOwnerRequests from "@/pages/admin/owner-requests";
import AdminActivityLogs from "@/pages/admin/activity-logs";
import AdminNotifications from "@/pages/admin/notifications";

// Super Admin
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SuperAdminUsers from "@/pages/super-admin/users";
import SuperAdminAdmins from "@/pages/super-admin/admins";
import PlatformSettings from "@/pages/super-admin/platform-settings";
import SuperAdminActivityLogs from "@/pages/super-admin/activity-logs";
import SuperAdminOwnerRequests from "@/pages/super-admin/owner-requests";

// Owner dashboards
import HotelOwnerDashboard from "@/pages/hotel-owner/dashboard";
import RestaurantOwnerDashboard from "@/pages/restaurant-owner/dashboard";
import SpaOwnerDashboard from "@/pages/spa-owner/dashboard";

// Support
import Contact from "@/pages/support/contact";
import Help from "@/pages/support/help";
import Privacy from "@/pages/support/privacy";
import Terms from "@/pages/support/terms";
import Maintenance from "@/pages/maintenance";

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
    window.location.href = "/login";
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
      {/* Auth - public */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
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

      {/* Owner dashboards */}
      <Route path="/hotel-owner/dashboard" component={() => <ProtectedRoute component={HotelOwnerDashboard} allowedRoles={["hotel_owner"]} />} />
      <Route path="/restaurant-owner/dashboard" component={() => <ProtectedRoute component={RestaurantOwnerDashboard} allowedRoles={["restaurant_owner"]} />} />
      <Route path="/spa-owner/dashboard" component={() => <ProtectedRoute component={SpaOwnerDashboard} allowedRoles={["spa_owner"]} />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" component={() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsers} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/owner-requests" component={() => <ProtectedRoute component={AdminOwnerRequests} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/activity-logs" component={() => <ProtectedRoute component={AdminActivityLogs} allowedRoles={["admin", "super_admin"]} />} />
      <Route path="/admin/notifications" component={() => <ProtectedRoute component={AdminNotifications} allowedRoles={["admin", "super_admin"]} />} />

      {/* Super Admin routes */}
      <Route path="/super-admin/dashboard" component={() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/users" component={() => <ProtectedRoute component={SuperAdminUsers} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/admins" component={() => <ProtectedRoute component={SuperAdminAdmins} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/platform-settings" component={() => <ProtectedRoute component={PlatformSettings} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/activity-logs" component={() => <ProtectedRoute component={SuperAdminActivityLogs} allowedRoles={["super_admin"]} />} />
      <Route path="/super-admin/owner-requests" component={() => <ProtectedRoute component={SuperAdminOwnerRequests} allowedRoles={["super_admin"]} />} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
