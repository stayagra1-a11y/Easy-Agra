import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useListReviews,
  useReplyToReview,
  useReportReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  MessageSquare,
  Flag,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
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

const RATING_LABELS: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

export default function HotelReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [replyDialog, setReplyDialog] = useState<{ id: number; existing?: { title?: string; message?: string } } | null>(null);
  const [replyTitle, setReplyTitle] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [reportDialog, setReportDialog] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");

  const listQuery = useListReviews({
    rating: ratingFilter !== "all" ? parseInt(ratingFilter) : undefined,
    sort,
    page,
    limit: 10,
  });

  const replyMut = useReplyToReview();
  const reportMut = useReportReview();

  const reviews = listQuery.data?.reviews ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const totalReviews = total;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(1)
    : "—";
  const positiveCount = reviews.filter((r) => r.overallRating >= 4).length;
  const positivePct = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["listReviews"] });
  }

  function openReplyDialog(id: number, existing?: any) {
    setReplyDialog({ id, existing });
    setReplyTitle(existing?.ownerReplyTitle ?? "");
    setReplyMessage(existing?.ownerReplyMessage ?? "");
  }

  function handleReply() {
    if (!replyDialog || !replyMessage.trim()) return;
    replyMut.mutate(
      { id: replyDialog.id, data: { replyTitle: replyTitle.trim() || undefined, replyMessage: replyMessage.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Reply posted ✓" });
          setReplyDialog(null);
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
          toast({ title: "Reported", description: "Review reported to admin." });
          setReportDialog(null);
          setReportReason("");
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
      },
    );
  }

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-28">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Guest Reviews</h1>
          <p className="text-sm text-muted-foreground">Manage and reply to your hotel reviews</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-foreground">{listQuery.data?.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">Total Reviews</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1">
                {avgRating} <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div className="text-xs text-muted-foreground">Avg Rating</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{positivePct}%</div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((r) => (
                <SelectItem key={r} value={String(r)}>{r} ⭐</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rating</SelectItem>
              <SelectItem value="lowest">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reviews */}
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  {/* Customer + Rating */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {r.customerName?.charAt(0).toUpperCase() ?? "G"}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{r.customerName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StarDisplay rating={r.overallRating} />
                      <span className="text-xs text-muted-foreground">{RATING_LABELS[r.overallRating]}</span>
                    </div>
                  </div>

                  {/* Review text */}
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-foreground mb-0.5">{r.reviewTitle}</div>
                    <p className="text-sm text-muted-foreground">{r.reviewDescription}</p>
                  </div>

                  {/* Sub-ratings */}
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1 mb-3 text-xs">
                    {[
                      ["Clean", r.cleanlinessRating],
                      ["Room", r.roomQualityRating],
                      ["Staff", r.staffRating],
                      ["Location", r.locationRating],
                      ["Value", r.valueRating],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex items-center gap-1">
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-semibold">{val}⭐</span>
                      </div>
                    ))}
                  </div>

                  {/* Photos */}
                  {r.reviewPhotos && r.reviewPhotos.length > 0 && (
                    <div className="flex gap-1.5 mb-3">
                      {r.reviewPhotos.slice(0, 5).map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ))}
                    </div>
                  )}

                  {/* Existing owner reply */}
                  {r.ownerReplyMessage && (
                    <div className="bg-primary/5 rounded-lg p-3 mb-3 border-l-2 border-primary">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">Your Reply</span>
                      </div>
                      {r.ownerReplyTitle && (
                        <div className="text-xs font-medium text-foreground mb-0.5">{r.ownerReplyTitle}</div>
                      )}
                      <p className="text-xs text-muted-foreground">{r.ownerReplyMessage}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => openReplyDialog(r.id, r.ownerReplyMessage ? r : undefined)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {r.ownerReplyMessage ? "Edit Reply" : "Reply"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => setReportDialog(r.id)}
                    >
                      <Flag className="w-3 h-3 mr-1" />
                      Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={!!replyDialog} onOpenChange={() => { setReplyDialog(null); setReplyTitle(""); setReplyMessage(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reply Title (optional)</label>
              <Input
                placeholder="e.g. Thank you for your feedback!"
                value={replyTitle}
                onChange={(e) => setReplyTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Your Reply *</label>
              <Textarea
                placeholder="Write a thoughtful response to the guest's review…"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyDialog(null); setReplyTitle(""); setReplyMessage(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleReply}
              disabled={!replyMessage.trim() || replyMut.isPending}
              className="bg-primary"
            >
              {replyMut.isPending ? "Posting…" : "Post Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialog !== null} onOpenChange={() => { setReportDialog(null); setReportReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Fake Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {["Spam", "Fake Review", "Offensive Content", "Abuse", "Misleading Information"].map((r) => (
              <button
                key={r}
                onClick={() => setReportReason(r)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  reportReason === r ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportDialog(null); setReportReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={!reportReason || reportMut.isPending}
            >
              Report Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
