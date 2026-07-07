import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { MapEmbed } from "@/components/map-embed";
import { imgUrl } from "@/lib/cloudinary";
import { useGetRestaurant, useGetRestaurantMenu } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  MapPin,
  Clock,
  Phone,
  Mail,
  Users,
  ChevronLeft,
  Leaf,
  Drumstick,
  Star,
  CalendarCheck,
  Share2,
  X,
  Camera,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "starters", label: "Starters" },
  { value: "main_course", label: "Main Course" },
  { value: "fast_food", label: "Fast Food" },
  { value: "desserts", label: "Desserts" },
  { value: "beverages", label: "Beverages" },
];

const CATEGORY_COLORS: Record<string, string> = {
  starters: "bg-orange-100 text-orange-700",
  main_course: "bg-teal-100 text-teal-700",
  fast_food: "bg-red-100 text-red-700",
  desserts: "bg-pink-100 text-pink-700",
  beverages: "bg-blue-100 text-blue-700",
};

const RATING_LABELS: Record<number, string> = {
  1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent",
};

const RESTAURANT_CATEGORIES = [
  { key: "overallRating", label: "Overall" },
  { key: "foodQualityRating", label: "Food Quality" },
  { key: "serviceRating", label: "Service" },
  { key: "ambienceRating", label: "Ambience" },
  { key: "cleanlinessRating", label: "Cleanliness" },
  { key: "valueRating", label: "Value for Money" },
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

interface ReviewSummary {
  avgOverall: number;
  avgFood: number;
  avgService: number;
  avgAmbience: number;
  avgCleanliness: number;
  avgValue: number;
  total: number;
  distribution: Record<number, number>;
}

interface Review {
  id: number;
  overallRating: number;
  foodQualityRating: number;
  serviceRating: number;
  ambienceRating: number;
  cleanlinessRating: number;
  valueRating: number;
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

function ReviewSection({ restaurantId, user }: { restaurantId: number; user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [writeOpen, setWriteOpen] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({ overallRating: 0, foodQualityRating: 0, serviceRating: 0, ambienceRating: 0, cleanlinessRating: 0, valueRating: 0 });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const { data, isLoading } = useQuery<{ reviews: Review[]; total: number; summary: ReviewSummary }>({
    queryKey: ["restaurant-reviews", restaurantId, sort, ratingFilter],
    queryFn: () => apiRequest(`/api/restaurant-reviews/${restaurantId}?sort=${sort}&rating=${ratingFilter !== "all" ? ratingFilter : ""}&limit=10`),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest(`/api/restaurant-reviews/${restaurantId}`, { method: "POST", body }),
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for sharing your experience." });
      queryClient.invalidateQueries({ queryKey: ["restaurant-reviews", restaurantId] });
      setWriteOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiRequest(`/api/restaurant-reviews/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      toast({ title: "Review updated!" });
      queryClient.invalidateQueries({ queryKey: ["restaurant-reviews", restaurantId] });
      setWriteOpen(false);
      setEditReview(null);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  const resetForm = () => {
    setRatings({ overallRating: 0, foodQualityRating: 0, serviceRating: 0, ambienceRating: 0, cleanlinessRating: 0, valueRating: 0 });
    setTitle("");
    setDescription("");
    setPhotos([]);
  };

  const openWrite = () => {
    setEditReview(null);
    resetForm();
    setWriteOpen(true);
  };

  const openEdit = (rev: Review) => {
    setEditReview(rev);
    setRatings({
      overallRating: rev.overallRating,
      foodQualityRating: rev.foodQualityRating,
      serviceRating: rev.serviceRating,
      ambienceRating: rev.ambienceRating,
      cleanlinessRating: rev.cleanlinessRating,
      valueRating: rev.valueRating,
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
      {/* Header + Write button */}
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

      {/* Summary */}
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
                <div className="font-semibold text-amber-600">{summary.avgFood.toFixed(1)}</div>
                <div className="text-muted-foreground">Food</div>
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
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

      {/* Reviews list */}
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
            <ReviewCard key={rev.id} review={rev} onEdit={openEdit} user={user} />
          ))}
        </div>
      )}

      {/* Write/Edit Dialog */}
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
                {RESTAURANT_CATEGORIES.filter((c) => c.key !== "overallRating").map((cat) => (
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
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Share details about food, service, ambience..." rows={4} />
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

function ReviewCard({ review, onEdit, user }: { review: Review; onEdit: (r: Review) => void; user: any }) {
  const [showReply, setShowReply] = useState(false);
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

export default function RestaurantDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const restaurantQuery = useGetRestaurant(id);
  const menuQuery = useGetRestaurantMenu(id);

  const r = restaurantQuery.data;
  const allMenuItems = menuQuery.data ?? [];
  const filtered = activeCategory === "all"
    ? allMenuItems
    : allMenuItems.filter((i) => i.category === activeCategory);

  const vegItems = allMenuItems.filter((i) => i.isVeg).length;
  const nonVegItems = allMenuItems.filter((i) => !i.isVeg).length;

  if (restaurantQuery.isLoading) {
    return (
      <CustomerLayout>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!r) {
    return (
      <CustomerLayout>
        <div className="p-4 text-center py-16">
          <p className="text-muted-foreground">Restaurant not found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/restaurants")}>
            Back to Restaurants
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const gallery = Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [];

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-28">
        {/* Back + Share */}
        <div className="p-4 pb-0 flex items-center justify-between">
          <button onClick={() => navigate("/restaurants")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back to Restaurants
          </button>
          <button
            onClick={() => {
              const text = encodeURIComponent(`Yeh restaurant dekho: ${r.name} — ${window.location.href}`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] border border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/15 rounded-full px-3 py-1.5 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            WhatsApp pe share karo
          </button>
        </div>

        {/* Cover */}
        {r.coverPhoto ? (
          <div className="h-56 overflow-hidden cursor-zoom-in" onClick={() => setLightboxImg(imgUrl(r.coverPhoto!, 1400))}>
            <img src={imgUrl(r.coverPhoto, 1000)} alt={r.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Restaurant info */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-foreground">{r.name}</h1>
              <Badge variant="outline" className={`text-xs ${r.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600"}`}>
                {r.status}
              </Badge>
            </div>
            {r.cuisineType && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {r.cuisineType.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                  <Badge key={c} variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {r.description && (
            <p className="text-sm text-muted-foreground">{r.description}</p>
          )}

          {/* Details card */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              {(r.address || r.city) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">
                    {[r.address, r.city, r.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {r.openingTime && r.closingTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/80">{r.openingTime} – {r.closingTime}</span>
                </div>
              )}
              {r.contactNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${r.contactNumber}`} className="text-primary">{r.contactNumber}</a>
                </div>
              )}
              {r.contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${r.contactEmail}`} className="text-primary">{r.contactEmail}</a>
                </div>
              )}
              {r.seatingCapacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/80">{r.seatingCapacity} seating capacity</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map */}
          <MapEmbed
            name={r.name}
            address={r.address}
            city={r.city}
            googleMapLink={r.googleMapLink}
          />

          {/* Gallery */}
          {gallery.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Gallery</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden border cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => setLightboxImg(imgUrl(p, 1400))}
                  >
                    <img src={imgUrl(p, 400)} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightboxImg && (
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90"
              onClick={() => setLightboxImg(null)}
            >
              <button
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                onClick={() => setLightboxImg(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={lightboxImg}
                alt="Full view"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Reviews */}
          <ReviewSection restaurantId={id} user={user} />

          {/* Menu */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Menu</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {vegItems > 0 && <span className="flex items-center gap-0.5 text-green-700"><Leaf className="w-3 h-3" />{vegItems} veg</span>}
                {nonVegItems > 0 && <span className="flex items-center gap-0.5 text-red-700"><Drumstick className="w-3 h-3" />{nonVegItems} non-veg</span>}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {CATEGORIES.map((c) => {
                const count = c.value === "all" ? allMenuItems.length : allMenuItems.filter((i) => i.category === c.value).length;
                if (c.value !== "all" && count === 0) return null;
                return (
                  <button
                    key={c.value}
                    onClick={() => setActiveCategory(c.value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === c.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {c.label} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {menuQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No items in this category</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <Card key={item.id} className={`border-0 shadow-sm overflow-hidden ${!item.isAvailable ? "opacity-60" : ""}`}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.itemPhoto ? (
                          <img src={imgUrl(item.itemPhoto, 200)} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            {item.isVeg ? <Leaf className="w-6 h-6 text-green-600" /> : <Drumstick className="w-6 h-6 text-red-600" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm">{item.name}</span>
                                {item.isVeg
                                  ? <span className="w-3 h-3 border border-green-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-600"></span></span>
                                  : <span className="w-3 h-3 border border-red-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span></span>
                                }
                                {!item.isAvailable && <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1">Unavailable</span>}
                              </div>
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] ?? "bg-muted text-muted-foreground"}`}>
                                {CATEGORIES.find((c) => c.value === item.category)?.label}
                              </span>
                            </div>
                            <div className="font-bold text-primary flex-shrink-0">₹{typeof item.price === "number" ? item.price.toFixed(2) : item.price}</div>
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reserve CTA + WhatsApp share */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t max-w-lg mx-auto">
          <div className="flex gap-3 items-center">
            {r.status === "active" && user?.role === "customer" && (
              <Link href={`/reservations/new?restaurantId=${r.id}`} className="flex-1">
                <Button className="w-full h-12 bg-primary text-base font-semibold">
                  <CalendarCheck className="w-5 h-5 mr-2" />
                  {t("reserve_table")}
                </Button>
              </Link>
            )}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Yeh restaurant dekho: ${r.name} — ${window.location.origin}/restaurants/${id}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-full border-2 border-[#25D366] text-[#25D366] bg-white text-sm font-semibold hover:bg-[#25D366]/5 transition-colors whitespace-nowrap shrink-0"
            >
              <svg className="h-4 w-4 fill-[#25D366] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp pe share karo
            </a>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
