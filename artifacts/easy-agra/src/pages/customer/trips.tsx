import { useState } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useListTrips, useCreateTrip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Map, Plus, Calendar, Users, Wallet, ChevronRight, Plane, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRAVEL_TYPES = [
  { value: "solo", label: "Solo", icon: "🧳" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "Friends", icon: "👯" },
  { value: "business", label: "Business", icon: "💼" },
];

const BUDGET_CATEGORIES = [
  { value: "budget", label: "Budget", desc: "₹1,000–3,000/night" },
  { value: "standard", label: "Standard", desc: "₹3,000–7,000/night" },
  { value: "premium", label: "Premium", desc: "₹7,000–15,000/night" },
  { value: "luxury", label: "Luxury", desc: "₹15,000+/night" },
];

const INTERESTS = [
  "Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Local Food", "Shopping",
  "Photography", "History & Culture", "Sunrise/Sunset Views", "Yoga & Wellness",
  "Wildlife", "Art & Crafts", "Night Life",
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    upcoming: "bg-blue-100 text-blue-700",
    ongoing: "bg-emerald-100 text-emerald-700",
    completed: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FILTERS = ["all", "draft", "upcoming", "ongoing", "completed", "cancelled"];

export default function CustomerTrips() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    arrivalDate: "",
    departureDate: "",
    days: 3,
    adults: 2,
    children: 0,
    budget: 10000,
    travelType: "couple",
    budgetCategory: "standard",
    interests: [] as string[],
    notes: "",
  });

  const { data, isLoading } = useListTrips(filter !== "all" ? { status: filter } : {});
  const createTrip = useCreateTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip plan created!" });
        qc.invalidateQueries({ queryKey: ["/trips"] });
        setOpen(false);
        setForm({
          title: "", arrivalDate: "", departureDate: "", days: 3, adults: 2,
          children: 0, budget: 10000, travelType: "couple", budgetCategory: "standard",
          interests: [], notes: "",
        });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create trip", description: err?.response?.data?.error, variant: "destructive" });
      },
    },
  });

  const trips = data?.trips ?? [];

  const toggleInterest = (i: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i],
    }));
  };

  const handleSubmit = () => {
    if (!form.arrivalDate || !form.departureDate) {
      toast({ title: "Please select arrival and departure dates", variant: "destructive" });
      return;
    }
    if (form.interests.length === 0) {
      toast({ title: "Please select at least one interest", variant: "destructive" });
      return;
    }
    createTrip.mutate({
      data: {
        ...form,
        title: form.title || undefined,
        notes: form.notes || undefined,
      } as any,
    });
  };

  return (
    <CustomerLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Map className="w-6 h-6 text-primary" /> My Trips
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Plan and track your Agra adventures</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" /> Plan Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" /> Plan Your Agra Trip
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Trip Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Summer Agra Getaway"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Arrival Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.arrivalDate}
                      onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Departure Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.departureDate}
                      onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Days</Label>
                    <Input
                      type="number" min={1} max={30}
                      value={form.days}
                      onChange={(e) => setForm({ ...form, days: parseInt(e.target.value) || 1 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Adults</Label>
                    <Input
                      type="number" min={1} max={20}
                      value={form.adults}
                      onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Children</Label>
                    <Input
                      type="number" min={0} max={10}
                      value={form.children}
                      onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Total Budget (₹)</Label>
                  <Input
                    type="number" min={1000}
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 1000 })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Travel Type</Label>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {TRAVEL_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setForm({ ...form, travelType: t.value })}
                        className={`p-2 rounded-lg border text-center text-xs transition-colors ${
                          form.travelType === t.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <div className="text-xl mb-1">{t.icon}</div>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Budget Category</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {BUDGET_CATEGORIES.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setForm({ ...form, budgetCategory: b.value })}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                          form.budgetCategory === b.value
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <p className="font-semibold capitalize">{b.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{b.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Interests <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {INTERESTS.map((i) => (
                      <button
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                          form.interests.includes(i)
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any special requirements or notes…"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={createTrip.isPending}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  {createTrip.isPending ? "Creating…" : "Create Trip Plan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                filter === f ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All Trips" : f}
            </button>
          ))}
        </div>

        {/* Trip list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="py-16 text-center">
            <Map className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No trips planned yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start planning your Agra adventure!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.tripRef}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">
                            {trip.title || `Agra Trip`}
                          </p>
                          <Badge className={`text-xs px-2 py-0 ${statusBadge(trip.status)} capitalize`}>
                            {trip.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {fmtDate(trip.arrivalDate)} – {fmtDate(trip.departureDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {trip.adults} adult{trip.adults > 1 ? "s" : ""}{trip.children > 0 ? `, ${trip.children} child${trip.children > 1 ? "ren" : ""}` : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5" />
                            ₹{trip.budget.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {(trip.interests ?? []).slice(0, 3).map((i: string) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{i}</span>
                          ))}
                          {(trip.interests ?? []).length > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                              +{(trip.interests ?? []).length - 3} more
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">{trip.tripRef} · {trip.days} day{trip.days > 1 ? "s" : ""}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
