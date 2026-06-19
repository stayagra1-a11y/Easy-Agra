import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useResetPassword } from "@workspace/api-client-react";
import { Map, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const resetMutation = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      await resetMutation.mutateAsync({ data: { token, password } });
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Invalid or expired token", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
      <div className="h-1 bg-accent" />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-2 border border-white/20">
            <Map className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Easy Agra</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Password reset!</h2>
              <p className="text-sm text-muted-foreground mb-6">Your password has been updated successfully.</p>
              <Link href="/login"><Button className="w-full bg-primary">Sign in now</Button></Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">Set new password</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose a strong password for your account.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-primary" disabled={resetMutation.isPending || !token}>
                  {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
