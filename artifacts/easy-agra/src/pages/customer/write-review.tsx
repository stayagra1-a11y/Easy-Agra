import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import {
  useGetEligibleBookings,
  useCreateReview,
  useUpdateReview,
  useListReviews,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Camera, X, ChevronLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const CATEGORIES = [
  { key: "overallRating", label: "Overall Experience" },
  { key: "cleanlinessRating", label: "Cleanliness" },
  { key: "roomQualityRating", label: "Room Quality" },
  { key: "staffRating", label: "Staff Behaviour" },
  { key: "locationRating", label: "Location" },
  { key: "valueRating", label: "Value for Money" },
] as const;

function StarRating({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            style={{ width: size, height: size }}
            className={
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30 fill-muted-foreground/10"
            }
          />
        </button>
      ))}
    </div>
  );
}

function MiniStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30 fill-muted-foreground/10"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function WriteReview() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId ?? "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const eligibleQuery = useGetEligibleBookings();
  const existingQuery = useListReviews({ page: 1, limit: 50 });

  const createMut = useCreateReview();
  const updateMut = useUpdateReview();

  const eligible = (eligibleQuery.data ?? []).find((b) => b.bookingId === bookingId);
  const existingReview = (existingQuery.data?.reviews ?? []).find((r) => r.bookingId === bookingId);
  const isEdit = !!existingReview;

  const [ratings, setRatings] = useState<Record<string, number>>(() => ({
    overallRating: existingReview?.overallRating ?? 0,
    cleanlinessRating: existingReview?.cleanlinessRating ?? 0,
    roomQualityRating: existingReview?.roomQualityRating ?? 0,
    staffRating: existingReview?.staffRating ?? 0,
    locationRating: existingReview?.locationRating ?? 0,
    valueRating: existingReview?.valueRating ?? 0,
  }));
  const [reviewTitle, setReviewTitle] = useState(existingReview?.reviewTitle ?? "");
  const [reviewDescription, setReviewDescription] = useState(existingReview?.reviewDescription ?? "");
  const [photos, setPhotos] = useState<string[]>(existingReview?.reviewPhotos ?? []);

  const overallRating = ratings.overallRating ?? 0;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > 5) {
      toast({ title: "Max 5 photos", description: "You can upload up to 5 photos", variant: "destructive" });
      return;
    }
    e.target.value = "";
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo", variant: "destructive" });
    }
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function isValid() {
    return (
      Object.values(ratings).every((v) => v > 0) &&
      reviewTitle.trim().length >= 5 &&
      reviewDescription.trim().length >= 20
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;

    const payload = {
      bookingId,
      overallRating: ratings.overallRating,
      cleanlinessRating: ratings.cleanlinessRating,
      roomQualityRating: ratings.roomQualityRating,
      staffRating: ratings.staffRating,
      locationRating: ratings.locationRating,
      valueRating: ratings.valueRating,
      reviewTitle: reviewTitle.trim(),
      reviewDescription: reviewDescription.trim(),
      reviewPhotos: photos,
    };

    if (isEdit && existingReview) {
      updateMut.mutate(
        { id: existingReview.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["listReviews"] });
            setSubmitted(true);
          },
          onError: (e: any) =>
            toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
        },
      );
    } else {
      createMut.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["listReviews"] });
            queryClient.invalidateQueries({ queryKey: ["getEligibleBookings"] });
            setSubmitted(true);
          },
          onError: (e: any) =>
            toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
        },
      );
    }
  }

  if (eligibleQuery.isLoading || existingQuery.isLoading) {
    return (
      <CustomerLayout>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!eligible) {
    return (
      <CustomerLayout>
        <div className="p-4 max-w-lg mx-auto text-center py-20">
          <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="text-lg font-bold mb-2">Not Eligible</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You can only review hotels after completing your stay (checked-out).
          </p>
          <Button onClick={() => navigate("/customer/bookings")} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-1" /> My Bookings
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  if (submitted) {
    return (
      <CustomerLayout>
        <div className="p-4 max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Review {isEdit ? "Updated" : "Submitted"}!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Thank you for sharing your experience at <strong>{eligible.hotelName}</strong>.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/customer/reviews")} className="bg-primary">
              View My Reviews
            </Button>
            <Button onClick={() => navigate("/customer/bookings")} variant="outline">
              My Bookings
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/customer/bookings")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isEdit ? "Edit Review" : "Write a Review"}
            </h1>
            <p className="text-xs text-muted-foreground">{eligible.hotelName}</p>
          </div>
        </div>

        {/* Eligibility info */}
        {isEdit && existingReview?.editableUntil && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            ✏️ You can edit this review until{" "}
            {new Date(existingReview.editableUntil).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Rating */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overall Rating *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <StarRating
                value={overallRating}
                onChange={(v) => setRatings((r) => ({ ...r, overallRating: v }))}
              />
              {overallRating > 0 && (
                <div className="text-sm font-semibold text-amber-600">
                  {overallRating} / 5 — {RATING_LABELS[overallRating]}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Ratings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rate Your Experience *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.filter((c) => c.key !== "overallRating").map((cat) => (
                <div key={cat.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground flex-1">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <MiniStarRating
                      value={ratings[cat.key] ?? 0}
                      onChange={(v) => setRatings((r) => ({ ...r, [cat.key]: v }))}
                    />
                    {ratings[cat.key] > 0 && (
                      <span className="text-xs text-muted-foreground w-16">
                        {RATING_LABELS[ratings[cat.key]]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Review Text */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your Review *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Review Title *</label>
                <Input
                  placeholder="Summarize your stay in one line…"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={100}
                />
                <div className="text-xs text-muted-foreground/60 text-right mt-1">{reviewTitle.length}/100</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Detailed Review *</label>
                <Textarea
                  placeholder="Tell others about your experience — cleanliness, staff, location, food, value…"
                  value={reviewDescription}
                  onChange={(e) => setReviewDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                />
                <div className="text-xs text-muted-foreground/60 text-right mt-1">
                  {reviewDescription.length}/2000 (min 20 chars)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Upload Photos ({photos.length}/5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground/60 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Add Photo</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Share up to 5 photos of your stay</p>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold"
            disabled={!isValid() || isPending}
          >
            {isPending ? "Submitting…" : isEdit ? "Update Review" : "Submit Review"}
          </Button>
        </form>
      </div>
    </CustomerLayout>
  );
}
