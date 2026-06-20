import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Phone, Mail } from "lucide-react";
import { EasyAgraLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function isMobile(val: string) {
  return /^[6-9]\d{9}$/.test(val.trim());
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlError = params.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const isMobileInput = isMobile(identifier);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnverifiedEmail(null);
    try {
      const payload = isMobileInput
        ? { mobile: identifier.trim(), password, rememberMe }
        : { email: identifier.trim(), password, rememberMe };
      const result = await loginMutation.mutateAsync({ data: payload });
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
        setUnverifiedEmail(data.email || identifier);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
      <div className="h-1 bg-accent" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <EasyAgraLogo size="lg" variant="full" className="mb-2" />
          <p className="text-white/60 text-sm mt-2">Your guide to the City of Taj</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-5">Sign in to your account</p>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or Mobile Number</Label>
              <div className="relative">
                {isMobileInput
                  ? <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  : <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  id="identifier"
                  type="text"
                  inputMode={identifier.length > 0 && /^\d/.test(identifier) ? "numeric" : "email"}
                  placeholder="you@example.com or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  className="pl-9"
                />
              </div>
              {identifier.length >= 10 && /^\d+$/.test(identifier) && !isMobileInput && (
                <p className="text-xs text-amber-600">Mobile number must start with 6-9 and be 10 digits</p>
              )}
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
