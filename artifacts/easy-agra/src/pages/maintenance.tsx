import { Map, Wrench } from "lucide-react";
import { Link } from "wouter";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 to-primary flex flex-col items-center justify-center px-4 text-white text-center">
      <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
        <Wrench className="h-10 w-10 text-accent" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Map className="h-5 w-5 text-accent" />
        <span className="text-xl font-bold">Easy Agra</span>
      </div>
      <h1 className="text-3xl font-bold mb-3">Under Maintenance</h1>
      <p className="text-white/70 max-w-sm text-lg">
        We're performing scheduled maintenance to improve your experience. We'll be back very shortly!
      </p>
      <div className="mt-8 bg-white/10 rounded-xl px-6 py-4 border border-white/20">
        <p className="text-sm text-white/60">If you're an administrator,{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">sign in here</Link>
        </p>
      </div>
    </div>
  );
}
