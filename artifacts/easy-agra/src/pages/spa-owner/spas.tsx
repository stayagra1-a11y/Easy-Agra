import { useState } from "react";
import { Link } from "wouter";
import {
  useGetMySpasList,
  useDeleteSpa,
  useRestoreSpa,
} from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMySpasListQueryKey } from "@workspace/api-client-react";
import {
  Building2,
  PlusCircle,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  MapPin,
  Clock,
  Sparkles,
  Send,
} from "lucide-react";
import { apiRequest } from "@/lib/api-request";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  suspended: { label: "Suspended", className: "bg-orange-100 text-orange-700" },
};

type SpaItem = {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  status: string;
  openingTime?: string | null;
  closingTime?: string | null;
  facilities?: string[] | null;
  deletedAt?: string | null;
  rejectionReason?: string | null;
};

export default function OwnerSpas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: spas, isLoading } = useGetMySpasList();
  const deleteMutation = useDeleteSpa();
  const restoreMutation = useRestoreSpa();

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const activeSpas = (spas ?? []).filter((s: SpaItem) => !s.deletedAt);
  const deletedSpas = (spas ?? []).filter((s: SpaItem) => s.deletedAt);

  async function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMySpasListQueryKey() });
          toast({ title: "Spa deleted" });
          setDeleteId(null);
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      },
    );
  }

  async function handleRestore(id: number) {
    restoreMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMySpasListQueryKey() });
          toast({ title: "Spa restored" });
        },
        onError: () => toast({ title: "Failed to restore", variant: "destructive" }),
      },
    );
  }

  async function handleSubmit(id: number) {
    setSubmitting(id);
    try {
      await apiRequest(`/api/spas/${id}/submit`, { method: "PUT" });
      queryClient.invalidateQueries({ queryKey: getGetMySpasListQueryKey() });
      toast({ title: "Spa submitted for approval" });
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  }

  function renderSpaCard(spa: SpaItem, isDeleted = false) {
    const cfg = STATUS_CONFIG[spa.status] ?? STATUS_CONFIG.draft;
    const canSubmit = !isDeleted && (spa.status === "draft" || spa.status === "rejected");

    return (
      <Card key={spa.id} className={isDeleted ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold truncate">{spa.name}</span>
              </div>
              {(spa.city || spa.state) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {[spa.city, spa.state].filter(Boolean).join(", ")}
                </div>
              )}
              {spa.openingTime && spa.closingTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  {spa.openingTime} – {spa.closingTime}
                </div>
              )}
            </div>
            <Badge className={`text-xs border-0 shrink-0 ${cfg.className}`}>
              {cfg.label}
            </Badge>
          </div>

          {spa.facilities && spa.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {spa.facilities.slice(0, 4).map((f) => (
                <Badge key={f} variant="outline" className="text-[10px] py-0">
                  {f}
                </Badge>
              ))}
              {spa.facilities.length > 4 && (
                <Badge variant="outline" className="text-[10px] py-0">
                  +{spa.facilities.length - 4}
                </Badge>
              )}
            </div>
          )}

          {spa.status === "rejected" && spa.rejectionReason && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3">
              <span className="font-medium">Rejected:</span> {spa.rejectionReason}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!isDeleted && (
              <Link href={`/spa-owner/spas/${spa.id}/edit`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            )}
            {canSubmit && (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5"
                onClick={() => handleSubmit(spa.id)}
                disabled={submitting === spa.id}
              >
                {submitting === spa.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit
              </Button>
            )}
            {!isDeleted && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteId(spa.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
            {isDeleted && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleRestore(spa.id)}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">My Spas</h1>
            <p className="text-xs text-muted-foreground">
              {activeSpas.length} active spa{activeSpas.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/spa-owner/spas/new">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Add Spa
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : activeSpas.length === 0 && deletedSpas.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No spas yet</p>
              <p className="text-xs text-muted-foreground/70 text-center">
                Add your first spa and submit it for admin approval
              </p>
              <Link href="/spa-owner/spas/new">
                <Button size="sm" className="gap-1.5">
                  <PlusCircle className="h-4 w-4" />
                  Add Spa
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {activeSpas.map((s: SpaItem) => renderSpaCard(s, false))}
            </div>

            {deletedSpas.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                  Deleted Spas
                </p>
                {deletedSpas.map((s: SpaItem) => renderSpaCard(s, true))}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Spa?</AlertDialogTitle>
            <AlertDialogDescription>
              This spa will be soft-deleted. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerLayout>
  );
}
