import { useState } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-request";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { imgUrl } from "@/lib/cloudinary";
import { useAuth } from "@/hooks/use-auth";
import {
  Star, MessageSquare, ChevronLeft, ChevronRight,
} from "lucide-react";

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} style={{ width: size, height: size }} className={s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20 fill-muted-foreground/10"} />
      ))}
    </span>
  );
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
  restaurantName: string;
  restaurantId: number;
}

export default function RestaurantOwnerReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [replyDialog, setReplyDialog] = useState<{ id: number; existing?: any } | null>(null);
  const [replyTitle, setReplyTitle] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading } = useQuery<{ reviews: Review[]; total: number }>({
    queryKey: ["restaurant-reviews", "owner", ratingFilter, sort, page],
    queryFn: () => apiRequest(`/api/restaurant-reviews/admin?rating=${ratingFilter !== "all" ? ratingFilter : ""}&sort=${sort}&page=${page}&limit=10`),
    enabled: !!user?.id,
  });

  const replyMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiRequest(`/api/restaurant-reviews/${id}/reply`, { method: "POST", body }),
    onSuccess: () => {
      toast({ title: "Reply posted!" });
      setReplyDialog(null);
      queryClient.invalidateQueries({ queryKey: ["restaurant-reviews", "owner"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }),
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length).toFixed(1)
    : "—";
  const positiveCount = reviews.filter((r) => r.overallRating >= 4).length;
  const positivePct = reviews.length > 0 ? Math.round((positiveCount / reviews.length) * 100) : 0;

  function handleReply() {
    if (!replyDialog || !replyMessage.trim()) return;
    replyMut.mutate({
      id: replyDialog.id,
      body: { title: replyTitle.trim() || undefined, message: replyMessage.trim() },
    });
  }

  return (
    <OwnerLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-28">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer Reviews</h1>
          <p className="text-sm text-muted-foreground">Manage and reply to your restaurant reviews</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><div className="text-xl font-bold">{total}</div><div className="text-xs text-muted-foreground">Total Reviews</div></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1">{avgRating} <Star className="w-4 h-4 fill-amber-400 text-amber-400" /></div><div className="text-xs text-muted-foreground">Avg Rating</div></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><div className="text-xl font-bold text-emerald-600">{positivePct}%</div><div className="text-xs text-muted-foreground">Positive</div></CardContent></Card>
        </div>

        <div className="flex gap-2">
          <select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="all">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={String(r)}>{r} ★</option>)}
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest</option>
            <option value="lowest">Lowest</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No reviews yet</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <Card key={rev.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rev.customerPhoto ? (
                        <img src={imgUrl(rev.customerPhoto, 100)} alt="" className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{rev.customerName?.charAt(0)?.toUpperCase() ?? "U"}</div>
                      )}
                      <div>
                        <div className="font-semibold text-sm">{rev.customerName}</div>
                        <div className="text-xs text-muted-foreground">{new Date(rev.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-sm">{rev.overallRating}</span>
                    </div>
                  </div>
                  <div className="font-semibold text-sm">{rev.reviewTitle}</div>
                  <p className="text-sm text-muted-foreground">{rev.reviewDescription}</p>
                  {rev.reviewPhotos?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {rev.reviewPhotos.map((p, i) => <img key={i} src={imgUrl(p, 300)} alt="" className="w-20 h-20 rounded-lg object-cover border flex-shrink-0" />)}
                    </div>
                  )}
                  {rev.ownerReplyMessage ? (
                    <div className="bg-muted rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary"><MessageSquare className="h-4 w-4" /> Your Reply</div>
                      {rev.ownerReplyTitle && <div className="text-sm font-medium">{rev.ownerReplyTitle}</div>}
                      <p className="text-sm text-muted-foreground">{rev.ownerReplyMessage}</p>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setReplyDialog({ id: rev.id }); setReplyTitle(""); setReplyMessage(""); }}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Reply
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}

        <Dialog open={!!replyDialog} onOpenChange={() => setReplyDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Reply to Review</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><label className="text-sm font-medium">Title (optional)</label><Input value={replyTitle} onChange={(e) => setReplyTitle(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Reply Message *</label><Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={4} placeholder="Thank the customer for their feedback..." /></div>
              <Button className="w-full" onClick={handleReply} disabled={replyMut.isPending}>Post Reply</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </OwnerLayout>
  );
}
