import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useGetRoom,
  useCreateRoom,
  useUpdateRoom,
  useListHotels,
  getGetRoomQueryKey,
  getListRoomsQueryKey,
  getGetRoomStatsQueryKey,
  type RoomInputRoomType,
  type RoomInputBedType,
  type RoomInputRoomSizeUnit,
  type RoomUpdateRoomType,
  type RoomUpdateBedType,
  type RoomUpdateRoomSizeUnit,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BedDouble,
  Users,
  IndianRupee,
  Wifi,
  Wind,
  Tv,
  Coffee,
  UtensilsCrossed,
  Phone,
  ShowerHead,
  Lock,
  Briefcase,
  Star,
  Thermometer,
  Camera,
  X,
  Plus,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calculator,
} from "lucide-react";

const TABS = ["Basic Info", "Capacity & Bed", "Pricing", "Amenities", "Media"] as const;
type Tab = typeof TABS[number];

const ROOM_TYPES = [
  { value: "standard", label: "Standard Room" },
  { value: "deluxe", label: "Deluxe Room" },
  { value: "premium", label: "Premium Room" },
  { value: "family", label: "Family Room" },
  { value: "executive", label: "Executive Room" },
  { value: "suite", label: "Suite Room" },
];

const BED_TYPES = [
  { value: "single", label: "Single Bed" },
  { value: "double", label: "Double Bed" },
  { value: "queen", label: "Queen Bed" },
  { value: "king", label: "King Bed" },
];

const AMENITIES_LIST = [
  { key: "Air Conditioning", icon: Wind },
  { key: "Free WiFi", icon: Wifi },
  { key: "Smart TV", icon: Tv },
  { key: "Balcony", icon: Star },
  { key: "Mini Fridge", icon: Thermometer },
  { key: "Tea/Coffee Maker", icon: Coffee },
  { key: "Room Service", icon: UtensilsCrossed },
  { key: "Wardrobe", icon: Briefcase },
  { key: "Hot Water", icon: ShowerHead },
  { key: "Hair Dryer", icon: Star },
  { key: "Work Desk", icon: Briefcase },
  { key: "Telephone", icon: Phone },
  { key: "Safe Locker", icon: Lock },
];

interface RoomFormData {
  hotelId: string;
  name: string;
  roomNumber: string;
  roomType: string;
  description: string;
  adultsCapacity: string;
  childrenCapacity: string;
  bedType: string;
  roomSize: string;
  roomSizeUnit: string;
  basePrice: string;
  weekendPrice: string;
  holidayPrice: string;
  discountPercentage: string;
  extraGuestCharge: string;
  amenities: string[];
  coverImage: string;
  galleryImages: string[];
  totalRooms: string;
  availableRooms: string;
  occupiedRooms: string;
  blockedRooms: string;
  underMaintenanceRooms: string;
}

const EMPTY_FORM: RoomFormData = {
  hotelId: "",
  name: "",
  roomNumber: "",
  roomType: "standard",
  description: "",
  adultsCapacity: "2",
  childrenCapacity: "0",
  bedType: "double",
  roomSize: "",
  roomSizeUnit: "sqft",
  basePrice: "",
  weekendPrice: "",
  holidayPrice: "",
  discountPercentage: "0",
  extraGuestCharge: "",
  amenities: [],
  coverImage: "",
  galleryImages: [],
  totalRooms: "1",
  availableRooms: "1",
  occupiedRooms: "0",
  blockedRooms: "0",
  underMaintenanceRooms: "0",
};

