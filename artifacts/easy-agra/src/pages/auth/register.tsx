import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Map, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [form, setForm] = useState({
    fullName: "", mobile: "", email: "", password: "", confirmPassword: "", city: "", state: "",
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        data: { fullName: form.fullName, mobile: form.mobile, email: form.email, password: form.password, city: form.city, state: form.state },
      }) as any;

      if (result.requiresVerification) {
        setPendingEmail(form.email);
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.response?.data?.error || "Something went wrong", variant: "destructive" });
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    try {
      await fetch(`${BASE}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
        credentials: "include",
      });
      toast({ title: "Email resent!", description: "Please check your inbox." });
    } catch {
      toast({ title: "Failed to resend", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BASE}/api/auth/google`;
  };

  // ── Email verification pending screen ──────────────────────────────────────
  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
        <div className="h-1 bg-accent" />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to<br />
              <span className="font-semibold text-foreground">{pendingEmail}</span>
            </p>
            <p className="text-xs text-muted-foreground">Click the link in your email to activate your account. The link expires in 24 hours.</p>
            <div className="pt-2 space-y-3">
              <Button onClick={handleResend} variant="outline" className="w-full" disabled={resending}>
                {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Resend email
              </Button>
              <Link href="/login" className="block text-sm text-primary font-semibold hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
      <div className="h-1 bg-accent" />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-2 border border-white/20 shadow-xl">
            <Map className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Easy Agra</h1>
          <p className="text-white/70 text-xs mt-1">Create your account</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Join Easy Agra</h2>

          {/* Google Sign Up */}
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
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-muted-foreground">or register with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" placeholder="Raj Kumar" value={form.fullName} onChange={handleChange("fullName")} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="9876543210" value={form.mobile} onChange={handleChange("mobile")} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="raj@example.com" value={form.email} onChange={handleChange("email")} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Agra" value={form.city} onChange={handleChange("city")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="Uttar Pradesh" value={form.state} onChange={handleChange("state")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={handleChange("password")} required className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange("confirmPassword")} required />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-2" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
