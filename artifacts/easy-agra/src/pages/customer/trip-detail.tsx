import { useState } from "react";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useGetTrip, useUpdateTrip, useCancelTrip, useDeleteTrip } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Map, ArrowLeft, Calendar, Users, Wallet, Edit2, Trash2, XCircle,
  CheckCircle, Clock, Tag, Heart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TRAVEL_TYPES = [
  { value: "solo", label: "Solo", icon: "🧳" },
  { value: "couple", label: "Couple", icon: "💑" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "friends", label: "Friends", icon: "👯" },
  { value: "business", label: "Business", icon: "💼" },
];

const BUDGET_CATEGORIES = [
  { value: "budget", label: "Budget" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

const INTERESTS_LIST = [
  "Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Local Food", "Shopping",
  "Photography", "History & Culture", "Sunrise/Sunset Views", "Yoga & Wellness",
  "Wildlife", "Art & Crafts", "Night Life",
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600", upcoming: "bg-blue-100 text-blue-700",
    ongoing: "bg-emerald-100 text-emerald-700", completed: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-600",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function statusIcon(s: string) {
  if (s === "upcoming") return <Clock className="w-4 h-4 text-blue-500" />;
  if (s === "ongoing") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (s === "completed") return <CheckCircle className="w-4 h-4 text-purple-500" />;
  if (s === "cancelled") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Edit2 className="w-4 h-4 text-gray-400" />;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

interface Props { params: { ref: string } }

export default function TripDetail({ params }: Props) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const { data: trip, isLoading } = useGetTrip(params.ref);

  const [editForm, setEditForm] = useState<any>({});

  const updateTrip = useUpdateTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip updated!" });
        qc.invalidateQueries({ queryKey: [`/trips/${params.ref}`] });
        qc.invalidateQueries({ queryKey: ["/trips"] });
        setEditOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err?.response?.data?.error, variant: "destructive" });
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

  const toggleInterest = (i: string) => {
    setEditForm((f: any) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter((x: string) => x !== i) : [...f.interests, i],
    }));
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/2" />
          <div className="h-40 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </CustomerLayout>
    );
  }

  if (!trip) {
    return (
      <CustomerLayout>
        <div className="py-16 text-center">
          <Map className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Trip not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/trips")}>Back to Trips</Button>
        </div>
      </CustomerLayout>
    );
  }

  const canEdit = trip.status === "draft" || trip.status === "upcoming";
  const canCancel = trip.status === "draft" || trip.status === "upcoming";

  return (
    <CustomerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/trips")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base truncate">
              {trip.title || "Agra Trip"}
            </h1>
            <p className="text-xs text-muted-foreground">{trip.tripRef}</p>
          </div>
          <div className="flex items-center gap-1">
            {statusIcon(trip.status)}
            <Badge className={`${statusBadge(trip.status)} capitalize text-xs`}>{trip.status}</Badge>
          </div>
        </div>

        {/* Trip overview */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Arrival</p>
                <p className="font-semibold text-sm mt-0.5">{fmtDate(trip.arrivalDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="font-semibold text-sm mt-0.5">{fmtDate(trip.departureDate)}</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{trip.days} day{trip.days > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  {trip.adults} adult{trip.adults > 1 ? "s" : ""}
                  {trip.children > 0 ? `, ${trip.children} child${trip.children > 1 ? "ren" : ""}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span>₹{trip.budget.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Travel Type</p>
                <p className="font-medium capitalize mt-0.5">{trip.travelType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget Category</p>
                <p className="font-medium capitalize mt-0.5">{trip.budgetCategory}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        {trip.interests && trip.interests.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex flex-wrap gap-2">
                {trip.interests.map((i: string) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{i}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {trip.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {(canEdit || canCancel) && (
          <div className="flex gap-3 pt-2">
            {canEdit && (
              <Button onClick={openEdit} variant="outline" className="flex-1">
                <Edit2 className="w-4 h-4 mr-1" /> Edit Trip
              </Button>
            )}
            {canCancel && (
              !cancelConfirm ? (
                <Button onClick={() => setCancelConfirm(true)} variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-1" /> Cancel Trip
                </Button>
              ) : (
                <div className="flex gap-2 flex-1">
                  <Button
                    onClick={() => cancelTrip.mutate({ ref: params.ref })}
                    disabled={cancelTrip.isPending}
                    variant="destructive" size="sm" className="flex-1"
                  >
                    {cancelTrip.isPending ? "Cancelling…" : "Confirm Cancel"}
                  </Button>
                  <Button onClick={() => setCancelConfirm(false)} variant="outline" size="sm">
                    Keep
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        {/* Delete */}
        {trip.status === "cancelled" || trip.status === "draft" ? (
          <div className="pt-2">
            {!deleteConfirm ? (
              <Button
                onClick={() => setDeleteConfirm(true)}
                variant="ghost"
                className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Trip
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => deleteTrip.mutate({ ref: params.ref })} variant="destructive" className="flex-1">
                  Delete Permanently
                </Button>
                <Button onClick={() => setDeleteConfirm(false)} variant="outline">Cancel</Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Trip Name</Label>
              <Input
                value={editForm.title ?? ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Arrival</Label>
                <Input type="date" value={editForm.arrivalDate ?? ""} onChange={(e) => setEditForm({ ...editForm, arrivalDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Departure</Label>
                <Input type="date" value={editForm.departureDate ?? ""} onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Days</Label><Input type="number" min={1} value={editForm.days ?? 1} onChange={(e) => setEditForm({ ...editForm, days: parseInt(e.target.value) || 1 })} className="mt-1" /></div>
              <div><Label>Adults</Label><Input type="number" min={1} value={editForm.adults ?? 1} onChange={(e) => setEditForm({ ...editForm, adults: parseInt(e.target.value) || 1 })} className="mt-1" /></div>
              <div><Label>Children</Label><Input type="number" min={0} value={editForm.children ?? 0} onChange={(e) => setEditForm({ ...editForm, children: parseInt(e.target.value) || 0 })} className="mt-1" /></div>
            </div>
            <div>
              <Label>Budget (₹)</Label>
              <Input type="number" value={editForm.budget ?? 0} onChange={(e) => setEditForm({ ...editForm, budget: parseInt(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <Label>Travel Type</Label>
              <Select value={editForm.travelType} onValueChange={(v) => setEditForm({ ...editForm, travelType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAVEL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget Category</Label>
              <Select value={editForm.budgetCategory} onValueChange={(v) => setEditForm({ ...editForm, budgetCategory: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {INTERESTS_LIST.map((i) => (
                  <button key={i} onClick={() => toggleInterest(i)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      (editForm.interests ?? []).includes(i) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted"
                    }`}
                  >{i}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editForm.notes ?? ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="mt-1 resize-none" />
            </div>
            <Button
              onClick={() => updateTrip.mutate({ ref: params.ref, data: editForm })}
              disabled={updateTrip.isPending}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              {updateTrip.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
