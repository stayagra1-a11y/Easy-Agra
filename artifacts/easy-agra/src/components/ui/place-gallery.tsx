import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "./button";
import { imgUrl } from "@/lib/cloudinary";

export type GalleryImage = {
  id: number;
  imageUrl: string;
  caption?: string | null;
  altText?: string | null;
};

type LightboxProps = {
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
};

function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const prev = useCallback(() => {
    setZoomed(false);
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setZoomed(false);
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [prev, next, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const img = images[current];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/70 text-sm font-medium">
          {current + 1} / {images.length}
        </span>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoomed((z) => !z)}
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main image area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 overflow-hidden">
        {/* Prev button */}
        {images.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <div
          className={`w-full h-full flex items-center justify-center transition-transform duration-300 ${
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setZoomed((z) => !z)}
        >
          <img
            key={img.id}
            src={imgUrl(img.imageUrl, 1200)}
            alt={img.altText ?? img.caption ?? "Gallery image"}
            className={`max-w-full max-h-full object-contain transition-transform duration-300 select-none ${
              zoomed ? "scale-[2]" : "scale-100"
            }`}
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0.3";
            }}
          />
        </div>

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Caption */}
      {img.caption && (
        <div className="px-4 py-2 text-center text-white/70 text-sm shrink-0">
          {img.caption}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto">
          {images.map((thumb, idx) => (
            <button
              key={thumb.id}
              onClick={() => { setZoomed(false); setCurrent(idx); }}
              className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                idx === current
                  ? "border-white scale-105"
                  : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <img
                src={imgUrl(thumb.imageUrl, 120)}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PlaceGallery — the main exported component ──────────────────────────

type PlaceGalleryProps = {
  images: GalleryImage[];
  placeName?: string;
};

export function PlaceGallery({ images, placeName }: PlaceGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const sorted = [...images].sort((a, b) => {
    const ai = (a as any).sortOrder ?? 0;
    const bi = (b as any).sortOrder ?? 0;
    return ai - bi;
  });

  const cover = sorted[0];
  const rest = sorted.slice(1, 5);
  const remaining = sorted.length - 5;

  return (
    <>
      {/* Gallery grid */}
      <div className="relative">
        {sorted.length === 1 ? (
          <div
            className="h-72 sm:h-96 bg-muted cursor-pointer rounded-b-none"
            onClick={() => setLightboxIndex(0)}
          >
            <img
              src={imgUrl(cover.imageUrl, 1000)}
              alt={cover.caption ?? placeName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : sorted.length === 2 ? (
          <div className="grid grid-cols-2 gap-0.5 h-64">
            {sorted.slice(0, 2).map((img, idx) => (
              <div key={img.id} className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => setLightboxIndex(idx)}>
                <img src={imgUrl(img.imageUrl, 600)} alt={img.caption ?? ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 grid-rows-2 gap-0.5 h-72 sm:h-96">
            {/* Cover — spans 2×2 */}
            <div
              className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden bg-muted"
              onClick={() => setLightboxIndex(0)}
            >
              <img
                src={imgUrl(cover.imageUrl, 1000)}
                alt={cover.caption ?? placeName}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            {/* Up to 4 grid thumbnails */}
            {rest.map((img, idx) => (
              <div
                key={img.id}
                className="relative cursor-pointer overflow-hidden bg-muted"
                onClick={() => setLightboxIndex(idx + 1)}
              >
                <img
                  src={imgUrl(img.imageUrl, 400)}
                  alt={img.caption ?? ""}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {/* "+N more" overlay on last visible */}
                {idx === rest.length - 1 && remaining > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <span className="text-white font-bold text-xl">+{remaining + 1}</span>
                    <span className="text-white/80 text-xs mt-0.5">more photos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* View all button */}
        <button
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          View all {sorted.length} photos
        </button>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={sorted}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
