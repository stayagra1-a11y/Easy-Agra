import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useGetReviewStats,
  useListReviews,
  useHideReview,
  useRestoreReview,
  useRemoveReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MessageSquare,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size }}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 fill-muted-foreground/20"}
        />
      ))}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  hidden: "bg-orange-100 text-orange-800 border-orange-200",
  removed: "bg-red-100 text-red-800 border-red-200",
};

const REPORT_COLORS: Record<string, string> = {
  none: "bg-gray-100 text-gray-600",
  pending: "bg-red-100 text-red-700",
  reviewed: "bg-blue-100 text-blue-700",
};

export default function AdminReviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [reportFilter, setReportFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"all" | "reported">("all");

  const statsQuery = useGetReviewStats();
  const listQuery = useListReviews({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    rating: ratingFilter !== "all" ? parseInt(ratingFilter) : undefined,
    reportStatus: tab === "reported" ? "pending" : (reportFilter !== "all" ? reportFilter : undefined),
    sort,
    page,
    limit: 10,
  });

  const hideMut = useHideReview();
  const restoreMut = useRestoreReview();
  const removeMut = useRemoveReview();

  const stats = statsQuery.data;
  const reviews = listQuery.data?.reviews ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["getReviewStats"] });
    queryClient.invalidateQueries({ queryKey: ["listReviews"] });
  }

  function handleHide(id: number) {
    hideMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Review hidden" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function handleRestore(id: number) {
    restoreMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Review restored" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function handleRemove(id: number) {
    if (!confirm("Permanently remove this review?")) return;
    removeMut.mutate({ id }, {
      onSuccess: () => { toast({ title: "Review removed" }); invalidate(); },
      onError: (e: any) => toast({ title: "Error", description: e?.message, variant: "destructive" }),
    });
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Monitoring</h1>
          <p className="text-sm text-muted-foreground">Monitor, moderate and manage all hotel reviews</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statsQuery.isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : [
                { label: "Total Reviews", value: stats?.total ?? 0, color: "text-teal-700", bg: "bg-teal-50", icon: MessageSquare },
                { label: "Approved", value: stats?.approved ?? 0, color: "text-emerald-700", bg: "bg-emerald-50", icon: Eye },
                { label: "Hidden", value: stats?.hidden ?? 0, color: "text-orange-700", bg: "bg-orange-50", icon: EyeOff },
                { label: "Reported", value: stats?.reported ?? 0, color: "text-red-700", bg: "bg-red-50", icon: AlertTriangle },
                { label: "Avg Rating", value: `${(stats?.avgRating ?? 0).toFixed(1)} ⭐`, color: "text-amber-700", bg: "bg-amber-50", icon: Star },
              ].map((s) => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">{s.label}</div>
                      <div className="text-base font-bold text-foreground">{s.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Rating Distribution */}
        {stats && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Rating Distribution</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = (stats.distribution as Record<string, number>)[String(star)] ?? 0;
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                        <span>{star}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={tab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTab("all"); setPage(1); }}
            className={tab === "all" ? "bg-primary" : ""}
          >
            All Reviews
          </Button>
          <Button
            variant={tab === "reported" ? "default" : "outline"}
            size="sm"
            onClick={() => { setTab("reported"); setPage(1); }}
            className={tab === "reported" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Reported ({stats?.reported ?? 0})
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by hotel or customer name…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {tab === "all" && (
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
                <SelectTrigger className="w-40">
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
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {tab === "reported" ? "Reported Reviews" : "All Reviews"} ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reviews found</p>
              </div>
            ) : (
              <div className="divide-y">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-foreground truncate">{r.customerName}</span>
                          <StarDisplay rating={r.overallRating} />
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                            {r.status}
                          </Badge>
                          {r.reportStatus !== "none" && (
                            <Badge variant="outline" className={`text-xs ${REPORT_COLORS[r.reportStatus] ?? ""}`}>
                              {r.reportStatus === "pending" ? `⚠ ${r.reportCount} report${r.reportCount !== 1 ? "s" : ""}` : "Reviewed"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">{r.hotelName}</span>
                          {" · "}
                          {fmtDate(r.createdAt)}
                        </div>
                        <div className="text-xs font-medium text-foreground mb-0.5">{r.reviewTitle}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.reviewDescription}</p>
                        {r.reportReasons && r.reportReasons.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                            <div className="text-xs font-medium text-red-700 mb-1">Report Reasons:</div>
                            {r.reportReasons.map((reason, i) => (
                              <div key={i} className="text-xs text-red-600">• {reason}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {r.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => handleHide(r.id)}
                            disabled={hideMut.isPending}
                          >
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hide
                          </Button>
                        )}
                        {r.status === "hidden" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handleRestore(r.id)}
                            disabled={restoreMut.isPending}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleRemove(r.id)}
                          disabled={removeMut.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
