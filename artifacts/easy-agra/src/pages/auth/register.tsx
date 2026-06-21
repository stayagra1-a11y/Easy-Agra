import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Phone, User, Lock, ChevronRight } from "lucide-react";
import { EasyAgraLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ fullName: "", mobile: "", password: "" });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: "Password chhota hai", description: "Password kam se kam 6 characters ka hona chahiye", variant: "destructive" });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      toast({ title: "Mobile number sahi nahi hai", description: "10 digit ka mobile number daalen (6-9 se shuru)", variant: "destructive" });
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        data: { fullName: form.fullName, mobile: form.mobile.trim(), password: form.password },
      }) as any;
      qc.setQueryData(getGetMeQueryKey(), result.user);
      setLocation("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message || "Kuch gadbad ho gayi, dobara try karein";
      toast({ title: "Account nahi bana", description: msg, variant: "destructive" });
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
            <h2 className="text-xl font-bold text-foreground">Naya account banayein</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Sirf 3 steps mein free registration</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Aapka Naam <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Jaise: Raj Kumar"
                  value={form.fullName}
                  onChange={set("fullName")}
                  required
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mobile Number <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={set("mobile")}
                  required
                  maxLength={10}
                  className="pl-9"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-muted-foreground">Isi number se login karenge</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Kam se kam 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  required
                  className="pl-9 pr-10"
                  autoComplete="new-password"
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
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ChevronRight className="h-4 w-4" />
              }
              {registerMutation.isPending ? "Account ban raha hai..." : "Account Banayein — Free"}
            </Button>
          </form>

          <div className="px-6 pb-5 text-center">
            <p className="text-sm text-muted-foreground">
              Pehle se account hai?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Login karein
              </Link>
            </p>
          </div>
        </div>

        <p className="text-white/40 text-xs mt-5 text-center px-8">
          Account banane ka matlab aap hamari terms se agree karte hain
        </p>
      </div>
    </div>
  );
}
