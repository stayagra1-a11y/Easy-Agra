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
  CalendarDays, X,
} from "lucide-react";

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
  room, hotelId, hotelName, onClose, onSuccess,
}: {
  room: Room; hotelId: number; hotelName: string;
  onClose: () => void; onSuccess: (ref: string) => void;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState("");

  const nights = Math.max(0, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  ));
  const pricePerNight = room.finalPrice ?? room.basePrice;
  const baseAmt = pricePerNight * nights;
  const tax = baseAmt * 0.18;
  const total = baseAmt + tax;

  const mutation = useMutation({
    mutationFn: () => apiRequest("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        hotelId, roomId: room.id, checkInDate: checkIn, checkOutDate: checkOut,
        adultsCount: adults, childrenCount: children, customerNotes: notes,
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

          {/* Price summary */}
          {nights > 0 && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">₹{pricePerNight.toLocaleString("en-IN")} × {nights} night{nights !== 1 ? "s" : ""}</span>
                <span>₹{baseAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
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
        {/* Back button */}
        <div className="px-4 pt-4 pb-2">
          <button onClick={() => navigate("/hotels")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Hotels
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
              {hotel.category && (
                <Badge variant="secondary" className="mt-1 text-xs">{hotel.category}</Badge>
              )}
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

      {/* Booking modal */}
      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          hotelId={hotelId}
          hotelName={hotel.name}
          onClose={() => setSelectedRoom(null)}
          onSuccess={(ref) => { setSelectedRoom(null); setBookingSuccess(ref); }}
        />
      )}
    </CustomerLayout>
  );
}
