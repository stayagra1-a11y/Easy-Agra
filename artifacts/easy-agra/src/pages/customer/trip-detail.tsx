import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetTrip, useUpdateTrip, useCancelTrip, useDeleteTrip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Map, ArrowLeft, Calendar, Users, Wallet, Edit2, Trash2, XCircle,
  CheckCircle, Clock, Tag, Heart, Plane, Sparkles, AlertTriangle,
} from "lucide-react";
import { TripRecommendations } from "@/components/trip-recommendations";
import { useToast } from "@/hooks/use-toast";

const TRAVEL_TYPES = [
  { value: "solo", label: "Solo Traveler", icon: "🧳" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "Friends Group", icon: "👯" },
  { value: "business", label: "Business Traveler", icon: "💼" },
];

const BUDGET_CATEGORIES = [
  { value: "budget", label: "Budget", icon: "🌿" },
  { value: "standard", label: "Standard", icon: "⭐" },
  { value: "premium", label: "Premium", icon: "💎" },
  { value: "luxury", label: "Luxury", icon: "👑" },
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
    day: "numeric", month: "long", year: "numeric",
  });
}

function calcDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 1;
  const diff = new Date(departure).getTime() - new Date(arrival).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

function interestLabel(v: string) {
  return INTERESTS.find((i) => i.value === v)?.label ?? v;
}
function interestIcon(v: string) {
  return INTERESTS.find((i) => i.value === v)?.icon ?? "🔖";
}

