import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Map, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("No verification token found."); return; }

    fetch(`${BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setStatus("success");
          setTimeout(() => setLocation("/"), 3000);
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Verification failed.");
        }
      })
      .catch(() => { setStatus("error"); setErrorMsg("Network error. Please try again."); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-primary to-primary/80 flex flex-col">
      <div className="h-1 bg-accent" />
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-3 border border-white/20 shadow-xl">
            <Map className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Easy Agra</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-lg font-bold">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-lg font-bold text-green-700">Email Verified!</h2>
              <p className="text-sm text-muted-foreground">Your account is now active. Redirecting you to home…</p>
              <Button onClick={() => setLocation("/")} className="w-full">Go to Home</Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-lg font-bold text-destructive">Verification Failed</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <p className="text-xs text-muted-foreground">The link may have expired. Try registering again or request a new link.</p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
