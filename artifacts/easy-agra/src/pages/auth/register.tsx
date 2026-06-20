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