export default function TripDetail() {
  const params = useParams<{ ref: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const { data: trip, isLoading } = useGetTrip(params.ref);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (editForm.arrivalDate && editForm.departureDate) {
      setEditForm((f: any) => ({ ...f, days: calcDays(f.arrivalDate, f.departureDate) }));
    }
  }, [editForm.arrivalDate, editForm.departureDate]);

  const updateTrip = useUpdateTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip updated!" });
        qc.invalidateQueries({ queryKey: [`/trips/${params.ref}`] });
        qc.invalidateQueries({ queryKey: ["/trips"] });
        setEditOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Could not update", description: err?.response?.data?.error, variant: "destructive" });
      },
    },
  });

  const cancelTrip = useCancelTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip cancelled" });
        qc.invalidateQueries({ queryKey: [`/trips/${params.ref}`] });
        qc.invalidateQueries({ queryKey: ["/trips"] });
        setCancelConfirm(false);
      },
    },
  });

  const deleteTrip = useDeleteTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip deleted" });
        navigate("/trips");
      },
    },
  });

  const openEdit = () => {
    if (!trip) return;
    setEditForm({
      title: trip.title ?? "",
      arrivalDate: trip.arrivalDate?.split("T")[0] ?? "",
      departureDate: trip.departureDate?.split("T")[0] ?? "",
      days: trip.days,
      adults: trip.adults,
      children: trip.children,
      budget: trip.budget,
      travelType: trip.travelType,
      budgetCategory: trip.budgetCategory,
      interests: [...(trip.interests ?? [])],
      notes: trip.notes ?? "",
    });
    setEditOpen(true);
  };

  const toggleInterest = (v: string) =>
    setEditForm((f: any) => ({
      ...f,
      interests: f.interests.includes(v) ? f.interests.filter((x: string) => x !== v) : [...f.interests, v],
    }));

  if (isLoading) {
    return (
      <CustomerLayout backHref="/trips" backLabel="Trips">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-muted rounded-xl w-2/3" />
          <div className="h-44 bg-muted rounded-2xl" />
          <div className="h-28 bg-muted rounded-2xl" />
          <div className="h-20 bg-muted rounded-2xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!trip) {
    return (
      <CustomerLayout backHref="/trips" backLabel="Trips">
        <div className="py-16 text-center">
          <Map className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Trip not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/trips")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Trips
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const canEdit = trip.status === "draft" || trip.status === "upcoming";
  const canCancel = trip.status === "draft" || trip.status === "upcoming";
  const canDelete = trip.status === "cancelled" || trip.status === "draft";
  const travelType = TRAVEL_TYPES.find((t) => t.value === trip.travelType);
  const budgetCat = BUDGET_CATEGORIES.find((b) => b.value === trip.budgetCategory);

  return (
    <CustomerLayout backHref="/trips" backLabel="Trips">
      <div className="space-y-4">
        {/* Back nav */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/trips")} className="p-1 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">My Trips</span>
        </div>

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(188 86% 18%) 0%, hsl(188 86% 28%) 100%)" }}
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold leading-tight">{trip.title || "Agra Trip"}</h1>
                <p className="text-white/60 text-xs mt-0.5">{trip.tripRef}</p>
              </div>
              <Badge className={`${STATUS_COLORS[trip.status]} capitalize text-xs border-0 shrink-0`}>
                {trip.status}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-white/50 text-xs">Arrival</p>
                <p className="text-sm font-semibold mt-0.5">{fmtDate(trip.arrivalDate)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Departure</p>
                <p className="text-sm font-semibold mt-0.5">{fmtDate(trip.departureDate)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Duration</p>
                <p className="text-sm font-semibold mt-0.5">{trip.days} day{trip.days !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>
          <Plane className="absolute right-4 bottom-4 w-16 h-16 text-white/5 rotate-12" />
        </div>

        {/* Trip details grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Guests</p>
              </div>
              <p className="font-semibold text-sm">
                {trip.adults} Adult{trip.adults !== 1 ? "s" : ""}
              </p>
              {trip.children > 0 && (
                <p className="text-xs text-muted-foreground">{trip.children} Child{trip.children !== 1 ? "ren" : ""}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Budget</p>
              </div>
              <p className="font-semibold text-sm">₹{trip.budget.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">{budgetCat?.icon} {budgetCat?.label}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Plane className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Travel Type</p>
              </div>
              <p className="font-semibold text-sm">{travelType?.icon} {travelType?.label}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
              <Badge className={`${STATUS_COLORS[trip.status]} capitalize text-xs border-0`}>
                {trip.status}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Interests */}
        {trip.interests && trip.interests.length > 0 && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> Travel Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 gap-2">
                {trip.interests.map((v: string) => (
                  <div key={v} className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                    <span className="text-base">{interestIcon(v)}</span>
                    <span className="text-xs font-medium text-primary">{interestLabel(v)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {trip.notes && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {(canEdit || canCancel) && (
          <div className="flex gap-3">
            {canEdit && (
              <Button onClick={openEdit} variant="outline" className="flex-1 rounded-xl">
                <Edit2 className="w-4 h-4 mr-1.5" /> Edit Trip
              </Button>
            )}
            {canCancel && !cancelConfirm && (
              <Button
                onClick={() => setCancelConfirm(true)}
                variant="outline"
                className="flex-1 rounded-xl text-red-500 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel Trip
              </Button>
            )}
            {canCancel && cancelConfirm && (
              <div className="flex-1 bg-red-50 rounded-xl border border-red-200 p-3">
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> Confirm cancellation?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => cancelTrip.mutate({ ref: params.ref })}
                    disabled={cancelTrip.isPending}
                    size="sm" variant="destructive" className="flex-1"
                  >
                    {cancelTrip.isPending ? "Cancelling…" : "Yes, Cancel"}
                  </Button>
                  <Button onClick={() => setCancelConfirm(false)} size="sm" variant="outline">Keep</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete */}
        {canDelete && (
          <div>
            {!deleteConfirm ? (
              <Button
                onClick={() => setDeleteConfirm(true)}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Trip Permanently
              </Button>
            ) : (
              <div className="bg-red-50 rounded-xl border border-red-200 p-3">
                <p className="text-xs text-red-600 font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => deleteTrip.mutate({ ref: params.ref })} variant="destructive" className="flex-1">
                    {deleteTrip.isPending ? "Deleting…" : "Delete Forever"}
                  </Button>
                  <Button onClick={() => setDeleteConfirm(false)} variant="outline">Keep</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Recommendations Section */}
      {trip.status !== "cancelled" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-foreground text-sm">Smart Recommendations</h2>
          </div>
          <TripRecommendations
            tripRef={params.ref}
            tripStatus={trip.status}
            interests={trip.interests ?? []}
            budgetCategory={trip.budgetCategory}
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-background border-b px-5 py-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" /> Edit Trip Plan
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-4">
            <div>
              <Label className="text-sm font-medium">Trip Name</Label>
              <Input value={editForm.title ?? ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="mt-1.5" />
            </div>

            <div>
              <Label className="text-sm font-medium">Travel Dates</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Arrival</p>
                  <Input type="date" value={editForm.arrivalDate ?? ""} onChange={(e) => setEditForm({ ...editForm, arrivalDate: e.target.value })} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Departure</p>
                  <Input type="date" value={editForm.departureDate ?? ""} onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })} />
                </div>
              </div>
              {editForm.arrivalDate && editForm.departureDate && (
                <p className="text-xs text-primary mt-1.5 font-medium">
                  📅 {calcDays(editForm.arrivalDate, editForm.departureDate)} day trip
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Guests</Label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Adults</p>
                  <Input type="number" min={1} value={editForm.adults ?? 1} onChange={(e) => setEditForm({ ...editForm, adults: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Children</p>
                  <Input type="number" min={0} value={editForm.children ?? 0} onChange={(e) => setEditForm({ ...editForm, children: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Total Budget (₹)</Label>
              <Input type="number" min={500} value={editForm.budget ?? 0} onChange={(e) => setEditForm({ ...editForm, budget: parseInt(e.target.value) || 0 })} className="mt-1.5" />
            </div>

            <div>
              <Label className="text-sm font-medium">Travel Type</Label>
              <Select value={editForm.travelType} onValueChange={(v) => setEditForm({ ...editForm, travelType: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAVEL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Budget Category</Label>
              <Select value={editForm.budgetCategory} onValueChange={(v) => setEditForm({ ...editForm, budgetCategory: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((b) => <SelectItem key={b.value} value={b.value}>{b.icon} {b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Travel Interests</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {INTERESTS.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => toggleInterest(i.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-all ${
                      (editForm.interests ?? []).includes(i.value)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <span className="text-base">{i.icon}</span>
                    <span className="text-xs">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                value={editForm.notes ?? ""}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3} className="mt-1.5 resize-none"
              />
            </div>

            <Button
              onClick={() => updateTrip.mutate({ ref: params.ref, data: editForm })}
              disabled={updateTrip.isPending}
              className="w-full bg-primary text-white hover:bg-primary/90 h-11 font-semibold"
            >
              {updateTrip.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
