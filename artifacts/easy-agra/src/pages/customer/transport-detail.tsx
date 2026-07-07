import { useState } from "react";
import { useParams } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Train, Bus, Plane, MapPin, Phone, Clock, ArrowLeft, ExternalLink,
  Loader2, Navigation, Share2, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; badge: string }> = {
  railway_station: {
    icon: Train,
    label: "Railway Station",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  bus_stand: {
    icon: Bus,
    label: "Bus Stand",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  airport: {
    icon: Plane,
    label: "Airport",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
};

interface TransportLocation {
  id: number;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  state: string | null;
  googleMapsLink: string | null;
  contactNumber: string | null;
  timings: string | null;
  mainImage: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchTransportDetail(id: string) {
  const res = await fetch(`${BASE}/api/transport/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default function TransportDetail() {
  const params = useParams();
  const { toast } = useToast();
  const id = params.id;
  const [lightbox, setLightbox] = useState<{ imgs: string[]; idx: number } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["transport", id],
    queryFn: () => fetchTransportDetail(id!),
    enabled: !!id,
  });

  const loc: TransportLocation | undefined = data;
  const cfg = loc ? TYPE_CONFIG[loc.type] || TYPE_CONFIG.railway_station : null;
  const Icon = cfg?.icon || Train;

  const handleCall = () => {
    if (loc?.contactNumber) {
      window.location.href = `tel:${loc.contactNumber}`;
    }
  };

  const handleMaps = () => {
    if (loc?.googleMapsLink) {
      window.open(loc.googleMapsLink, "_blank");
    } else if (loc?.address) {
      const query = encodeURIComponent(loc.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: loc?.name || "Transport Info",
      text: `${loc?.name} - ${loc?.address || ""}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied!" });
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!loc) {
    return (
      <CustomerLayout>
        <div className="px-4 py-10 text-center">
          <p className="text-muted-foreground">Transport location not found</p>
          <Link href="/transport">
            <Button variant="outline" className="mt-4 gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Transport
            </Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="pb-6">
        {/* Image Header */}
        {loc.mainImage ? (
          <div
            className="relative h-48 w-full cursor-pointer"
            onClick={() => {
              const all = [loc.mainImage, loc.image1, loc.image2, loc.image3].filter(Boolean) as string[];
              setLightbox({ imgs: all, idx: 0 });
            }}
          >
            <img src={loc.mainImage} alt={loc.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-white" />
                <Badge className="text-[10px] bg-white/20 text-white border-white/30" variant="outline">
                  {cfg?.label}
                </Badge>
              </div>
              <h1 className="text-lg font-bold text-white">{loc.name}</h1>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-primary" />
              <Badge className={`text-[10px] ${cfg?.badge}`} variant="secondary">
                {cfg?.label}
              </Badge>
            </div>
            <h1 className="text-lg font-bold">{loc.name}</h1>
          </div>
        )}

        {/* Back & Share */}
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/transport">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1 text-muted-foreground">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>

        <div className="px-4 space-y-3">
          {/* Description */}
          {loc.description && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{loc.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {loc.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {loc.address}
                      {loc.city && `, ${loc.city}`}
                      {loc.state && `, ${loc.state}`}
                      {loc.pincode && ` - ${loc.pincode}`}
                    </p>
                  </div>
                </div>
              )}
              {loc.timings && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timings</p>
                    <p className="text-sm font-medium">{loc.timings}</p>
                  </div>
                </div>
              )}
              {loc.contactNumber && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{loc.contactNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Gallery */}
          {((loc.image1 || loc.image2 || loc.image3)) && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">More Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {[loc.image1, loc.image2, loc.image3].filter(Boolean).map((img, i) => {
                    const all = [loc.mainImage, loc.image1, loc.image2, loc.image3].filter(Boolean) as string[];
                    const lightboxIdx = all.indexOf(img!);
                    return (
                      <button
                        key={i}
                        onClick={() => setLightbox({ imgs: all, idx: lightboxIdx })}
                        className="w-full h-24 rounded-lg overflow-hidden focus:outline-none active:scale-95 transition-transform"
                      >
                        <img src={img!} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full gap-2" onClick={handleCall} disabled={!loc.contactNumber}>
              <Phone className="h-4 w-4" /> Call Now
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={handleMaps} disabled={!loc.address && !loc.googleMapsLink}>
              <Navigation className="h-4 w-4" /> Open Maps
            </Button>
          </div>

          {loc.googleMapsLink && (
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleMaps}>
              <ExternalLink className="h-4 w-4" /> Open in Google Maps
            </Button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center"
          style={{ zIndex: 300 }}
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightbox.idx + 1} / {lightbox.imgs.length}
          </div>

          {/* Prev */}
          {lightbox.imgs.length > 1 && (
            <button
              className="absolute left-3 text-white bg-black/50 rounded-full p-2"
              onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: (l.idx - 1 + l.imgs.length) % l.imgs.length } : null); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightbox.imgs[lightbox.idx]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          {lightbox.imgs.length > 1 && (
            <button
              className="absolute right-3 text-white bg-black/50 rounded-full p-2"
              onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: (l.idx + 1) % l.imgs.length } : null); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Dot indicators */}
          {lightbox.imgs.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {lightbox.imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, idx: i } : null); }}
                  className="rounded-full transition-all"
                  style={{ width: i === lightbox.idx ? 20 : 8, height: 8, background: i === lightbox.idx ? "white" : "rgba(255,255,255,0.4)" }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </CustomerLayout>
  );
}
