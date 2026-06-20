import { useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapEmbedProps {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  name?: string;
  city?: string | null;
  googleMapLink?: string | null;
}

function buildEmbedUrl(props: MapEmbedProps): string {
  const { lat, lng, address, name, city } = props;
  if (lat && lng) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }
  const query = [name, address, city, "Agra", "India"].filter(Boolean).join(", ");
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function buildDirectionsUrl(props: MapEmbedProps): string {
  const { lat, lng, address, name, city } = props;
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const dest = [name, address, city, "Agra"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

function buildMapsUrl(props: MapEmbedProps): string {
  if (props.googleMapLink) return props.googleMapLink;
  const { lat, lng, address, name, city } = props;
  if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const query = [name, address, city, "Agra"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function MapEmbed(props: MapEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const embedUrl = buildEmbedUrl(props);
  const directionsUrl = buildDirectionsUrl(props);
  const mapsUrl = buildMapsUrl(props);

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Location</span>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Maps
        </a>
      </div>

      {/* Map area */}
      {!revealed ? (
        <div
          className="relative h-48 bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:from-green-100 hover:to-emerald-200 transition-colors"
          onClick={() => setRevealed(true)}
        >
          <div className="h-14 w-14 rounded-full bg-white shadow-md flex items-center justify-center">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Tap to load map</p>
          <p className="text-xs text-muted-foreground">Opens Google Maps</p>
        </div>
      ) : (
        <div className="relative h-52">
          {!loaded && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground/40 animate-bounce" />
            </div>
          )}
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setLoaded(true)}
            title="Location Map"
          />
        </div>
      )}

      {/* Directions button */}
      <div className="px-4 py-3 bg-background border-t border-border">
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="w-full block">
          <Button className="w-full gap-2" size="sm" variant="outline">
            <Navigation className="h-4 w-4" />
            Get Directions
          </Button>
        </a>
      </div>
    </div>
  );
}
