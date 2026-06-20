import { useState, useEffect } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useListTrips, useCreateTrip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Map, Plus, Calendar, Users, Wallet, ChevronRight, Plane,
  Clock, CheckCircle2, ListFilter, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRAVEL_TYPES = [
  { value: "solo", label: "Solo Traveler", icon: "🧳" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "Friends Group", icon: "👯" },
  { value: "business", label: "Business", icon: "💼" },
];

const BUDGET_CATEGORIES = [
  { value: "budget", label: "Budget", desc: "₹1,000–3,000/night", icon: "🌿" },
  { value: "standard", label: "Standard", desc: "₹3,000–7,000/night", icon: "⭐" },
  { value: "premium", label: "Premium", desc: "₹7,000–15,000/night", icon: "💎" },
  { value: "luxury", label: "Luxury", desc: "₹15,000+/night", icon: "👑" },
];

const INTERESTS = [
  { value: "historical_places", label: "Historical Places", icon: "🏛️" },
  { value: "photography", label: "Photography", icon: "📸" },
  { value: "food_restaurants", label: "Food & Restaurants", icon: "🍽️" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "family_activities", label: "Family Activities", icon: "🎠" },
  { value: "luxury_experience", label: "Luxury Experience", icon: "✨" },
  { value: "wellness_spa", label: "Wellness & Spa", icon: "🧘" },
  { value: "religious_places", label: "Religious Places", icon: "🕌" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-emerald-100 text-emerald-700",
  completed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-600",
};

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function calcDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 1;
  const diff = new Date(departure).getTime() - new Date(arrival).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

const TABS = [
  { key: "upcoming", label: "Upcoming", icon: Clock, color: "text-blue-600" },
  { key: "completed", label: "Past", icon: CheckCircle2, color: "text-purple-600" },
  { key: "all", label: "All", icon: ListFilter, color: "text-gray-600" },
];

export default function CustomerTrips() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [open, setOpen] = useState(false);

  const defaultForm = {
    title: "",
    arrivalDate: "",
    departureDate: "",
    days: 1,
    adults: 2,
    children: 0,
    budget: 10000,
    travelType: "couple",
    budgetCategory: "standard",
    interests: [] as string[],
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (form.arrivalDate && form.departureDate) {
      setForm((f) => ({ ...f, days: calcDays(f.arrivalDate, f.departureDate) }));
    }
  }, [form.arrivalDate, form.departureDate]);

  const statusFilter = activeTab === "all" ? {} : { status: activeTab };
  const { data, isLoading } = useListTrips(statusFilter);

  const createTrip = useCreateTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "🗺️ Trip plan created!", description: "Your Agra adventure is all set." });
        qc.invalidateQueries({ queryKey: ["/trips"] });
        setOpen(false);
        setForm(defaultForm);
      },
      onError: (err: any) => {
        toast({
          title: "Could not create trip",
          description: err?.response?.data?.error ?? "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const trips = data?.trips ?? [];

  const toggleInterest = (v: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter((x) => x !== v) : [...f.interests, v],
    }));

  const handleSubmit = () => {
    if (!form.arrivalDate || !form.departureDate) {
      toast({ title: "Please select arrival and departure dates", variant: "destructive" });
      return;
    }
    if (new Date(form.departureDate) < new Date(form.arrivalDate)) {
      toast({ title: "Departure must be after arrival", variant: "destructive" });
      return;
    }
    if (form.interests.length === 0) {
      toast({ title: "Select at least one interest", variant: "destructive" });
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

  const interestLabel = (v: string) => INTERESTS.find((i) => i.value === v)?.label ?? v;

  return (
    <CustomerLayout>
      <div className="space-y-5">
        {/* Header */}
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(188 86% 20%) 0%, hsl(188 86% 28%) 100%)" }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Plane className="w-5 h-5 text-amber-300" /> My Trip Plans
                </h1>
                <p className="text-white/70 text-sm mt-0.5">Plan your perfect Agra adventure</p>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-400 text-amber-950 hover:bg-amber-300 font-semibold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Plan Trip
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
                  <div className="sticky top-0 z-10 bg-background border-b px-5 py-4">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg">
                        <Plane className="w-5 h-5 text-primary" /> Plan Your Agra Trip
                      </DialogTitle>
                    </DialogHeader>
                  </div>

                  <div className="space-y-5 px-5 py-4">
                    {/* Trip name */}
                    <div>
                      <Label className="text-sm font-medium">Trip Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        placeholder="e.g. Summer Agra Getaway"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Dates */}
                    <div>
                      <Label className="text-sm font-medium">Travel Dates <span className="text-red-500">*</span></Label>
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Arrival Date</p>
                          <Input
                            type="date"
                            value={form.arrivalDate}
                            onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Departure Date</p>
                          <Input
                            type="date"
                            value={form.departureDate}
                            onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                          />
                        </div>
                      </div>
                      {form.arrivalDate && form.departureDate && (
                        <p className="text-xs text-primary mt-1.5 font-medium">
                          📅 {calcDays(form.arrivalDate, form.departureDate)} day{calcDays(form.arrivalDate, form.departureDate) !== 1 ? "s" : ""} trip
                        </p>
                      )}
                    </div>

                    {/* Guests */}
                    <div>
                      <Label className="text-sm font-medium">Guests</Label>
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Adults</p>
                          <Input
                            type="number" min={1} max={20}
                            value={form.adults}
                            onChange={(e) => setForm({ ...form, adults: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Children</p>
                          <Input
                            type="number" min={0} max={10}
                            value={form.children}
                            onChange={(e) => setForm({ ...form, children: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Budget */}
                    <div>
                      <Label className="text-sm font-medium">Total Budget (₹) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number" min={500}
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: parseInt(e.target.value) || 500 })}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Travel Type */}
                    <div>
                      <Label className="text-sm font-medium">Travel Type <span className="text-red-500">*</span></Label>
                      <div className="grid grid-cols-5 gap-2 mt-1.5">
                        {TRAVEL_TYPES.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setForm({ ...form, travelType: t.value })}
                            className={`p-2 rounded-xl border text-center transition-all text-xs ${
                              form.travelType === t.value
                                ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                                : "border-border hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <div className="text-xl mb-0.5">{t.icon}</div>
                            <div className="leading-tight">{t.label.split(" ")[0]}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget Category */}
                    <div>
                      <Label className="text-sm font-medium">Budget Category <span className="text-red-500">*</span></Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        {BUDGET_CATEGORIES.map((b) => (
                          <button
                            key={b.value}
                            onClick={() => setForm({ ...form, budgetCategory: b.value })}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              form.budgetCategory === b.value
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <p className={`text-sm font-semibold ${form.budgetCategory === b.value ? "text-primary" : "text-foreground"}`}>
                              {b.icon} {b.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interests */}
                    <div>
                      <Label className="text-sm font-medium">
                        Travel Interests <span className="text-red-500">*</span>
                        <span className="text-muted-foreground font-normal ml-1">(select all that apply)</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        {INTERESTS.map((i) => (
                          <button
                            key={i.value}
                            onClick={() => toggleInterest(i.value)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-all ${
                              form.interests.includes(i.value)
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border hover:bg-muted text-foreground"
                            }`}
                          >
                            <span className="text-base">{i.icon}</span>
                            <span>{i.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-sm font-medium">Special Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea
                        placeholder="Any special requirements, preferences, or notes…"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="mt-1.5 resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={createTrip.isPending}
                      className="w-full bg-primary text-white hover:bg-primary/90 h-11 text-base font-semibold"
                    >
                      {createTrip.isPending ? "Creating Trip…" : "✈️ Create Trip Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mt-4">
              {[
                { label: "Upcoming", value: data?.trips?.filter((t: any) => t.status === "upcoming" || t.status === "ongoing").length ?? 0 },
                { label: "Completed", value: data?.trips?.filter((t: any) => t.status === "completed").length ?? 0 },
                { label: "Total", value: data?.total ?? 0 },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/60">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Sparkles className="absolute right-4 bottom-4 w-20 h-20 text-white/5" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === tab.key ? tab.color : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Trip list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Map className="w-8 h-8 text-primary/50" />
            </div>
            <p className="font-semibold text-foreground">No trips here yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start planning your Agra adventure!</p>
            <Button
              onClick={() => setOpen(true)}
              className="mt-4 bg-primary text-white hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" /> Plan First Trip
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip: any) => (
              <Link key={trip.id} href={`/trips/${trip.tripRef}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all border border-border/60 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Left accent bar */}
                      <div
                        className={`w-1.5 shrink-0 ${
                          trip.status === "upcoming" ? "bg-blue-400" :
                          trip.status === "ongoing" ? "bg-emerald-400" :
                          trip.status === "completed" ? "bg-purple-400" :
                          trip.status === "cancelled" ? "bg-red-300" : "bg-gray-300"
                        }`}
                      />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground text-sm truncate">
                                {trip.title || "Agra Trip"}
                              </p>
                              <Badge className={`text-xs px-2 py-0 capitalize border-0 ${STATUS_COLORS[trip.status]}`}>
                                {trip.status}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {fmtDate(trip.arrivalDate)} → {fmtDate(trip.departureDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {trip.adults} adult{trip.adults !== 1 ? "s" : ""}
                                {trip.children > 0 ? `, ${trip.children} child${trip.children !== 1 ? "ren" : ""}` : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                <Wallet className="w-3 h-3" />
                                ₹{trip.budget.toLocaleString("en-IN")}
                              </span>
                            </div>

                            <div className="flex gap-1 mt-2 flex-wrap">
                              {(trip.interests ?? []).slice(0, 3).map((v: string) => (
                                <span key={v} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                  {interestLabel(v)}
                                </span>
                              ))}
                              {(trip.interests ?? []).length > 3 && (
                                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                  +{(trip.interests ?? []).length - 3}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground/60 mt-1.5">
                              {trip.tripRef} · {trip.days} day{trip.days !== 1 ? "s" : ""} · {trip.travelType}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </div>
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
