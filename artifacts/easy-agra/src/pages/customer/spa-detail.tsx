import { useParams, useLocation } from "wouter";
import { useGetSpaById, useGetSpaServices } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import { imgUrl } from "@/lib/cloudinary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MapPin, Clock, Phone, Globe, Star, Sparkles,
  BadgeIndianRupee, ArrowLeft, CalendarCheck, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

const CATEGORY_LABELS: Record<string, string> = {
  full_body_massage: "Full Body Massage",
  head_massage: "Head Massage",
  foot_massage: "Foot Massage",
  aromatherapy: "Aromatherapy",
  facial: "Facial",
  beauty_treatment: "Beauty Treatment",
  couples_therapy: "Couples Therapy",
  wellness_package: "Wellness Package",
};

export default function SpaDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const spaId = parseInt(id, 10);

  const { data: spa, isLoading: spaLoading } = useGetSpaById(spaId);
  const { data: services = [], isLoading: svcLoading } = useGetSpaServices(spaId);

  const isLoading = spaLoading || svcLoading;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!spa) {
    return (
      <CustomerLayout>
        <div className="px-4 py-8 text-center space-y-3">
          <p className="font-medium">Spa not found</p>
          <Link href="/spas">
            <Button variant="outline">Back to Spas</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const spaAny = spa as any;
  const rating = parseFloat(String(spaAny.rating ?? "0"));
  const availableServices = services.filter((s) => s.isAvailable);

  return (
    <CustomerLayout>
      <div className="pb-4">
        {/* Cover image */}
        <div className="relative">
          {spa.coverPhoto ? (
            <div className="h-52 overflow-hidden">
              <img
                src={imgUrl(spa.coverPhoto, 1000)}
                alt={spa.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10" />
          )}
          <div className="absolute top-3 left-3">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
              onClick={() => navigate("/spas")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 space-y-4 mt-4">
          {/* Name & rating */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold leading-tight">{spa.name}</h1>
              {rating > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({spaAny.reviewCount ?? 0})</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">{spa.address}, {spa.city}</span>
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            {spa.openingTime && spa.closingTime && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {spa.openingTime} – {spa.closingTime}
              </div>
            )}
            {spaAny.priceRange && (
              <Badge variant="secondary">{spaAny.priceRange}</Badge>
            )}
          </div>

          {spa.description && (
            <p className="text-sm text-muted-foreground">{spa.description}</p>
          )}

          {/* Map */}
          <MapEmbed
            name={spa.name}
            address={spa.address}
            city={spa.city}
          />

          {/* Contact */}
          {(spa.contactNumber || spaAny.website) && (
            <Card>
              <CardContent className="p-3 space-y-1.5">
                {spa.contactNumber && (
                  <a href={`tel:${spa.contactNumber}`} className="flex items-center gap-2 text-sm hover:text-primary">
                    <Phone className="h-4 w-4 text-primary" />
                    {spa.contactNumber}
                  </a>
                )}
                {spaAny.website && (
                  <a href={spaAny.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-primary truncate">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{spaAny.website}</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Facilities */}
          {Array.isArray(spa.facilities) && spa.facilities.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm mb-2">Facilities</h2>
              <div className="flex flex-wrap gap-1.5">
                {spa.facilities.map((f: string) => (
                  <Badge key={f} variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Services</h2>
              <span className="text-xs text-muted-foreground">
                {availableServices.length} available
              </span>
            </div>

            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services listed yet.</p>
            ) : (
              <div className="space-y-2">
                {services.map((svc) => (
                  <Card key={svc.id} className={svc.isAvailable ? "" : "opacity-60"}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{svc.name}</p>
                            {!svc.isAvailable && (
                              <Badge variant="outline" className="text-xs shrink-0">Unavailable</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {CATEGORY_LABELS[svc.category] ?? svc.category}
                          </p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {svc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {svc.duration} min
                            </span>
                            <span className="flex items-center gap-0.5 text-sm font-bold text-primary">
                              <BadgeIndianRupee className="h-3.5 w-3.5" />
                              ₹{Number(svc.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {svc.isAvailable && (
                          <Link href={`/spas/${spaId}/book?serviceId=${svc.id}&serviceName=${encodeURIComponent(svc.name)}&price=${svc.price}`}>
                            <Button size="sm" className="shrink-0 h-8 text-xs">
                              Book
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Book CTA */}
          <Link href={`/spas/${spaId}/book`}>
            <Button className="w-full gap-2" size="lg">
              <CalendarCheck className="h-5 w-5" />
              {t("book_appointment")}
            </Button>
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