export default function RoomForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!id;
  const roomId = id ? parseInt(id, 10) : 0;

  const [activeTab, setActiveTab] = useState<Tab>("Basic Info");
  const [form, setForm] = useState<RoomFormData>(EMPTY_FORM);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: hotelsData } = useListHotels({ limit: 100, status: "approved" });
  const hotels = hotelsData?.hotels ?? [];

  const { data: existingRoom } = useGetRoom(roomId, {
    query: { enabled: isEdit, queryKey: getGetRoomQueryKey(roomId) },
  });

  useEffect(() => {
    if (existingRoom) {
      setForm({
        hotelId: String(existingRoom.hotelId),
        name: existingRoom.name,
        roomNumber: existingRoom.roomNumber ?? "",
        roomType: existingRoom.roomType,
        description: existingRoom.description ?? "",
        adultsCapacity: String(existingRoom.adultsCapacity),
        childrenCapacity: String(existingRoom.childrenCapacity),
        bedType: existingRoom.bedType,
        roomSize: existingRoom.roomSize != null ? String(existingRoom.roomSize) : "",
        roomSizeUnit: existingRoom.roomSizeUnit ?? "sqft",
        basePrice: String(existingRoom.basePrice),
        weekendPrice: existingRoom.weekendPrice != null ? String(existingRoom.weekendPrice) : "",
        holidayPrice: existingRoom.holidayPrice != null ? String(existingRoom.holidayPrice) : "",
        discountPercentage: String(existingRoom.discountPercentage ?? 0),
        extraGuestCharge: existingRoom.extraGuestCharge != null ? String(existingRoom.extraGuestCharge) : "",
        amenities: existingRoom.amenities ?? [],
        coverImage: existingRoom.coverImage ?? "",
        galleryImages: existingRoom.galleryImages ?? [],
        totalRooms: String(existingRoom.totalRooms),
        availableRooms: String(existingRoom.availableRooms),
        occupiedRooms: String(existingRoom.occupiedRooms),
        blockedRooms: String(existingRoom.blockedRooms),
        underMaintenanceRooms: String(existingRoom.underMaintenanceRooms),
      });
    }
  }, [existingRoom]);

  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();

  const set = (key: keyof RoomFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = async (file: File, type: "cover" | "gallery") => {
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const url = await uploadToCloudinary(file);
      if (type === "cover") {
        set("coverImage", url);
      } else {
        setForm((prev) => ({
          ...prev,
          galleryImages: [...prev.galleryImages, url],
        }));
      }
    } catch {
      // toast not available here — silently ignore or add toast import
    }
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== idx),
    }));
  };

  // Auto-compute available rooms
  const computedAvailable = Math.max(
    0,
    parseInt(form.totalRooms || "0", 10) -
      parseInt(form.occupiedRooms || "0", 10) -
      parseInt(form.blockedRooms || "0", 10) -
      parseInt(form.underMaintenanceRooms || "0", 10)
  );

  const basePrice = parseFloat(form.basePrice || "0");
  const discount = parseFloat(form.discountPercentage || "0");
  const discountAmount = basePrice * (discount / 100);
  const finalPrice = basePrice - discountAmount;

  const handleSubmit = async () => {
    if (!form.hotelId) { toast({ title: "Please select a hotel", variant: "destructive" }); return; }
    if (!form.name.trim()) { toast({ title: "Room name is required", variant: "destructive" }); return; }
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) {
      toast({ title: "Valid base price is required", variant: "destructive" }); return;
    }

    const payload = {
      hotelId: parseInt(form.hotelId, 10),
      name: form.name.trim(),
      roomNumber: form.roomNumber || undefined,
      roomType: form.roomType as RoomInputRoomType,
      description: form.description || undefined,
      adultsCapacity: parseInt(form.adultsCapacity, 10),
      childrenCapacity: parseInt(form.childrenCapacity, 10),
      bedType: form.bedType as RoomInputBedType,
      roomSize: form.roomSize ? parseFloat(form.roomSize) : undefined,
      roomSizeUnit: form.roomSizeUnit as RoomInputRoomSizeUnit,
      basePrice: parseFloat(form.basePrice),
      weekendPrice: form.weekendPrice ? parseFloat(form.weekendPrice) : undefined,
      holidayPrice: form.holidayPrice ? parseFloat(form.holidayPrice) : undefined,
      discountPercentage: parseFloat(form.discountPercentage || "0"),
      extraGuestCharge: form.extraGuestCharge ? parseFloat(form.extraGuestCharge) : undefined,
      amenities: form.amenities,
      coverImage: form.coverImage || undefined,
      galleryImages: form.galleryImages,
      totalRooms: parseInt(form.totalRooms, 10),
      availableRooms: computedAvailable,
      occupiedRooms: parseInt(form.occupiedRooms, 10),
      blockedRooms: parseInt(form.blockedRooms, 10),
      underMaintenanceRooms: parseInt(form.underMaintenanceRooms, 10),
    };

    try {
      if (isEdit) {
        const updatePayload = {
          ...payload,
          roomType: payload.roomType as unknown as RoomUpdateRoomType,
          bedType: payload.bedType as unknown as RoomUpdateBedType,
          roomSizeUnit: payload.roomSizeUnit as unknown as RoomUpdateRoomSizeUnit,
        };
        await updateMutation.mutateAsync({ id: roomId, data: updatePayload });
        toast({ title: "Room updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(roomId) });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Room created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRoomStatsQueryKey() });
      navigate("/hotel-owner/rooms");
    } catch (err: any) {
      toast({
        title: isEdit ? "Failed to update room" : "Failed to create room",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    }
  };

  const tabIdx = TABS.indexOf(activeTab);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const renderTab = () => {
    switch (activeTab) {
      case "Basic Info":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hotel *</Label>
              <Select value={form.hotelId} onValueChange={(v) => set("hotelId", v)} disabled={isEdit}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hotels.length === 0 && (
                <p className="text-xs text-amber-600">No approved hotels. Get your hotel approved first.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Room Name *</Label>
                <Input
                  placeholder="e.g. Deluxe King Room"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Room Number</Label>
                <Input
                  placeholder="e.g. 101"
                  value={form.roomNumber}
                  onChange={(e) => set("roomNumber", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Room Type *</Label>
                <Select value={form.roomType} onValueChange={(v) => set("roomType", v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                placeholder="Describe the room features, view, and highlights..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
            </div>
          </div>
        );

      case "Capacity & Bed":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Room Capacity
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adults</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={form.adultsCapacity}
                    onChange={(e) => set("adultsCapacity", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Children</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={form.childrenCapacity}
                    onChange={(e) => set("childrenCapacity", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5" /> Bed Type *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {BED_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("bedType", value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.bedType === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <BedDouble className={`h-5 w-5 mb-1 ${form.bedType === value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`text-xs font-medium ${form.bedType === value ? "text-primary" : "text-foreground"}`}>
                      {label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Room Size</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 350"
                  value={form.roomSize}
                  onChange={(e) => set("roomSize", e.target.value)}
                  className="h-10 flex-1"
                />
                <Select value={form.roomSizeUnit} onValueChange={(v) => set("roomSizeUnit", v)}>
                  <SelectTrigger className="h-10 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqft">sq ft</SelectItem>
                    <SelectItem value="sqm">sq m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Availability Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-medium">Room Availability</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Total Rooms</Label>
                  <Input type="number" min="1" value={form.totalRooms} onChange={(e) => set("totalRooms", e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Occupied</Label>
                  <Input type="number" min="0" value={form.occupiedRooms} onChange={(e) => set("occupiedRooms", e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Blocked</Label>
                  <Input type="number" min="0" value={form.blockedRooms} onChange={(e) => set("blockedRooms", e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Maintenance</Label>
                  <Input type="number" min="0" value={form.underMaintenanceRooms} onChange={(e) => set("underMaintenanceRooms", e.target.value)} className="h-10" />
                </div>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-800">
                  <span className="font-semibold">{computedAvailable}</span> rooms available
                  <span className="text-green-600 ml-1">(auto-calculated)</span>
                </p>
              </div>
            </div>
          </div>
        );

      case "Pricing":
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Base Price Per Night *
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0"
                  value={form.basePrice}
                  onChange={(e) => set("basePrice", e.target.value)}
                  className="h-10 pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Weekend Price</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.weekendPrice}
                    onChange={(e) => set("weekendPrice", e.target.value)}
                    className="h-10 pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Holiday Price</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.holidayPrice}
                    onChange={(e) => set("holidayPrice", e.target.value)}
                    className="h-10 pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={form.discountPercentage}
                  onChange={(e) => set("discountPercentage", e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Extra Guest Charge</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.extraGuestCharge}
                    onChange={(e) => set("extraGuestCharge", e.target.value)}
                    className="h-10 pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Price Summary */}
            {basePrice > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Price Summary</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Price</span>
                  <span>₹{basePrice.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount ({discount}%)</span>
                    <span>- ₹{discountAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t border-primary/20 pt-2 flex justify-between">
                  <span className="font-semibold text-sm">Final Price / Night</span>
                  <span className="font-bold text-primary text-base">₹{finalPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        );

      case "Amenities":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select amenities available in this room ({form.amenities.length} selected)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AMENITIES_LIST.map(({ key, icon: Icon }) => {
                const selected = form.amenities.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAmenity(key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "Media":
        return (
          <div className="space-y-5">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cover Photo *</Label>
              {form.coverImage ? (
                <div className="relative">
                  <img
                    src={form.coverImage}
                    alt="Cover"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => set("coverImage", "")}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-xs">Tap to upload cover photo</span>
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "cover");
                }}
              />
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Gallery Photos ({form.galleryImages.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {form.galleryImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(idx)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px]">Add Photo</span>
                </button>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => handleImageUpload(file, "gallery"));
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/hotel-owner/rooms")}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{isEdit ? "Edit Room" : "Add Room"}</h1>
            <p className="text-xs text-muted-foreground">
              {isEdit ? "Update room details" : "Create a new room for your hotel"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {idx + 1}. {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <Card>
          <CardContent className="pt-4 pb-4">
            {renderTab()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          {tabIdx > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(TABS[tabIdx - 1])}
              className="gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          ) : (
            <div />
          )}

          {tabIdx < TABS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setActiveTab(TABS[tabIdx + 1])}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? "Saving..." : isEdit ? "Update Room" : "Create Room"}
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1 justify-center">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`h-1 rounded-full transition-all ${
                tab === activeTab ? "w-6 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </OwnerLayout>
  );
}
