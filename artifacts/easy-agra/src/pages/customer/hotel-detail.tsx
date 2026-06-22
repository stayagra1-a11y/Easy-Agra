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
} from "lucide-react";
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
  rating: string | null;
  reviewCount: number;
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
  amenities: string[] | null;
  coverImage: string | null;
  status: string;
  totalRooms: number;
  availableRooms: number;
}

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi, parking: Car, breakfast: Coffee, restaurant: Utensils,
  gym: Dumbbell, ac: Wind, pool: Waves, security: Shield,
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

// ── Gallery ───────────────────────────────────────────────────────────────────
function Gallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  if (!images.length) return (
    <div className="h-52 bg-muted flex items-center justify-center rounded-xl">
      <BedDouble className="h-12 w-12 text-muted-foreground" />
    </div>
  );
  return (
    <div className="relative h-56 rounded-xl overflow-hidden bg-black">
      <img src={imgUrl(images[current], 1000)} alt={name} className="w-full h-full object-cover" />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
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
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState("");
  const [earlyCheckIn, setEarlyCheckIn] = useState(false);

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

  const mutation = useMutation({
    mutationFn: () => apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        hotelId, roomId: room.id, checkInDate: checkIn, checkOutDate: checkOut,
        adultsCount: adults, childrenCount: children, customerNotes: notes,
        earlyCheckIn: earlyCheckIn && hotelEarlyEnabled,
      }),
    }),
    onSuccess: (data: any) => onSuccess(data.bookingRef),
    onError: (err: any) => toast({
      title: "Booking failed",
      description: err?.response?.data?.error || "Something went wrong",
      variant: "destructive",
    }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center sm:items-center p-4">
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
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Booking
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const hotelId = parseInt(id, 10);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

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

  const rooms = roomsData?.rooms ?? [];
  const allImages = hotel ? [
    ...(hotel.coverImage ? [hotel.coverImage] : []),
    ...(hotel.galleryImages ?? []),
  ] : [];

  if (hotelLoading) return (
    <CustomerLayout>
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </CustomerLayout>
  );

  if (!hotel) return (
    <CustomerLayout>
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
        <h2 className="text-xl font-bold">Booking Confirmed!</h2>
        <p className="text-muted-foreground text-sm">Your booking reference is</p>
        <div className="bg-primary/10 text-primary font-mono font-bold text-lg px-4 py-2 rounded-xl">
          {bookingSuccess}
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          The hotel will confirm your booking shortly. You can track it in My Bookings.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate("/hotels")}>Browse More Hotels</Button>
          <Button onClick={() => navigate("/customer/bookings")}>My Bookings</Button>
        </div>
      </div>
    </CustomerLayout>
  );

  return (
    <CustomerLayout>
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
          <Gallery images={allImages} name={hotel.name} />
        </div>

        {/* Hotel info */}
        <div className="px-4 space-y-4">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-xl font-bold leading-tight">{hotel.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {hotel.category && (
                  <Badge variant="secondary" className="text-xs">{hotel.category}</Badge>
                )}
                {(hotel as any).starRating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: (hotel as any).starRating }).map((_: unknown, i: number) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{(hotel as any).starRating} Star</span>
                  </div>
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
            <div className="flex gap-4 text-sm">
              {hotel.checkInTime && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Check-in: <strong className="text-foreground">{hotel.checkInTime}</strong></span>
                </div>
              )}
              {hotel.checkOutTime && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Check-out: <strong className="text-foreground">{hotel.checkOutTime}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {hotel.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{hotel.description}</p>
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
          <div>
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
                    <Card key={room.id} className="overflow-hidden">
                      {room.coverImage && (
                        <div className="h-32 overflow-hidden">
                          <img src={imgUrl(room.coverImage, 600)} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <Badge variant="outline" className="text-xs mt-1">
                              {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                            </Badge>
                          </div>
                          <div className="text-right shrink-0">
                            {hasDiscount && (
                              <p className="text-xs text-muted-foreground line-through">
                                ₹{room.basePrice.toLocaleString("en-IN")}
                              </p>
                            )}
                            <div className="flex items-center gap-0.5 text-primary font-bold">
                              <IndianRupee className="h-3.5 w-3.5" />
                              <span>{price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">/night</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{room.adultsCapacity} adults{room.childrenCapacity > 0 ? `, ${room.childrenCapacity} children` : ""}</span>
                          </div>
                          {hasDiscount && (
                            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                              {room.discountPercentage}% off
                            </Badge>
                          )}
                        </div>

                        <Button
                          className="w-full h-9 text-sm"
                          onClick={() => setSelectedRoom(room)}
                          disabled={room.availableRooms === 0}
                        >
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {room.availableRooms === 0 ? "Fully Booked" : "Book This Room"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Policies */}
          {(hotel.policies || hotel.cancellationPolicy) && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Policies</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">
                {hotel.policies && <p>{hotel.policies}</p>}
                {hotel.cancellationPolicy && (
                  <p><strong className="text-foreground">Cancellation:</strong> {hotel.cancellationPolicy}</p>
                )}
              </CardContent>
            </Card>
          )}
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
