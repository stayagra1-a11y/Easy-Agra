import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Map, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginMutation.mutateAsync({ data: { email, password, rememberMe } });
      queryClient.setQueryData(getGetMeQueryKey(), result.user);
      const role = result.user.role;
      if (role === "super_admin") setLocation("/super-admin/dashboard");
      else if (role === "admin") setLocation("/admin/dashboard");
      else if (role === "hotel_owner") setLocation("/hotel-owner/dashboard");
      else if (role === "restaurant_owner") setLocation("/restaurant-owner/dashboard");
      else if (role === "spa_owner") setLocation("/spa-owner/dashboard");
      else setLocation("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.response?.data?.error || "Invalid credentials", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
      {/* Decorative top bar */}
      <div className="h-1 bg-accent" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-3 border border-white/20 shadow-xl">
            <Map className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Easy Agra</h1>
          <p className="text-white/70 text-sm mt-1">Your guide to the City of Taj</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer font-normal">Remember me</Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 w-full max-w-sm bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
          <p className="text-white/80 text-xs font-semibold mb-2">Demo credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
            <div><span className="font-medium text-white/90">Super Admin:</span><br />superadmin@easyagra.com</div>
            <div><span className="font-medium text-white/90">Admin:</span><br />admin@easyagra.com</div>
            <div><span className="font-medium text-white/90">Customer:</span><br />rahul@example.com</div>
            <div><span className="font-medium text-white/90">Password:</span><br />SuperAdmin@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
