import { useState, useEffect } from "react";
import { useListHotels, useDeleteHotel, useSubmitHotel, getListHotelsQueryKey } from "@workspace/api-client-react";
import type { Hotel } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, PlusCircle, Search, Pencil, Trash2, Send, Eye, MapPin, Phone, Clock, Wifi, CheckCircle2, XCircle, Star, FileCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/api-request";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  draft: { label: "Draft", variant: "secondary", color: "text-slate-600" },
  pending: { label: "Pending Review", variant: "default", color: "text-amber-600" },
  approved: { label: "Approved", variant: "default", color: "text-green-600" },
  rejected: { label: "Rejected", variant: "destructive", color: "text-red-600" },
  suspended: { label: "Suspended", variant: "outline", color: "text-orange-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
  luxury: "Luxury",
};

const AMENITY_ICONS: Record<string, string> = {
  "Free WiFi": "📶",
  "Parking": "🅿️",
  "Air Conditioning": "❄️",
  "Restaurant": "🍽️",
  "Spa": "💆",
  "Room Service": "🛎️",
  "Swimming Pool": "🏊",
  "Lift": "🛗",
  "Power Backup": "🔋",
  "Laundry": "🧺",
  "CCTV Security": "📹",
};

function HotelDetailSheet({ hotel, open, onClose }: { hotel: Hotel | null; open: boolean; onClose: () => void }) {
  if (!hotel) return null;
  const sc = STATUS_CONFIG[hotel.status] ?? { label: hotel.status, variant: "secondary" as const };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <SheetTitle className="text-lg">{hotel.name}</SheetTitle>
          </div>
          <Badge variant={sc.variant} className="w-fit">{sc.label}</Badge>
        </SheetHeader>

        <div className="space-y-5 text-sm">
          {/* Cover image */}
          {hotel.coverImage && (
            <img src={hotel.coverImage} alt={hotel.name} className="w-full h-40 object-cover rounded-lg" />
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">{CATEGORY_LABELS[hotel.category] ?? hotel.category}</p>
            </div>
            {hotel.totalRooms && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Rooms</p>
                <p className="font-medium">{hotel.totalRooms}</p>
              </div>
            )}
            {hotel.checkInTime && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{hotel.checkInTime}</p>
              </div>
            )}
            {hotel.checkOutTime && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{hotel.checkOutTime}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {hotel.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">{hotel.description}</p>
            </div>
          )}

          {/* Location */}
          {(hotel.address || hotel.city) && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />Location</p>
              <p>{[hotel.address, hotel.landmark, hotel.city, hotel.state, hotel.pincode].filter(Boolean).join(", ")}</p>
              {hotel.googleMapLink && (
                <a href={hotel.googleMapLink} target="_blank" rel="noreferrer" className="text-primary text-xs underline">View on Google Maps</a>
              )}
            </div>
          )}

          {/* Contact */}
          {(hotel.contactPerson || hotel.contactMobile) && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" />Contact</p>
              {hotel.contactPerson && <p className="font-medium">{hotel.contactPerson}</p>}
              {hotel.contactMobile && <p>{hotel.contactMobile}</p>}
              {hotel.contactEmail && <p>{hotel.contactEmail}</p>}
              {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" className="text-primary text-xs underline">{hotel.website}</a>}
            </div>
          )}

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Wifi className="h-3 w-3" />Amenities</p>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((a) => (
                  <span key={a} className="bg-primary/5 text-primary text-xs px-2 py-1 rounded-full">
                    {AMENITY_ICONS[a] ?? "✓"} {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {hotel.status === "rejected" && hotel.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" />Rejection Reason</p>
              <p className="text-red-700 text-xs">{hotel.rejectionReason}</p>
            </div>
          )}

          {/* Policies */}
          {hotel.policies && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hotel Policies</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{hotel.policies}</p>
            </div>
          )}

          {/* Gallery */}
          {hotel.galleryImages && hotel.galleryImages.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Gallery</p>
              <div className="grid grid-cols-3 gap-2">
                {hotel.galleryImages.map((img, i) => (
                  <img key={i} src={img} alt={`Gallery ${i + 1}`} className="w-full h-20 object-cover rounded" />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Created: {format(new Date(hotel.createdAt), "dd MMM yyyy, hh:mm a")}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function HotelOwnerHotels() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewHotel, setViewHotel] = useState<Hotel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hotel | null>(null);
  const [submitTarget, setSubmitTarget] = useState<Hotel | null>(null);
  const [commissionTarget, setCommissionTarget] = useState<Hotel | null>(null);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [agreementData, setAgreementData] = useState<any>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const params = {
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(search.trim() && { search: search.trim() }),
    limit: 50,
  };

  const { data, isLoading } = useListHotels(params);
  const hotels = data?.hotels ?? [];

  const deleteMutation = useDeleteHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        toast({ title: "Hotel deleted", description: "Hotel moved to trash." });
        setDeleteTarget(null);
      },
      onError: () => toast({ title: "Error", description: "Could not delete hotel.", variant: "destructive" }),
    },
  });

  const submitMutation = useSubmitHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        toast({ title: "Submitted!", description: "Your hotel has been submitted for review." });
        setSubmitTarget(null);
      },
      onError: () => toast({ title: "Error", description: "Could not submit hotel.", variant: "destructive" }),
    },
  });

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Hotels</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.total ?? 0} hotels total</p>
          </div>
          <Link href="/hotel-owner/hotels/new">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Hotel
            </Button>
          </Link>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hotels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hotel cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24 bg-muted/20 rounded-lg" />
              </Card>
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-primary/30 mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">
                {search || statusFilter !== "all" ? "No hotels match your filter" : "No hotels yet"}
              </p>
              {!search && statusFilter === "all" && (
                <>
                  <p className="text-sm text-muted-foreground/70 mt-1 mb-4">Add your first hotel to get started</p>
                  <Link href="/hotel-owner/hotels/new">
                    <Button size="sm" className="gap-2">
                      <PlusCircle className="h-4 w-4" /> Add Hotel
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel) => {
              const sc = STATUS_CONFIG[hotel.status] ?? { label: hotel.status, variant: "secondary" as const };
              const canEdit = ["draft", "rejected"].includes(hotel.status);
              const canSubmit = ["draft", "rejected"].includes(hotel.status);
              const canDelete = ["draft", "rejected"].includes(hotel.status);

              return (
                <Card key={hotel.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Cover thumb */}
                      {hotel.coverImage ? (
                        <img src={hotel.coverImage} alt={hotel.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                          <Building2 className="h-7 w-7 text-primary/40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold truncate">{hotel.name}</p>
                          <Badge variant={sc.variant} className="text-xs shrink-0">{sc.label}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {CATEGORY_LABELS[hotel.category] ?? hotel.category}
                            {hotel.city && ` · ${hotel.city}`}
                            {hotel.totalRooms && ` · ${hotel.totalRooms} rooms`}
                          </p>
                          {(hotel as any).starRating && (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: (hotel as any).starRating }).map((_: unknown, i: number) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        {hotel.status === "rejected" && hotel.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-1">⚠ {hotel.rejectionReason}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {format(new Date(hotel.createdAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setViewHotel(hotel)}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      {canEdit && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => navigate(`/hotel-owner/hotels/${hotel.id}/edit`)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                      )}
                      {canSubmit && (
                        <Button size="sm" className="h-7 text-xs gap-1"
                          onClick={() => setCommissionTarget(hotel)}>
                          <FileCheck className="h-3 w-3" /> Submit
                        </Button>
                      )}
                      {hotel.status === "approved" && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1 ml-auto"
                          onClick={() => setDeleteTarget(hotel)}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <HotelDetailSheet hotel={viewHotel} open={!!viewHotel} onClose={() => setViewHotel(null)} />

      {/* Commission Agreement Step */}
      <AlertDialog
        open={!!commissionTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCommissionTarget(null);
            setAgreementChecked(false);
            setAgreementData(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" /> Commission Agreement
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-sm">
                Before submitting <strong>"{commissionTarget?.name}"</strong>, please review and accept the commission agreement.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-800 mb-1">Commission Terms</p>
                <p className="text-amber-700">
                  Easy Agra will charge a <strong>15% commission</strong> on every booking amount for this hotel listing. This commission will be deducted from each booking before the payout is processed to your account.
                </p>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="agree"
                  checked={agreementChecked}
                  onCheckedChange={(v) => setAgreementChecked(v === true)}
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I agree to the 15% commission terms and authorize Easy Agra to deduct commission from all bookings.
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCommissionTarget(null);
                setAgreementChecked(false);
                setAgreementData(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!commissionTarget || !agreementChecked) return;
                try {
                  setAgreementLoading(true);
                  // Try to get existing agreement
                  const existing = await apiRequest(`/api/hotel-commission-agreements/${commissionTarget.id}`);
                  if (existing && existing.exists !== false && !existing.agreed) {
                    await apiRequest(`/api/hotel-commission-agreements/${commissionTarget.id}/agree`, { method: "POST" });
                  } else {
                    // No agreement yet — create then agree
                    await apiRequest("/api/hotel-commission-agreements", {
                      method: "POST",
                      body: { hotelId: commissionTarget.id, commissionRate: 15 },
                    });
                    await apiRequest(`/api/hotel-commission-agreements/${commissionTarget.id}/agree`, { method: "POST" });
                  }
                  // Now submit hotel
                  submitMutation.mutate({ id: commissionTarget.id });
                  setCommissionTarget(null);
                  setAgreementChecked(false);
                } catch (e: any) {
                  toast({
                    title: "Agreement Error",
                    description: e?.message || "Failed to process agreement. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setAgreementLoading(false);
                }
              }}
              disabled={!agreementChecked || submitMutation.isPending || agreementLoading}
            >
              {agreementLoading || submitMutation.isPending ? "Processing..." : "Agree & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hotel?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be moved to trash. This action can be reversed by a Super Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerLayout>
  );
}
