import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { imgUrl } from "@/lib/cloudinary";
import {
  useGetRestaurant,
  useGetRestaurantTables,
  useCreateReservation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, CalendarDays, Clock, Users, Phone, Mail, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

function getSearchParam(key: string): string {
  const url = new URL(window.location.href);
  return url.searchParams.get(key) ?? "";
}

interface FormState {
  restaurantId: number;
  tableId: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: string;
  specialRequest: string;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function MakeReservation() {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const restaurantIdParam = parseInt(getSearchParam("restaurantId") || "0", 10);

  const [form, setForm] = useState<FormState>({
    restaurantId: restaurantIdParam,
    tableId: "",
    customerName: user?.fullName ?? "",
    customerMobile: "",
    customerEmail: user?.email ?? "",
    reservationDate: todayStr(),
    reservationTime: "19:00",
    guestCount: "2",
    specialRequest: "",
  });

  const restaurantQuery = useGetRestaurant(form.restaurantId, {
    query: { enabled: !!form.restaurantId } as any,
  });
  const tablesQuery = useGetRestaurantTables(form.restaurantId, {
    query: { enabled: !!form.restaurantId } as any,
  });
  const createMut = useCreateReservation();

  const r = restaurantQuery.data;
  const tables = (tablesQuery.data ?? []).filter((t) => t.status === "available");

  function set(key: keyof FormState, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.restaurantId) { toast({ title: "Please select a restaurant", variant: "destructive" }); return; }
    if (!form.customerName.trim() || !form.customerMobile.trim()) {
      toast({ title: "Name and mobile are required", variant: "destructive" }); return;
    }
    if (!form.reservationDate || !form.reservationTime) {
      toast({ title: "Date and time are required", variant: "destructive" }); return;
    }

    createMut.mutate(
      {
        data: {
          restaurantId: form.restaurantId,
          tableId: form.tableId ? parseInt(form.tableId, 10) : undefined,
          customerName: form.customerName.trim(),
          customerMobile: form.customerMobile.trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          reservationDate: form.reservationDate,
          reservationTime: form.reservationTime,
          guestCount: parseInt(form.guestCount, 10) || 2,
          specialRequest: form.specialRequest.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast({ title: "Reservation submitted! ✓", description: `Ref: ${data.reservationRef}` });
          queryClient.invalidateQueries({ queryKey: ["getMyReservations"] });
          navigate("/my-reservations");
        },
        onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed to create reservation", variant: "destructive" }),
      },
    );
  }

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1 as any)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{t("reserve_table")}</h1>
        </div>

        {/* Restaurant info */}
        {restaurantQuery.isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : r ? (
          <Card className="border-0 shadow-sm bg-primary/5">
            <CardContent className="p-4">
              <div className="flex gap-3 items-center">
                {r.coverPhoto && (
                  <img src={imgUrl(r.coverPhoto, 200)} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border" />
                )}
                <div>
                  <h3 className="font-bold text-foreground">{r.name}</h3>
                  {r.cuisineType && <p className="text-xs text-primary">{r.cuisineType}</p>}
                  {r.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {r.city}
                    </p>
                  )}
                  {r.openingTime && r.closingTime && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.openingTime} – {r.closingTime}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" /> Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
                  <Input
                    type="date"
                    min={todayStr()}
                    value={form.reservationDate}
                    onChange={(e) => set("reservationDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time *</label>
                  <Input
                    type="time"
                    value={form.reservationTime}
                    onChange={(e) => set("reservationTime", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Number of Guests</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("guestCount", String(Math.max(1, parseInt(form.guestCount) - 1)))} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg font-bold hover:bg-muted">−</button>
                  <span className="text-xl font-bold w-8 text-center">{form.guestCount}</span>
                  <button type="button" onClick={() => set("guestCount", String(Math.min(20, parseInt(form.guestCount) + 1)))} className="w-8 h-8 rounded-full border flex items-center justify-center text-lg font-bold hover:bg-muted">+</button>
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> guests</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table selection */}
          {tables.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Select Table (optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => set("tableId", "")}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.tableId === "" ? "border-primary bg-primary/10 text-primary font-medium" : "border-muted text-muted-foreground hover:border-primary/50"}`}
                  >
                    Any Table
                  </button>
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("tableId", String(t.id))}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.tableId === String(t.id) ? "border-primary bg-primary/10 text-primary font-medium" : "border-muted text-muted-foreground hover:border-primary/50"}`}
                    >
                      {t.tableNumber} <span className="text-xs opacity-70">({t.capacity}p)</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                <Input placeholder="Your full name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="+91 98765 43210" value={form.customerMobile} onChange={(e) => set("customerMobile", e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" type="email" placeholder="Email for confirmation" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Special Request (optional)</label>
                <Textarea placeholder="Dietary requirements, occasion, seating preference…" value={form.specialRequest} onChange={(e) => set("specialRequest", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-12 bg-primary text-base font-semibold" disabled={createMut.isPending}>
            {createMut.isPending ? "Submitting…" : "Confirm Reservation"}
          </Button>
        </form>
      </div>
    </CustomerLayout>
  );
}
