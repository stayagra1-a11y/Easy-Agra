import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Map, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  invalid_state: "Something went wrong. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  account_suspended: "Your account has been suspended. Contact support.",
};

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnverifiedEmail(null);
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
      const data = err?.response?.data;
      if (data?.requiresVerification) {
        setUnverifiedEmail(data.email || email);
      } else {
        toast({ title: "Login failed", description: data?.error || "Invalid credentials", variant: "destructive" });
      }
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await fetch(`${BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
        credentials: "include",
      });
      toast({ title: "Email sent!", description: "Check your inbox for the verification link." });
    } catch {
      toast({ title: "Failed to resend", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BASE}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
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
          <p className="text-sm text-muted-foreground mb-5">Sign in to your account</p>

          {/* Google error from redirect */}
          {urlError && GOOGLE_ERROR_MESSAGES[urlError] && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {GOOGLE_ERROR_MESSAGES[urlError]}
            </div>
          )}

          {/* Email verification banner */}
          {unverifiedEmail && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-amber-800">Email not verified</p>
              <p className="text-xs text-amber-700">Please check your inbox and click the verification link to activate your account.</p>
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend verification email →"}
              </button>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-muted-foreground">or sign in with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                <Label htmlFor="remember" className="text-sm cursor-pointer font-normal">Remember me</Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
