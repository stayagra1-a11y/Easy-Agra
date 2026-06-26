import { useState } from "react";
import { Link } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { useListReviews, useDeleteReview, useReportReview } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-request";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, Pencil, Trash2, MessageSquare, Flag, Hotel, Utensils, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 fill-muted-foreground/10"}`}
        />
      ))}
    </span>
  );
}

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

type TabType = "hotel" | "restaurant" | "spa";

export default function MyReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("hotel");
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; type: TabType } | null>(null);
  const [reportDialog, setReportDialog] = useState<{ id: number; type: TabType } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [hotelPage, setHotelPage] = useState(1);
  const [restPage, setRestPage] = useState(1);
  const [spaPage, setSpaPage] = useState(1);

  const hotelQuery = useListReviews({ page: hotelPage, limit: 10 });
  const deleteMut = useDeleteReview();
  const reportMut = useReportReview();

  const restaurantQuery = useQuery({
    queryKey: ["myRestaurantReviews", restPage],
    queryFn: () => apiRequest(`/api/restaurant-reviews/customer?page=${restPage}&limit=10`) as Promise<{ reviews: any[]; total: number }>,
  });

  const spaQuery = useQuery({
    queryKey: ["mySpaReviews", spaPage],
    queryFn: () => apiRequest(`/api/spa-reviews/customer?page=${spaPage}&limit=10`) as Promise<{ reviews: any[]; total: number }>,
  });

  const hotelReviews = hotelQuery.data?.reviews ?? [];
  const hotelTotal = hotelQuery.data?.total ?? 0;
  const hotelTotalPages = Math.ceil(hotelTotal / 10);

  const restReviews = restaurantQuery.data?.reviews ?? [];
  const restTotal = restaurantQuery.data?.total ?? 0;
  const restTotalPages = Math.ceil(restTotal / 10);

  const spaReviews = spaQuery.data?.reviews ?? [];
  const spaTotal = spaQuery.data?.total ?? 0;
  const spaTotalPages = Math.ceil(spaTotal / 10);

  function isEditable(review: any): boolean {
    if (!review.editableUntil) return false;
    return new Date() < new Date(review.editableUntil);
  }

  function handleDelete() {
    if (!deleteDialog) return;
    if (deleteDialog.type === "hotel") {
      deleteMut.mutate(
        { id: deleteDialog.id },
        {
          onSuccess: () => {
            toast({ title: "Review deleted" });
            setDeleteDialog(null);
            queryClient.invalidateQueries({ queryKey: ["listReviews"] });
          },
          onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
        },
      );
    } else {
      const url = deleteDialog.type === "restaurant"
        ? `/api/restaurant-reviews/${deleteDialog.id}`
        : `/api/spa-reviews/${deleteDialog.id}`;
      apiRequest(url, { method: "DELETE" })
        .then(() => {
          toast({ title: "Review deleted" });
          setDeleteDialog(null);
          if (deleteDialog.type === "restaurant") queryClient.invalidateQueries({ queryKey: ["myRestaurantReviews"] });
          else queryClient.invalidateQueries({ queryKey: ["mySpaReviews"] });
        })
        .catch((e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }));
    }
  }

  function handleReport() {
    if (!reportDialog || !reportReason.trim()) return;
    if (reportDialog.type === "hotel") {
      reportMut.mutate(
        { id: reportDialog.id, data: { reason: reportReason.trim() } },
        {
          onSuccess: () => {
            toast({ title: "Reported" });
            setReportDialog(null);
            setReportReason("");
          },
          onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
        },
      );
    } else {
      setReportDialog(null);
      setReportReason("");
      toast({ title: "Reported", description: "Review reported to admin." });
    }
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "hotel", label: "Hotel", icon: <Hotel className="w-3.5 h-3.5" />, count: hotelTotal },
    { key: "restaurant", label: "Restaurant", icon: <Utensils className="w-3.5 h-3.5" />, count: restTotal },
    { key: "spa", label: "Spa", icon: <Sparkles className="w-3.5 h-3.5" />, count: spaTotal },
  ];

  function ReviewCard({ review, type }: { review: any; type: TabType }) {
    const entityName = type === "hotel" ? review.hotelName : type === "restaurant" ? review.restaurantName : review.spaName;
    const subRatings: [string, number][] =
      type === "hotel"
        ? [["Cleanliness", review.cleanlinessRating], ["Room", review.roomQualityRating], ["Staff", review.staffRating], ["Location", review.locationRating], ["Value", review.valueRating]]
        : type === "restaurant"
        ? [["Food", review.foodQualityRating], ["Service", review.serviceRating], ["Ambience", review.ambienceRating], ["Cleanliness", review.cleanlinessRating], ["Value", review.valueRating]]
        : [["Service", review.serviceQualityRating], ["Ambience", review.ambienceRating], ["Cleanliness", review.cleanlinessRating], ["Value", review.valueRating], ["Therapist", review.therapistSkillRating]];

    return (
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{entityName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <StarDisplay rating={review.overallRating} />
                <span className="text-xs text-muted-foreground">{RATING_LABELS[review.overallRating]}</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs flex-shrink-0 ${
                review.status === "approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : review.status === "hidden"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {review.status}
            </Badge>
          </div>

          <div className="mb-2">
            {review.reviewTitle && <div className="text-xs font-medium text-foreground mb-0.5">{review.reviewTitle}</div>}
            <p className="text-xs text-muted-foreground line-clamp-3">{review.reviewDescription}</p>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-3 text-xs">
            {subRatings.map(([label, val]) => (
              <div key={label} className="flex items-center gap-1">
                <span className="text-muted-foreground">{label}:</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-medium">{val ?? "-"}</span>
              </div>
            ))}
          </div>

          {review.reviewPhotos?.length > 0 && (
            <div className="flex gap-1.5 mb-3">
              {review.reviewPhotos.slice(0, 4).map((photo: string, i: number) => (
                <img key={i} src={photo} alt="" className="w-14 h-14 rounded-lg object-cover border" />
              ))}
              {review.reviewPhotos.length > 4 && (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                  +{review.reviewPhotos.length - 4}
                </div>
              )}
            </div>
          )}

          {review.ownerReplyMessage && (
            <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-primary">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold text-primary">Owner's Reply</span>
              </div>
              {review.ownerReplyTitle && <div className="text-xs font-medium text-foreground mb-0.5">{review.ownerReplyTitle}</div>}
              <p className="text-xs text-muted-foreground">{review.ownerReplyMessage}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {isEditable(review) && type === "hotel" && (
              <Link href={`/customer/write-review/${review.bookingId}`}>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </Link>
            )}
            {isEditable(review) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteDialog({ id: review.id, type })}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setReportDialog({ id: review.id, type })}
            >
              <Flag className="w-3 h-3 mr-1" />
              Report
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground/60 mt-2">
            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading =
    activeTab === "hotel" ? hotelQuery.isLoading
    : activeTab === "restaurant" ? restaurantQuery.isLoading
    : spaQuery.isLoading;

  const activeReviews =
    activeTab === "hotel" ? hotelReviews
    : activeTab === "restaurant" ? restReviews
    : spaReviews;

  const totalPages =
    activeTab === "hotel" ? hotelTotalPages
    : activeTab === "restaurant" ? restTotalPages
    : spaTotalPages;

  const currentPage =
    activeTab === "hotel" ? hotelPage
    : activeTab === "restaurant" ? restPage
    : spaPage;

  function setCurrentPage(p: number) {
    if (activeTab === "hotel") setHotelPage(p);
    else if (activeTab === "restaurant") setRestPage(p);
    else setSpaPage(p);
  }

  const emptyLinks: Record<TabType, { href: string; label: string }> = {
    hotel: { href: "/customer/bookings", label: "View My Bookings" },
    restaurant: { href: "/restaurants", label: "Browse Restaurants" },
    spa: { href: "/spas", label: "Browse Spas" },
  };

  const emptyMessages: Record<TabType, string> = {
    hotel: "Complete a hotel stay to write your first review.",
    restaurant: "Visit a restaurant and share your dining experience.",
    spa: "Book a spa appointment and share your experience.",
  };

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Reviews</h1>
          <p className="text-sm text-muted-foreground">Your ratings and feedback</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted/40 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : activeReviews.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">No {activeTab} reviews yet</h3>
              <p className="text-sm text-muted-foreground mb-4">{emptyMessages[activeTab]}</p>
              <Link href={emptyLinks[activeTab].href}>
                <Button size="sm" variant="outline">{emptyLinks[activeTab].label}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeReviews.map((r) => (
              <ReviewCard key={r.id} review={r} type={activeTab} />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">{currentPage}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog !== null} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. Your review will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog !== null} onOpenChange={() => { setReportDialog(null); setReportReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a reason for reporting this review:</p>
            <div className="grid grid-cols-1 gap-2">
              {["Spam", "Fake Review", "Offensive Content", "Abuse", "Misleading Information"].map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    reportReason === r ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportDialog(null); setReportReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={!reportReason || reportMut.isPending}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
