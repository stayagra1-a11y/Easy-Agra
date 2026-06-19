import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CustomerLayout } from "@/components/layout/customer-layout";
import {
  useListReviews,
  useDeleteReview,
  useReportReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Pencil,
  Trash2,
  MessageSquare,
  Flag,
  ChevronRight,
  Hotel,
  Clock,
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

export default function MyReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [deleteDialog, setDeleteDialog] = useState<number | null>(null);
  const [reportDialog, setReportDialog] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [page, setPage] = useState(1);

  const listQuery = useListReviews({ page, limit: 10 });
  const deleteMut = useDeleteReview();
  const reportMut = useReportReview();

  const reviews = listQuery.data?.reviews ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["listReviews"] });
  }

  function handleDelete() {
    if (deleteDialog === null) return;
    deleteMut.mutate(
      { id: deleteDialog },
      {
        onSuccess: () => {
          toast({ title: "Review deleted" });
          setDeleteDialog(null);
          invalidate();
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
      },
    );
  }

  function handleReport() {
    if (reportDialog === null || !reportReason.trim()) return;
    reportMut.mutate(
      { id: reportDialog, data: { reason: reportReason.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Reported", description: "Review has been reported to admin." });
          setReportDialog(null);
          setReportReason("");
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
      },
    );
  }

  function isEditable(review: any): boolean {
    if (!review.editableUntil) return false;
    return new Date() < new Date(review.editableUntil);
  }

  function daysLeft(review: any): number {
    if (!review.editableUntil) return 0;
    const diff = new Date(review.editableUntil).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <CustomerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">My Reviews</h1>
            <p className="text-sm text-muted-foreground">Your hotel reviews and ratings</p>
          </div>
          <Link href="/customer/bookings">
            <Button variant="outline" size="sm">
              <Hotel className="w-4 h-4 mr-1" />
              My Bookings
            </Button>
          </Link>
        </div>

        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">No reviews yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete a hotel stay to write your first review.
              </p>
              <Link href="/customer/bookings">
                <Button size="sm" variant="outline">View My Bookings</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  {/* Hotel + Rating */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{r.hotelName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarDisplay rating={r.overallRating} />
                        <span className="text-xs text-muted-foreground">
                          {RATING_LABELS[r.overallRating]}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${
                        r.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : r.status === "hidden"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>

                  {/* Review content */}
                  <div className="mb-2">
                    <div className="text-xs font-medium text-foreground mb-0.5">{r.reviewTitle}</div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{r.reviewDescription}</p>
                  </div>

                  {/* Sub-ratings */}
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-3 text-xs">
                    {[
                      ["Cleanliness", r.cleanlinessRating],
                      ["Room", r.roomQualityRating],
                      ["Staff", r.staffRating],
                      ["Location", r.locationRating],
                      ["Value", r.valueRating],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex items-center gap-1">
                        <span className="text-muted-foreground">{label}:</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Photos */}
                  {r.reviewPhotos && r.reviewPhotos.length > 0 && (
                    <div className="flex gap-1.5 mb-3">
                      {r.reviewPhotos.slice(0, 4).map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover border"
                        />
                      ))}
                      {r.reviewPhotos.length > 4 && (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                          +{r.reviewPhotos.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Owner reply */}
                  {r.ownerReplyMessage && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3 border-l-2 border-primary">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">Owner's Reply</span>
                      </div>
                      {r.ownerReplyTitle && (
                        <div className="text-xs font-medium text-foreground mb-0.5">{r.ownerReplyTitle}</div>
                      )}
                      <p className="text-xs text-muted-foreground">{r.ownerReplyMessage}</p>
                    </div>
                  )}

                  {/* Edit window */}
                  {isEditable(r) && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 mb-2">
                      <Clock className="w-3 h-3" />
                      Editable for {daysLeft(r)} more days
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {isEditable(r) && (
                      <Link href={`/customer/write-review/${r.bookingId}`}>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                    {isEditable(r) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteDialog(r.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setReportDialog(r.id)}
                    >
                      <Flag className="w-3 h-3 mr-1" />
                      Report
                    </Button>
                  </div>

                  <div className="text-[11px] text-muted-foreground/60 mt-2">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
