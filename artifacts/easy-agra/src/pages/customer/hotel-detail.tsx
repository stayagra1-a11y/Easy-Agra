import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import { imgUrl } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";
import {
  Loader2, MapPin, Star, ArrowLeft, BedDouble, Users, IndianRupee,
  Clock, Phone, Globe, Wifi, Car, Coffee, Utensils, Dumbbell,
  Wind, Waves, Shield, CheckCircle2, ChevronLeft, ChevronRight,
  CalendarDays, X, Navigation, Train, Plane, Bus, Hospital, ShoppingBag, Share2,
  Tv, Refrigerator, Droplets, Lock, Shirt, Building2, ConciergeBell,
  MonitorDot, Bath, Zap, Package, ChevronDown, ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGetHotelNearbyPlaces } from "@workspace/api-client-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Hotel {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  googleMapLink: string | null;
  landmark: string | null;
  contactMobile: string | null;
  contactEmail: string | null;
  website: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: string[];
  coverImage: string | null;
  galleryImages: string[];
  categorizedPhotos: { url: string; category: string }[] | null;
  rating: string | null;
  reviewCount: number;
  starRating: number | null;
  pricePerNight: number | null;
  policies: string | null;
  cancellationPolicy: string | null;
  status: string;
}

interface Room {
  id: number;
  name: string;
  roomType: string;
  adultsCapacity: number;
  childrenCapacity: number;
  basePrice: number;
  finalPrice: number | null;
  discountPercentage: number;
  description: string | null;
  amenities: string[] | null;
  coverImage: string | null;
  galleryImages: string[];
  status: string;
  totalRooms: number;
  availableRooms: number;
}

const AMENITY_ICONS: Record<string, any> = {
  "free wifi": Wifi,
  "parking": Car,
  "air conditioning": Wind,
  "restaurant": Utensils,
  "spa": Waves,
  "room service": Coffee,
  "swimming pool": Waves,
  "lift": CheckCircle2,
  "power backup": Shield,
  "laundry": CheckCircle2,
  "cctv security": Shield,
  "gym": Dumbbell,
  "breakfast": Coffee,
  "wifi": Wifi,
  "pool": Waves,
  "ac": Wind,
  "security": Shield,
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: "Standard", deluxe: "Deluxe", suite: "Suite",
  family: "Family", single: "Single", double: "Double", twin: "Twin",
};

const NEARBY_CATEGORY_ICONS: Record<string, any> = {
  tourist_place: Navigation,
  railway_station: Train,
  airport: Plane,
  bus_stand: Bus,
  hospital: Hospital,
  market: ShoppingBag,
  other: MapPin,
};

const NEARBY_CATEGORY_LABELS: Record<string, string> = {
  tourist_place: "Tourist Place",
  railway_station: "Railway Station",
  airport: "Airport",
  bus_stand: "Bus Stand",
  hospital: "Hospital",
  market: "Market",
  other: "Other",
};

