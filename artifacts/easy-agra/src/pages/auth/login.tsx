import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Phone, Lock, ChevronRight } from "lucide-react";
import { EasyAgraLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function isMobileNum(val: string) {
  return /^[6-9]\d{9}$/.test(val.trim());
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const loginMutation = useLogin();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isMobile = isMobileNum(identifier);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = isMobile
        ? { mobile: identifier.trim(), password }
        : { email: identifier.trim(), password };
      const result = await loginMutation.mutateAsync({ data: payload });
      qc.setQueryData(getGetMeQueryKey(), result.user);
      const role = result.user.role;
      if (role === "super_admin") setLocation("/super-admin/dashboard");
      else if (role === "admin") setLocation("/admin/dashboard");
      else if (role === "hotel_owner") setLocation("/hotel-owner/dashboard");
      else if (role === "restaurant_owner") setLocation("/restaurant-owner/dashboard");
      else if (role === "spa_owner") setLocation("/spa-owner/dashboard");
      else setLocation("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Mobile/email ya password galat hai";
      toast({ title: "Login nahi hua", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/80 flex flex-col">
      <div className="h-1 bg-accent" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center mb-7">
          <EasyAgraLogo size="lg" variant="full" className="mb-2" />
          <p className="text-white/60 text-sm mt-1">Agra ke best hotels, restaurants aur spas</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-primary/5 border-b px-6 pt-5 pb-4">
            <h2 className="text-xl font-bold text-foreground">Login karein</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Apne account mein wapas aayen</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mobile Number ya Email</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode={/^\d/.test(identifier) ? "numeric" : "email"}
                  placeholder="9876543210 ya email@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Password bhool gaye?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ChevronRight className="h-4 w-4" />
              }
              {loginMutation.isPending ? "Login ho raha hai..." : "Login Karein"}
            </Button>
          </form>

          <div className="px-6 pb-5 text-center">
            <p className="text-sm text-muted-foreground">
              Pehli baar aa rahe hain?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Free account banayein
              </Link>
            </p>
          </div>
        </div>

        <p className="text-white/40 text-xs mt-5 text-center">
          Easy Agra — Agra Tourism Platform
        </p>
      </div>
    </div>
  );
}
