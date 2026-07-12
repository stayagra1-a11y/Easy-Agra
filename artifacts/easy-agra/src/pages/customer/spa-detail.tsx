import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetSpaById, useGetSpaServices } from "@workspace/api-client-react";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import { imgUrl } from "@/lib/cloudinary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2, MapPin, Clock, Phone, Globe, Star, Sparkles,
  BadgeIndianRupee, ArrowLeft, CalendarCheck, CheckCircle2,
  X, Camera, Pencil, MessageSquare,
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

const RATING_LABELS: Record<number, string> = {
  1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent",
};

const SPA_CATEGORIES = [
  { key: "overallRating", label: "Overall" },
  { key: "serviceQualityRating", label: "Service Quality" },
  { key: "ambienceRating", label: "Ambience" },
  { key: "cleanlinessRating", label: "Cleanliness" },
  { key: "valueRating", label: "Value for Money" },
  { key: "therapistSkillRating", label: "Therapist Skill" },
] as const;

function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 fill-muted-foreground/10"}
        />
      ))}
    </span>
  );
}

function StarRating({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
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
            className={s <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 fill-muted-foreground/10"}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-muted-foreground">{value}</span>
    </div>
  );
}

interface SpaReviewSummary {
  avgOverall: number;
  avgService: number;
  avgAmbience: number;
  avgCleanliness: number;
  avgValue: number;
  avgTherapist: number;
  total: number;
  distribution: Record<number, number>;
}

interface SpaReview {
  id: number;
  overallRating: number;
  serviceQualityRating: number;
  ambienceRating: number;
  cleanlinessRating: number;
  valueRating: number;
  therapistSkillRating: number;
  reviewTitle: string;
  reviewDescription: string;
  reviewPhotos: string[];
  ownerReplyTitle: string | null;
  ownerReplyMessage: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  customerName: string;
  customerPhoto: string | null;
  customerId: number;
}

function SpaReviewSection({ spaId, user }: { spaId: number; user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [writeOpen, setWriteOpen] = useState(false);
  const [editReview, setEditReview] = useState<SpaReview | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({
    overallRating: 0, serviceQualityRating: 0, ambienceRating: 0, cleanlinessRating: 0, valueRating: 0, therapistSkillRating: 0,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ reviews: SpaReview[]; total: number; summary: SpaReviewSummary }>({
    queryKey: ["spa-reviews", spaId, sort, ratingFilter],
    queryFn: () => apiRequest(`/api/spa-reviews/${spaId}?sort=${sort}&rating=${ratingFilter !== "all" ? ratingFilter : ""}&limit=10`),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest(`/api/spa-reviews/${spaId}`, { method: "POST", body }),
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for sharing your experience." });
      queryClient.invalidateQueries({ queryKey: ["spa-reviews", spaId] });
      setWriteOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiRequest(`/api/spa-reviews/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      toast({ title: "Review updated!" });
      queryClient.invalidateQueries({ queryKey: ["spa-reviews", spaId] });
      setWriteOpen(false);
      setEditReview(null);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  const resetForm = () => {
    setRatings({ overallRating: 0, serviceQualityRating: 0, ambienceRating: 0, cleanlinessRating: 0, valueRating: 0, therapistSkillRating: 0 });
    setTitle("");
    setDescription("");
    setPhotos([]);
  };

  const openWrite = () => {
    setEditReview(null);
    resetForm();
    setWriteOpen(true);
  };

  const openEdit = (rev: SpaReview) => {
    setEditReview(rev);
    setRatings({
      overallRating: rev.overallRating,
      serviceQualityRating: rev.serviceQualityRating,
      ambienceRating: rev.ambienceRating,
      cleanlinessRating: rev.cleanlinessRating,
      valueRating: rev.valueRating,
      therapistSkillRating: rev.therapistSkillRating,
    });
    setTitle(rev.reviewTitle);
    setDescription(rev.reviewDescription);
    setPhotos(rev.reviewPhotos ?? []);
    setWriteOpen(true);
  };

  const handleSubmit = () => {
    if (!ratings.overallRating || !title.trim() || !description.trim()) {
      toast({ title: "Required fields missing", description: "Please add ratings, title and description", variant: "destructive" });
      return;
    }
    const body = { ...ratings, reviewTitle: title.trim(), reviewDescription: description.trim(), reviewPhotos: photos };
    if (editReview) {
      updateMut.mutate({ id: editReview.id, body });
    } else {
      createMut.mutate(body);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "easyagra");
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/dq6pfttzl/image/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.secure_url) setPhotos((p) => [...p, data.secure_url]);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo", variant: "destructive" });
    }
  };

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Reviews & Ratings
        </h2>
        {user?.role === "customer" && (
          <Button size="sm" variant="outline" onClick={openWrite}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Write Review
          </Button>
        )}
      </div>

      {summary && summary.total > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-4">
              <div className="text-center shrink-0">
                <div className="text-3xl font-bold text-amber-500">{summary.avgOverall.toFixed(1)}</div>
                <StarDisplay rating={Math.round(summary.avgOverall)} />
                <div className="text-xs text-muted-foreground mt-1">{summary.total} reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                <RatingBar label="5 Star" value={summary.distribution[5] ?? 0} total={summary.total} />
                <RatingBar label="4 Star" value={summary.distribution[4] ?? 0} total={summary.total} />
                <RatingBar label="3 Star" value={summary.distribution[3] ?? 0} total={summary.total} />
                <RatingBar label="2 Star" value={summary.distribution[2] ?? 0} total={summary.total} />
                <RatingBar label="1 Star" value={summary.distribution[1] ?? 0} total={summary.total} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-amber-600">{summary.avgService.toFixed(1)}</div>
                <div className="text-muted-foreground">Service</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-amber-600">{summary.avgAmbience.toFixed(1)}</div>
                <div className="text-muted-foreground">Ambience</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-amber-600">{summary.avgCleanliness.toFixed(1)}</div>
                <div className="text-muted-foreground">Cleanliness</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-amber-600">{summary.avgValue.toFixed(1)}</div>
                <div className="text-muted-foreground">Value</div>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="font-semibold text-amber-600">{summary.avgTherapist.toFixed(1)}</div>
                <div className="text-muted-foreground">Therapist</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["newest", "highest", "lowest", "oldest"].map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${sort === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        {["all", "5", "4", "3", "2", "1"].map((r) => (
          <button
            key={r}
            onClick={() => setRatingFilter(r)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${ratingFilter === r ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-muted text-muted-foreground"}`}
          >
            {r === "all" ? "All" : `${r} ★`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No reviews yet. Be the first to review!
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <SpaReviewCard key={rev.id} review={rev} onEdit={openEdit} user={user} />
          ))}
        </div>
      )}

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editReview ? "Edit Review" : "Write a Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm font-medium mb-2">Overall Rating *</div>
                <StarRating value={ratings.overallRating} onChange={(v) => setRatings((r) => ({ ...r, overallRating: v }))} />
                {ratings.overallRating > 0 && (
                  <div className="text-sm font-semibold text-amber-600 mt-1">
                    {ratings.overallRating} / 5 — {RATING_LABELS[ratings.overallRating]}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SPA_CATEGORIES.filter((c) => c.key !== "overallRating").map((cat) => (
                  <div key={cat.key} className="text-center">
                    <div className="text-xs font-medium mb-1">{cat.label}</div>
                    <StarRating value={ratings[cat.key] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [cat.key]: v }))} size={24} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your experience" />
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Share details about service, ambience, therapist..." rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium">Photos</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={imgUrl(p, 200)} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:bg-muted">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Submitting..." : editReview ? "Update Review" : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpaReviewCard({ review, onEdit, user }: { review: SpaReview; onEdit: (r: SpaReview) => void; user: any }) {
  const [showAll, setShowAll] = useState(false);
  const isOwn = user?.id === review.customerId;
  const hasReply = review.ownerReplyMessage;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {review.customerPhoto ? (
              <img src={imgUrl(review.customerPhoto, 100)} alt="" className="w-8 h-8 rounded-full object-cover border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {review.customerName?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{review.customerName}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 shrink-0">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-sm">{review.overallRating}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <StarDisplay rating={review.overallRating} size={14} />
        </div>
        <div className="font-semibold text-sm">{review.reviewTitle}</div>
        <p className={`text-sm text-muted-foreground ${!showAll ? "line-clamp-3" : ""}`}>{review.reviewDescription}</p>
        {review.reviewDescription.length > 120 && (
          <button onClick={() => setShowAll((s) => !s)} className="text-xs text-primary font-medium">
            {showAll ? "Show less" : "Read more"}
          </button>
        )}
        {review.reviewPhotos?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {review.reviewPhotos.map((p, i) => (
              <img key={i} src={imgUrl(p, 300)} alt="" className="w-20 h-20 rounded-lg object-cover border flex-shrink-0" />
            ))}
          </div>
        )}
        {hasReply && (
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MessageSquare className="h-4 w-4" />
              Owner Reply
              <span className="text-xs text-muted-foreground font-normal">
                {review.ownerRepliedAt ? new Date(review.ownerRepliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}
              </span>
            </div>
            {review.ownerReplyTitle && <div className="text-sm font-medium">{review.ownerReplyTitle}</div>}
            <p className="text-sm text-muted-foreground">{review.ownerReplyMessage}</p>
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          {isOwn && (
            <button onClick={() => onEdit(review)} className="text-xs text-primary font-medium flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SpaDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const spaId = parseInt(id, 10);
  const { user } = useAuth();

  const { data: spa, isLoading: spaLoading } = useGetSpaById(spaId);
  const { data: services = [], isLoading: svcLoading } = useGetSpaServices(spaId);

  const isLoading = spaLoading || svcLoading;
  const spaAny = spa as any;
  const rating = parseFloat(String(spaAny?.rating ?? "0"));
  const availableServices = services.filter((s) => s.isAvailable);

  if (isLoading) {
    return (
      <CustomerLayout backHref="/spas" backLabel="Back">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!spa) {
    return (
      <CustomerLayout backHref="/spas" backLabel="Back">
        <div className="px-4 py-8 text-center space-y-3">
          <p className="font-medium">Spa not found</p>
          <Link href="/spas">
            <Button variant="outline">Back to Spas</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout backHref="/spas" backLabel="Back">
      <div className="pb-4">
        {/* Cover image */}
        <div className="relative">
          {spa.coverPhoto ? (
            <div className="h-52 overflow-hidden">
              <img src={imgUrl(spa.coverPhoto, 1000)} alt={spa.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10" />
          )}
          <div className="absolute top-3 left-3">
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white" onClick={() => navigate("/spas")}>
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
          <MapEmbed name={spa.name} address={spa.address} city={spa.city} googleMapLink={spa.googleMapLink} />

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

          {/* Reviews */}
          <SpaReviewSection spaId={spaId} user={user} />

          {/* Services */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Services</h2>
              <span className="text-xs text-muted-foreground">{availableServices.length} available</span>
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
                          <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[svc.category] ?? svc.category}</p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{svc.description}</p>
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
                            <Button size="sm" className="shrink-0 h-8 text-xs">Book</Button>
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