function NearbyDistances({ hotelId }: { hotelId: number }) {
  const { data, isLoading } = useGetHotelNearbyPlaces(hotelId);
  const nearby = data?.nearby ?? [];
  if (isLoading || nearby.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" /> Nearby Distances
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2.5">
          {nearby.map((item) => {
            const Icon = NEARBY_CATEGORY_ICONS[item.category] ?? MapPin;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.placeName}</p>
                  <p className="text-xs text-muted-foreground">{NEARBY_CATEGORY_LABELS[item.category] ?? item.category}</p>
                </div>
                <div className="text-right shrink-0">
                  {item.distanceKm != null && (
                    <p className="text-sm font-semibold text-primary">{item.distanceKm} km</p>
                  )}
                  {item.estimatedTimeMinutes != null && (
                    <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                      <Clock className="h-3 w-3" /> {item.estimatedTimeMinutes} min
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Photo Gallery with category tabs + lightbox ───────────────────────────────
type CategorizedPhoto = { url: string; category: string };
const PHOTO_CATEGORIES = ["all", "room", "lobby", "facade", "nearby"] as const;
const CATEGORY_LABELS: Record<string, string> = { all: "All", room: "Room", lobby: "Lobby", facade: "Exterior", nearby: "Nearby" };

function Gallery({ hotel }: { hotel: Hotel }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);

  const categorized: CategorizedPhoto[] = hotel.categorizedPhotos ?? [];
  const uncategorized: CategorizedPhoto[] = (hotel.galleryImages ?? []).map((u) => ({ url: u, category: "uncategorized" }));
  const cover: CategorizedPhoto[] = hotel.coverImage ? [{ url: hotel.coverImage, category: "uncategorized" }] : [];

  const allPhotos: CategorizedPhoto[] = [
    ...categorized,
    ...uncategorized.filter((u) => !categorized.some((c) => c.url === u.url)),
    ...cover.filter((c) => !categorized.some((x) => x.url === c.url) && !uncategorized.some((x) => x.url === c.url)),
  ];

  const availableTabs = PHOTO_CATEGORIES.filter((tab) =>
    tab === "all" ? allPhotos.length > 0 : categorized.some((p) => p.category === tab)
  );

  const filtered = activeTab === "all" ? allPhotos : allPhotos.filter((p) => p.category === activeTab);

  if (!allPhotos.length) return (
    <div className="h-44 bg-muted flex items-center justify-center rounded-xl">
      <BedDouble className="h-12 w-12 text-muted-foreground" />
    </div>
  );

  const openLightbox = (photos: CategorizedPhoto[], idx: number) => {
    setLightbox({ imgs: photos.map((p) => p.url), idx });
  };

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      {availableTabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {CATEGORY_LABELS[tab] ?? tab}
              {tab !== "all" && (
                <span className="ml-1 opacity-70">({allPhotos.filter((p) => p.category === tab).length})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hero photo */}
      {filtered.length > 0 && (
        <div
          className="relative h-52 rounded-xl overflow-hidden bg-black cursor-pointer"
          onClick={() => openLightbox(filtered, 0)}
        >
          <img src={imgUrl(filtered[0].url, 800)} alt={hotel.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {filtered.length > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              +{filtered.length - 1} photos
            </div>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {filtered.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5">
          {filtered.slice(1, 5).map((photo, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => openLightbox(filtered, i + 1)}
            >
              <img src={imgUrl(photo.url, 200)} alt="" className="w-full h-full object-cover" />
              {i === 3 && filtered.length > 5 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
                  +{filtered.length - 5}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-white text-sm font-medium">{lightbox.idx + 1} / {lightbox.imgs.length}</span>
            <button onClick={() => setLightbox(null)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={imgUrl(lightbox.imgs[lightbox.idx], 1200)}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
            {lightbox.imgs.length > 1 && (
              <>
                <button
                  onClick={() => setLightbox((lb) => lb ? { ...lb, idx: (lb.idx - 1 + lb.imgs.length) % lb.imgs.length } : null)}
                  className="absolute left-3 h-10 w-10 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={() => setLightbox((lb) => lb ? { ...lb, idx: (lb.idx + 1) % lb.imgs.length } : null)}
                  className="absolute right-3 h-10 w-10 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>
          {/* Dot strip */}
          <div className="flex justify-center gap-1.5 py-4 pb-safe" onClick={(e) => e.stopPropagation()}>
            {lightbox.imgs.slice(0, 12).map((_, i) => (
              <button key={i} onClick={() => setLightbox((lb) => lb ? { ...lb, idx: i } : null)}
                className={`rounded-full transition-all ${i === lightbox.idx ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({
  room, hotelId, hotelName, hotel, onClose, onSuccess,
}: {
  room: Room; hotelId: number; hotelName: string;
  hotel: any; onClose: () => void; onSuccess: (ref: string) => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState("");
  const [earlyCheckIn, setEarlyCheckIn] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAddress, setGuestAddress] = useState("");

  const hotelEarlyEnabled = Boolean(hotel?.earlyCheckInEnabled);
  const earlyPrice = hotelEarlyEnabled && hotel?.earlyCheckInPrice
    ? parseFloat(String(hotel.earlyCheckInPrice))
    : 0;

  const nights = Math.max(0, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
  const pricePerNight = room.finalPrice ?? room.basePrice;
  const baseAmt = pricePerNight * nights;
  const earlyAmt = earlyCheckIn && hotelEarlyEnabled ? earlyPrice : 0;
  const tax = baseAmt * 0.18;
  const total = baseAmt + tax + earlyAmt;

  const handleBooking = () => {
    if (!guestName.trim()) {
      toast({ title: "Guest name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 10) {
      toast({ title: "Valid phone required", description: "Please enter a 10-digit mobile number.", variant: "destructive" });
      return;
    }
    if (!guestAddress.trim()) {
      toast({ title: "Address required", description: "Please enter your home address.", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const mutation = useMutation({
    mutationFn: () => apiRequest("/api/bookings", {
      method: "POST",
      body: {
        hotelId, roomId: room.id, checkInDate: checkIn, checkOutDate: checkOut,
        adultsCount: adults, childrenCount: children, customerNotes: notes,
        earlyCheckIn: earlyCheckIn && hotelEarlyEnabled,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestAddress: guestAddress.trim(),
      },
    }),
    onSuccess: (data: any) => onSuccess(data.bookingRef),
    onError: (err: any) => toast({
      title: "Booking failed",
      description: err?.response?.data?.error || "Something went wrong",
      variant: "destructive",
    }),
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center sm:items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-bold">{room.name}</h3>
            <p className="text-xs text-muted-foreground">{hotelName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Guest Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Guest Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={`text-sm ${!guestName.trim() ? "border-red-200 focus-visible:ring-red-300" : ""}`}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
              <Input
                placeholder="10-digit number"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className={`text-sm ${!guestPhone.trim() ? "border-red-200 focus-visible:ring-red-300" : ""}`}
              />
            </div>
          </div>

          {/* Guest Address */}
          <div className="space-y-1">
            <Label className="text-xs">Home Address <span className="text-red-500">*</span></Label>
            <textarea
              value={guestAddress}
              onChange={(e) => setGuestAddress(e.target.value)}
              rows={2}
              placeholder="House no., Street, City, State..."
              className={`w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${!guestAddress.trim() ? "border-red-200" : "border-input"}`}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Check-in</Label>
              <Input type="date" value={checkIn} min={today}
                onChange={(e) => setCheckIn(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Check-out</Label>
              <Input type="date" value={checkOut} min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Guests */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Adults</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setAdults(a => Math.max(1, a - 1))}
                  className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium">−</button>
                <span className="w-6 text-center text-sm font-semibold">{adults}</span>
                <button onClick={() => setAdults(a => Math.min(room.adultsCapacity, a + 1))}
                  className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium">+</button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Children</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setChildren(c => Math.max(0, c - 1))}
                  className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium">−</button>
                <span className="w-6 text-center text-sm font-semibold">{children}</span>
                <button onClick={() => setChildren(c => Math.min(room.childrenCapacity, c + 1))}
                  className="h-8 w-8 rounded-full border flex items-center justify-center text-lg font-medium">+</button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Special requests (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special requests..."
              className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Early Check-in toggle */}
          {hotelEarlyEnabled && earlyPrice > 0 && (
            <div
              onClick={() => setEarlyCheckIn((v) => !v)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${earlyCheckIn ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div>
                <p className="text-sm font-medium">Early Check-in</p>
                <p className="text-xs text-muted-foreground">
                  {hotel?.earlyCheckInTime ? `From ${hotel.earlyCheckInTime}` : "Earlier than standard time"} · +₹{earlyPrice.toLocaleString("en-IN")}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${earlyCheckIn ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                {earlyCheckIn && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
            </div>
          )}

          {/* Price summary */}
          {nights > 0 && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">₹{pricePerNight.toLocaleString("en-IN")} × {nights} night{nights !== 1 ? "s" : ""}</span>
                <span>₹{baseAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              {earlyAmt > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Early check-in</span>
                  <span>₹{earlyAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18%)</span>
                <span>₹{tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1.5">
                <span>Total</span>
                <span className="text-primary">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={nights === 0 || mutation.isPending}
            onClick={handleBooking}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("confirm_booking")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Room Detail Sheet ──────────────────────────────────────────────────────────
function RoomDetailSheet({
  room, onClose, hotelId, onSuccess,
}: {
  room: Room; onClose: () => void; hotelId: number; onSuccess: (ref: string) => void;
}) {
  const { toast } = useToast();
  const [imgIdx, setImgIdx] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allPhotos = [
    ...(room.coverImage ? [room.coverImage] : []),
    ...(room.galleryImages ?? []),
  ];
  const ROOM_TYPE_LABELS: Record<string, string> = {
    standard: "Standard", deluxe: "Deluxe", suite: "Suite",
    family: "Family", single: "Single", double: "Double", twin: "Twin",
  };
  const AMENITY_ICONS_LOCAL: Record<string, any> = {
    "free wifi": Wifi, "wifi": Wifi,
    "parking": Car, "free parking": Car,
    "air conditioning": Wind, "ac": Wind,
    "restaurant": Utensils,
    "spa": Waves, "hot tub": Waves, "jacuzzi": Waves,
    "room service": ConciergeBell, "24 hour room service": ConciergeBell, "24-hour room service": ConciergeBell,
    "swimming pool": Waves, "pool": Waves,
    "lift": Package, "elevator": Package,
    "power backup": Zap,
    "laundry": Shirt,
    "cctv security": Shield, "security": Shield,
    "gym": Dumbbell, "fitness center": Dumbbell,
    "smart tv": Tv, "tv": Tv, "television": Tv,
    "mini fridge": Refrigerator, "refrigerator": Refrigerator, "fridge": Refrigerator,
    "hot water": Droplets, "geyser": Droplets, "water heater": Droplets,
    "work desk": MonitorDot, "desk": MonitorDot,
    "safe locker": Lock, "safe": Lock, "locker": Lock,
    "telephone": Phone, "phone": Phone,
    "hair dryer": Wind,
    "wardrobe": Shirt, "closet": Shirt,
    "tea/coffee maker": Coffee, "coffee maker": Coffee, "tea maker": Coffee, "kettle": Coffee,
    "balcony": Building2, "terrace": Building2,
    "bathroom": Bath, "private bathroom": Bath, "attached bathroom": Bath,
    "24x7 facility manager": Clock, "24/7 support": Clock,
  };
  const hasDiscount = room.discountPercentage > 0;
  const price = room.finalPrice ?? room.basePrice;
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" />

      {/* Full Screen Sheet */}
      <div
        className="bg-background overflow-hidden flex flex-col"
        style={{ height: "100vh", maxHeight: "100vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar: Back arrow */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <span className="font-semibold text-sm">{room.name}</span>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Photo carousel — clickable to fullscreen gallery */}
          {allPhotos.length > 0 ? (
            <div className="relative h-56 bg-black" onClick={() => setGalleryOpen(true)}>
              <img
                src={imgUrl(allPhotos[imgIdx], 800)}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              {allPhotos.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
                    onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length); }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1"
                    onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % allPhotos.length); }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-2 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {imgIdx + 1}/{allPhotos.length}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                Tap to view gallery
              </div>
            </div>
          ) : (
            <div className="h-32 bg-muted flex items-center justify-center">
              <BedDouble className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* Name + price */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{room.name}</h2>
                <Badge variant="outline" className="text-xs mt-1">
                  {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                </Badge>
              </div>
              <div className="text-right shrink-0">
                {hasDiscount && (
                  <p className="text-xs text-muted-foreground line-through">₹{room.basePrice.toLocaleString("en-IN")}</p>
                )}
                <div className="flex items-center gap-0.5 text-primary font-bold text-lg">
                  <IndianRupee className="h-4 w-4" />
                  <span>{price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <p className="text-xs text-muted-foreground">/night</p>
              </div>
            </div>

            {/* Capacity + availability */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>{room.adultsCapacity} adults{room.childrenCapacity > 0 ? `, ${room.childrenCapacity} children` : ""}</span>
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs text-green-700 font-medium">
                  {room.discountPercentage}% off
                </div>
              )}
              <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                room.availableRooms === 0
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}>
                <BedDouble className="h-3.5 w-3.5" />
                {room.availableRooms === 0 ? "Fully Booked" : `${room.availableRooms} room${room.availableRooms !== 1 ? "s" : ""} available`}
              </div>
            </div>

            {/* Description */}
            {room.description && (
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">About this Room</p>
                <p className="text-sm text-white leading-snug">{room.description}</p>
              </div>
            )}

            {/* Amenities — vertical list like booking.com */}
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <p className="text-base font-bold mb-3">Amenities</p>
                <div className="space-y-0">
                  {(showAllAmenities ? room.amenities! : room.amenities!.slice(0, 6)).map((a, idx) => {
                    const Icon = AMENITY_ICONS_LOCAL[a.toLowerCase()] ?? CheckCircle2;
                    const isLast = idx === (showAllAmenities ? room.amenities!.length : Math.min(6, room.amenities!.length)) - 1;
                    return (
                      <div
                        key={a}
                        className={`flex items-center gap-4 py-3.5 ${!isLast ? "border-b border-muted" : ""}`}
                      >
                        <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center shrink-0 bg-background">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <span className="text-sm font-medium capitalize">{a}</span>
                      </div>
                    );
                  })}
                </div>
                {room.amenities!.length > 6 && (
                  <button
                    className="mt-3 w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setShowAllAmenities((v) => !v)}
                  >
                    {showAllAmenities ? (
                      <><ChevronUp className="h-4 w-4" /> Show less</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> View all {room.amenities.length} amenities</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Pay at hotel note */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
              <IndianRupee className="h-4 w-4 text-green-700 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">Payment at Hotel</p>
                <p className="text-[11px] text-green-700">No online payment needed — pay directly at the hotel.</p>
              </div>
            </div>

            {/* Inline Booking Form in Sheet */}
            {showForm ? (
              <div className="pb-2 space-y-3 border-t pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Name <span className="text-red-500">*</span></Label>
                    <Input placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Phone <span className="text-red-500">*</span></Label>
                    <Input placeholder="10-digit" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Check-in</Label>
                    <Input type="date" value={checkIn} min={todayStr} onChange={(e) => setCheckIn(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Check-out</Label>
                    <Input type="date" value={checkOut} min={checkIn || todayStr} onChange={(e) => setCheckOut(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Adults</Label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAdults(a => Math.max(1, a - 1))} className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium">−</button>
                      <span className="text-sm font-semibold">{adults}</span>
                      <button onClick={() => setAdults(a => Math.min(room.adultsCapacity, a + 1))} className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium">+</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Children</Label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setChildren(c => Math.max(0, c - 1))} className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium">−</button>
                      <span className="text-sm font-semibold">{children}</span>
                      <button onClick={() => setChildren(c => Math.min(room.childrenCapacity, c + 1))} className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium">+</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button size="sm" className="flex-1 h-9 text-xs" disabled={isSubmitting}
                    onClick={async () => {
                      if (!guestName.trim()) { toast({ title: "Guest name required", description: "Please enter your full name.", variant: "destructive" }); return; }
                      if (!guestPhone.trim() || guestPhone.trim().length < 10) { toast({ title: "Valid phone required", description: "Please enter a 10-digit mobile number.", variant: "destructive" }); return; }
                      const nights = Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
                      if (nights === 0) { toast({ title: "Invalid dates", description: "Check-out must be after check-in.", variant: "destructive" }); return; }
                      setIsSubmitting(true);
                      try {
                        const res = await apiRequest("/api/bookings", {
                          method: "POST",
                          body: { hotelId, roomId: room.id, checkInDate: checkIn, checkOutDate: checkOut, adultsCount: adults, childrenCount: children, guestName: guestName.trim(), guestPhone: guestPhone.trim(), customerNotes: "" },
                        }) as any;
                        toast({ title: "Booking confirmed!", description: "Ref: " + res.bookingRef });
                        onClose(); onSuccess(res.bookingRef);
                      } catch (err: any) {
                        toast({ title: "Booking failed", description: err?.response?.data?.error || "Something went wrong", variant: "destructive" });
                      } finally { setIsSubmitting(false); }
                    }}
                  >
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CalendarDays className="h-3.5 w-3.5 mr-1" />}
                    Book Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pb-2 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
                <Button
                  className="flex-1"
                  disabled={room.availableRooms === 0}
                  onClick={() => setShowForm(true)}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {room.availableRooms === 0 ? "Fully Booked" : "Book this Room"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Gallery */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black flex flex-col"
          onClick={() => setGalleryOpen(false)}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-white text-sm font-medium">
              {imgIdx + 1} / {allPhotos.length}
            </span>
            <button
              onClick={() => setGalleryOpen(false)}
              className="p-2 rounded-full bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={imgUrl(allPhotos[imgIdx], 1200)}
              alt={room.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Bottom nav */}
          {allPhotos.length > 1 && (
            <div className="flex items-center justify-center gap-6 px-4 py-4">
              <button
                className="p-3 rounded-full bg-white/20 text-white"
                onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="p-3 rounded-full bg-white/20 text-white"
                onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % allPhotos.length); }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const hotelId = parseInt(id, 10);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [inlineBooking, setInlineBooking] = useState<{
    roomId: number | null;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    guestName: string;
    guestPhone: string;
  }>({
    roomId: null, checkIn: todayStr, checkOut: tomorrowStr,
    adults: 1, children: 0, guestName: "", guestPhone: "",
  });

  const { data: hotel, isLoading: hotelLoading } = useQuery<Hotel>({
    queryKey: ["hotel", hotelId],
    queryFn: () => apiRequest(`/api/hotels/${hotelId}`),
    enabled: !!hotelId,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery<{ rooms: Room[] }>({
    queryKey: ["rooms", hotelId],
    queryFn: () => apiRequest(`/api/rooms?hotelId=${hotelId}&status=active`),
    enabled: !!hotelId,
  });

  const { data: reviewsData } = useQuery<{
    reviews: {
      id: number; reviewTitle: string; reviewDescription: string;
      overallRating: number; customerName: string | null;
      customerPhoto: string | null; createdAt: string;
    }[];
    total: number;
    summary: { avgOverall: number; total: number };
  }>({
    queryKey: ["hotel-reviews", hotelId],
    queryFn: () => apiRequest(`/api/reviews/hotel/${hotelId}?limit=20`),
    enabled: !!hotelId,
  });

  const rooms = roomsData?.rooms ?? [];
  if (hotelLoading) return (
    <CustomerLayout backHref="/hotels" backLabel="Back to Hotels">
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </CustomerLayout>
  );

  if (!hotel) return (
    <CustomerLayout backHref="/hotels" backLabel="Back to Hotels">
      <div className="px-4 py-12 text-center space-y-3">
        <BedDouble className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="font-medium">Hotel not found</p>
        <Link href="/hotels"><Button variant="outline">Back to Hotels</Button></Link>
      </div>
    </CustomerLayout>
  );

  // Booking success screen
  if (bookingSuccess) return (
    <CustomerLayout>
      <div className="px-4 py-12 flex flex-col items-center text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">{t("booking_confirmed")}</h2>
        <p className="text-muted-foreground text-sm">Your booking reference is</p>
        <div className="bg-primary/10 text-primary font-mono font-bold text-lg px-4 py-2 rounded-xl">
          {bookingSuccess}
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          The hotel will confirm your booking shortly. You can track it in {t("my_bookings")}.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate("/hotels")}>Browse More Hotels</Button>
          <Button onClick={() => navigate("/customer/bookings")}>{t("my_bookings")}</Button>
        </div>
      </div>
    </CustomerLayout>
  );

  return (
    <CustomerLayout backHref="/hotels" backLabel="Back to Hotels">
      <div className="pb-20">
        {/* Back button + Share */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button onClick={() => navigate("/hotels")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Hotels
          </button>
          <button
            onClick={() => {
              const text = encodeURIComponent(`Yeh hotel dekho: ${hotel.name} — ${window.location.href}`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] border border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/15 rounded-full px-3 py-1.5 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp pe share karo
          </button>
        </div>

        {/* Gallery */}
        <div className="px-4 mb-4">
          <Gallery hotel={hotel} />
        </div>

        {/* Hotel info */}
        <div className="px-4 space-y-4">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-primary via-primary/80 to-amber-600 bg-clip-text text-transparent">
                {hotel.name}
              </h1>
              {hotel.starRating && hotel.starRating > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-medium text-amber-700 ml-1">{hotel.starRating} Star Hotel</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {hotel.category && (
                  <Badge className="text-xs bg-primary/10 text-primary border border-primary/20 font-semibold capitalize">{hotel.category}</Badge>
                )}
              </div>
            </div>
            {parseFloat(hotel.rating ?? "0") > 0 && (
              <div className="flex items-center gap-1 shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-sm">{parseFloat(hotel.rating!).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({hotel.reviewCount})</span>
              </div>
            )}
          </div>

          {/* Location */}
          {(hotel.address || hotel.city) && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>
                {[hotel.address, hotel.city, hotel.state, hotel.pincode].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Check-in / out */}
          {(hotel.checkInTime || hotel.checkOutTime) && (
            <div className="flex gap-3 flex-wrap">
              {hotel.checkInTime && (
                <div className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-3.5 py-2 shadow-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">Check-in</p>
                    <p className="text-sm font-bold">{hotel.checkInTime}</p>
                  </div>
                </div>
              )}
              {hotel.checkOutTime && (
                <div className="flex items-center gap-2 bg-rose-600 text-white rounded-xl px-3.5 py-2 shadow-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  <div className="leading-tight">
                    <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">Check-out</p>
                    <p className="text-sm font-bold">{hotel.checkOutTime}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {hotel.description && (
            <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1.5">About This Hotel</p>
              <p className="text-sm text-white leading-relaxed">{hotel.description}</p>
            </div>
          )}

          {/* Nearby Places */}
          <NearbyDistances hotelId={hotel.id} />

          {/* Amenities */}
          {hotel.amenities?.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Amenities</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a.toLowerCase()] ?? CheckCircle2;
                    return (
                      <div key={a} className="flex items-center gap-1.5 text-xs bg-muted rounded-lg px-2.5 py-1.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span className="capitalize">{a.replace(/_/g, " ")}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact */}
          {(hotel.contactMobile || hotel.website) && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {hotel.contactMobile && (
                  <a href={`tel:${hotel.contactMobile}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4" />{hotel.contactMobile}
                  </a>
                )}
                {hotel.website && (
                  <a href={hotel.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="h-4 w-4" />{hotel.website}
                  </a>
                )}
                {hotel.googleMapLink && (
                  <a href={hotel.googleMapLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <MapPin className="h-4 w-4" />View on Google Maps
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Map */}
          <MapEmbed
            name={hotel.name}
            address={hotel.address}
            city={hotel.city}
            googleMapLink={hotel.googleMapLink}
          />

          {/* Rooms */}
          <div id="rooms-section">
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" />
              Available Rooms
            </h2>

            {roomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No rooms available right now
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const price = room.finalPrice ?? room.basePrice;
                  const hasDiscount = room.discountPercentage > 0;
                  return (
                    <Card
                      key={room.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setDetailRoom(room)}
                    >
                      {room.coverImage && (
                        <div className="h-32 overflow-hidden">
                          <img src={imgUrl(room.coverImage, 600)} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        {/* Room name + type */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{room.adultsCapacity} adults{room.childrenCapacity > 0 ? `, ${room.childrenCapacity} children` : ""}</span>
                              </div>
                            </div>
                          </div>
                          {room.availableRooms > 0 ? (
                            <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              Available
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                              Full
                            </span>
                          )}
                        </div>

                        {/* Price Card */}
                        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-amber-50 px-3 py-2.5">
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-extrabold text-primary">
                                  ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">/night</span>
                              </div>
                              {hasDiscount && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm text-muted-foreground line-through">
                                    ₹{room.basePrice.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-xs font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">
                                    Save {Math.round(room.discountPercentage)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            {hasDiscount && (
                              <div className="text-right shrink-0">
                                <p className="text-[10px] text-muted-foreground">You save</p>
                                <p className="text-sm font-bold text-green-700">
                                  ₹{(room.basePrice - price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline Booking Form */}
                        {inlineBooking.roomId === room.id ? (
                          <div className="space-y-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">Name <span className="text-red-500">*</span></Label>
                                <Input
                                  placeholder="Full name"
                                  value={inlineBooking.guestName}
                                  onChange={(e) => setInlineBooking({ ...inlineBooking, guestName: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">Phone <span className="text-red-500">*</span></Label>
                                <Input
                                  placeholder="10-digit number"
                                  type="tel"
                                  value={inlineBooking.guestPhone}
                                  onChange={(e) => setInlineBooking({ ...inlineBooking, guestPhone: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">Check-in</Label>
                                <Input
                                  type="date" value={inlineBooking.checkIn} min={todayStr}
                                  onChange={(e) => setInlineBooking({ ...inlineBooking, checkIn: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">Check-out</Label>
                                <Input
                                  type="date" value={inlineBooking.checkOut} min={inlineBooking.checkIn || todayStr}
                                  onChange={(e) => setInlineBooking({ ...inlineBooking, checkOut: e.target.value })}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">Adults</Label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setInlineBooking(b => ({ ...b, adults: Math.max(1, b.adults - 1) }))}
                                    className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium"
                                  >−</button>
                                  <span className="text-sm font-semibold">{inlineBooking.adults}</span>
                                  <button
                                    onClick={() => setInlineBooking(b => ({ ...b, adults: Math.min(room.adultsCapacity, b.adults + 1) }))}
                                    className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium"
                                  >+</button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">Children</Label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setInlineBooking(b => ({ ...b, children: Math.max(0, b.children - 1) }))}
                                    className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium"
                                  >−</button>
                                  <span className="text-sm font-semibold">{inlineBooking.children}</span>
                                  <button
                                    onClick={() => setInlineBooking(b => ({ ...b, children: Math.min(room.childrenCapacity, b.children + 1) }))}
                                    className="h-7 w-7 rounded-full border flex items-center justify-center text-sm font-medium"
                                  >+</button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 text-xs"
                                onClick={() => setInlineBooking({ roomId: null, checkIn: todayStr, checkOut: tomorrowStr, adults: 1, children: 0, guestName: "", guestPhone: "" })}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-9 text-xs"
                                onClick={async () => {
                                  if (!inlineBooking.guestName.trim()) {
                                    toast({ title: "Guest name required", description: "Please enter your full name.", variant: "destructive" });
                                    return;
                                  }
                                  if (!inlineBooking.guestPhone.trim() || inlineBooking.guestPhone.trim().length < 10) {
                                    toast({ title: "Valid phone required", description: "Please enter a 10-digit mobile number.", variant: "destructive" });
                                    return;
                                  }
                                  const nights = Math.max(0, Math.ceil((new Date(inlineBooking.checkOut).getTime() - new Date(inlineBooking.checkIn).getTime()) / 86400000));
                                  if (nights === 0) {
                                    toast({ title: "Invalid dates", description: "Check-out must be after check-in.", variant: "destructive" });
                                    return;
                                  }
                                  try {
                                    const res = await apiRequest("/api/bookings", {
                                      method: "POST",
                                      body: {
                                        hotelId, roomId: room.id,
                                        checkInDate: inlineBooking.checkIn,
                                        checkOutDate: inlineBooking.checkOut,
                                        adultsCount: inlineBooking.adults,
                                        childrenCount: inlineBooking.children,
                                        guestName: inlineBooking.guestName.trim(),
                                        guestPhone: inlineBooking.guestPhone.trim(),
                                        customerNotes: "",
                                      },
                                    }) as any;
                                    toast({ title: "Booking confirmed!", description: "Ref: " + res.bookingRef, variant: "default" });
                                    setBookingSuccess(res.bookingRef);
                                    setInlineBooking({ roomId: null, checkIn: todayStr, checkOut: tomorrowStr, adults: 1, children: 0, guestName: "", guestPhone: "" });
                                    queryClient.invalidateQueries({ queryKey: ["rooms", hotelId] });
                                  } catch (err: any) {
                                    toast({ title: "Booking failed", description: err?.response?.data?.error || "Something went wrong", variant: "destructive" });
                                  }
                                }}
                              >
                                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                                Book Now
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              className="flex-1 h-9 text-sm"
                              onClick={(e) => { e.stopPropagation(); setInlineBooking({ ...inlineBooking, roomId: room.id, adults: 1, children: 0 }); }}
                              disabled={room.availableRooms === 0}
                            >
                              <CalendarDays className="h-4 w-4 mr-2" />
                              {room.availableRooms === 0 ? t("fully_booked") : "Book Now"}
                            </Button>
                            {room.availableRooms > 0 && (
                              <div className="flex items-center gap-1 shrink-0 bg-green-50 border border-green-200 rounded-lg px-2.5 py-2">
                                <IndianRupee className="h-3 w-3 text-green-700" />
                                <span className="text-[11px] font-semibold text-green-700 whitespace-nowrap">Pay at Hotel</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Reviews */}
          {reviewsData && reviewsData.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  Guest Reviews
                  <span className="text-sm font-normal text-muted-foreground">({reviewsData.total})</span>
                </h2>
                {reviewsData.summary.avgOverall > 0 && (
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-sm">{Number(reviewsData.summary.avgOverall).toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {reviewsData.reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(review.customerName ?? "G").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{review.customerName ?? "Guest"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < review.overallRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{review.reviewTitle}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.reviewDescription}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          {(hotel.policies || hotel.cancellationPolicy) && (
            <div className="space-y-3">
              {hotel.policies && (() => {
                const items = hotel.policies!
                  .split(/\s*[-–]\s+/)
                  .map(s => s.trim())
                  .filter(Boolean);
                return (
                  <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border">
                      <span className="text-base">📋</span>
                      <h3 className="font-semibold text-sm text-primary">Hotel Policies</h3>
                    </div>
                    <div className="divide-y divide-border/60">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {hotel.cancellationPolicy && (() => {
                const items = hotel.cancellationPolicy!
                  .split(/\s*[-–]\s+/)
                  .map(s => s.trim())
                  .filter(Boolean);
                return (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-100/70 border-b border-amber-200">
                      <span className="text-base">⚠️</span>
                      <h3 className="font-semibold text-sm text-amber-800">Cancellation Policy</h3>
                    </div>
                    <div className="divide-y divide-amber-200/60">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-amber-900 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Book Now CTA after policies */}
          <button
            onClick={() => {
              const el = document.getElementById("rooms-section");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base rounded-2xl py-4 shadow-lg active:scale-95 transition-transform"
          >
            <CalendarDays className="h-5 w-5" />
            Book Now — Choose a Room
          </button>
        </div>
      </div>

      {/* WhatsApp share — fixed bottom pill */}
      <div className="fixed bottom-16 left-0 right-0 flex justify-center pointer-events-none z-40">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Yeh hotel dekho: ${hotel.name} — ${window.location.origin}/hotels/${hotelId}`)}`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#25D366] text-[#25D366] bg-white shadow-md text-sm font-semibold hover:bg-[#25D366]/5 transition-colors"
        >
          <svg className="h-4 w-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp pe share karo
        </a>
      </div>

      {/* Room detail sheet */}
      {detailRoom && (
        <RoomDetailSheet
          room={detailRoom}
          onClose={() => setDetailRoom(null)}
          hotelId={hotelId}
          onSuccess={(ref) => { setDetailRoom(null); setBookingSuccess(ref); }}
        />
      )}

      {/* Booking modal */}
      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          hotelId={hotelId}
          hotelName={hotel.name}
          hotel={hotel}
          onClose={() => setSelectedRoom(null)}
          onSuccess={(ref) => { setSelectedRoom(null); setBookingSuccess(ref); }}
        />
      )}
    </CustomerLayout>
  );
}
