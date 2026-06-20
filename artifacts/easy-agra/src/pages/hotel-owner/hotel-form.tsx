import { useState, useRef, useEffect } from "react";
import { useCreateHotel, useUpdateHotel, useGetHotel, getGetHotelQueryKey, getListHotelsQueryKey } from "@workspace/api-client-react";
import type { HotelInput, HotelUpdate } from "@workspace/api-client-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, Phone, Info, Wifi, Image, Save, Send, Loader2, IndianRupee } from "lucide-react";
import { UpiSettingsCard } from "@/components/upi-settings-card";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const AMENITIES_LIST = [
  "Free WiFi", "Parking", "Air Conditioning", "Restaurant", "Spa",
  "Room Service", "Swimming Pool", "Lift", "Power Backup", "Laundry", "CCTV Security",
];

function ImageUpload({
  label,
  value,
  onChange,
  multiple,
}: {
  label: string;
  value: string | string[] | null | undefined;
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (multiple) {
          onChange([...((value as string[]) || []), result]);
        } else {
          onChange(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  if (multiple) {
    const images = (value as string[]) || [];
    return (
      <div className="space-y-2">
        <Label className="text-sm">{label}</Label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt="" className="w-full h-20 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >×</button>
            </div>
          ))}
          {images.length < 8 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl">+</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {value ? (
        <div className="relative group">
          <img src={value as string} alt="" className="w-full h-36 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >Remove</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors gap-2"
        >
          <Image className="h-8 w-8 opacity-40" />
          <span className="text-xs">Tap to upload cover image</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

type FormData = {
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  googleMapLink: string;
  landmark: string;
  contactPerson: string;
  contactMobile: string;
  contactEmail: string;
  website: string;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: string;
  policies: string;
  cancellationPolicy: string;
  amenities: string[];
  coverImage: string;
  galleryImages: string[];
};

const EMPTY_FORM: FormData = {
  name: "", description: "", category: "standard",
  address: "", city: "", state: "", pincode: "", googleMapLink: "", landmark: "",
  contactPerson: "", contactMobile: "", contactEmail: "", website: "",
  checkInTime: "14:00", checkOutTime: "11:00",
  totalRooms: "", policies: "", cancellationPolicy: "",
  amenities: [], coverImage: "", galleryImages: [],
};

export default function HotelForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const hotelId = params.id ? parseInt(params.id, 10) : undefined;

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("basic");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: existingHotel } = useGetHotel(hotelId!, {
    query: { enabled: isEdit && !!hotelId, queryKey: getGetHotelQueryKey(hotelId!) },
  });

  useEffect(() => {
    if (existingHotel && isEdit) {
      setForm({
        name: existingHotel.name || "",
        description: existingHotel.description || "",
        category: existingHotel.category || "standard",
        address: existingHotel.address || "",
        city: existingHotel.city || "",
        state: existingHotel.state || "",
        pincode: existingHotel.pincode || "",
        googleMapLink: existingHotel.googleMapLink || "",
        landmark: existingHotel.landmark || "",
        contactPerson: existingHotel.contactPerson || "",
        contactMobile: existingHotel.contactMobile || "",
        contactEmail: existingHotel.contactEmail || "",
        website: existingHotel.website || "",
        checkInTime: existingHotel.checkInTime || "14:00",
        checkOutTime: existingHotel.checkOutTime || "11:00",
        totalRooms: existingHotel.totalRooms?.toString() || "",
        policies: existingHotel.policies || "",
        cancellationPolicy: existingHotel.cancellationPolicy || "",
        amenities: existingHotel.amenities || [],
        coverImage: existingHotel.coverImage || "",
        galleryImages: existingHotel.galleryImages || [],
      });
    }
  }, [existingHotel, isEdit]);

  const set = (key: keyof FormData) => (val: any) => setForm((f) => ({ ...f, [key]: val }));
  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const buildPayload = (): HotelInput => ({
    name: form.name.trim(),
    description: form.description || undefined,
    category: form.category as any,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    pincode: form.pincode || undefined,
    googleMapLink: form.googleMapLink || undefined,
    landmark: form.landmark || undefined,
    contactPerson: form.contactPerson || undefined,
    contactMobile: form.contactMobile || undefined,
    contactEmail: form.contactEmail || undefined,
    website: form.website || undefined,
    checkInTime: form.checkInTime || undefined,
    checkOutTime: form.checkOutTime || undefined,
    totalRooms: form.totalRooms ? parseInt(form.totalRooms, 10) : undefined,
    policies: form.policies || undefined,
    cancellationPolicy: form.cancellationPolicy || undefined,
    amenities: form.amenities,
    coverImage: form.coverImage || undefined,
    galleryImages: form.galleryImages,
  });

  const createMutation = useCreateHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        toast({ title: "Hotel created!", description: "Saved as draft. Submit for approval when ready." });
        navigate("/hotel-owner/hotels");
      },
      onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error || "Could not create hotel.", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateHotel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHotelsQueryKey() });
        toast({ title: "Hotel updated!" });
        navigate("/hotel-owner/hotels");
      },
      onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error || "Could not update hotel.", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Hotel name required", variant: "destructive" });
      setActiveTab("basic");
      return;
    }
    if (isEdit && hotelId) {
      updateMutation.mutate({ id: hotelId, data: buildPayload() as HotelUpdate });
    } else {
      createMutation.mutate({ data: buildPayload() });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const toggleAmenity = (a: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  };

  return (
    <OwnerLayout>
      <div className="space-y-4 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/hotel-owner/hotels">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">{isEdit ? "Edit Hotel" : "Add New Hotel"}</h1>
            <p className="text-xs text-muted-foreground">{isEdit ? "Update hotel information" : "Fill in details and save as draft"}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto p-1 gap-1 overflow-x-auto">
            <TabsTrigger value="basic" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Building2 className="h-3.5 w-3.5" /> Basic
            </TabsTrigger>
            <TabsTrigger value="location" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <MapPin className="h-3.5 w-3.5" /> Location
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Phone className="h-3.5 w-3.5" /> Contact
            </TabsTrigger>
            <TabsTrigger value="amenities" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Wifi className="h-3.5 w-3.5" /> Amenities
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
              <Image className="h-3.5 w-3.5" /> Media
            </TabsTrigger>
            {isEdit && (
              <TabsTrigger value="payment" className="flex-col h-12 text-xs gap-0.5 px-2 shrink-0">
                <IndianRupee className="h-3.5 w-3.5" /> UPI
              </TabsTrigger>
            )}
          </TabsList>

          {/* Basic Info */}
          <TabsContent value="basic" className="mt-3 space-y-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">Hotel Name <span className="text-destructive">*</span></Label>
                  <Input id="name" placeholder="e.g. Hotel Taj View" value={form.name} onChange={setField("name")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc" className="text-xs">Description</Label>
                  <Textarea id="desc" placeholder="Describe your hotel..." value={form.description} onChange={setField("description")} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={set("category")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Hotel Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Check-in Time</Label>
                    <Input type="time" value={form.checkInTime} onChange={setField("checkInTime")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Check-out Time</Label>
                    <Input type="time" value={form.checkOutTime} onChange={setField("checkOutTime")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Rooms</Label>
                  <Input type="number" placeholder="e.g. 50" value={form.totalRooms} onChange={setField("totalRooms")} min={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hotel Policies</Label>
                  <Textarea placeholder="No smoking, pets allowed with prior approval..." value={form.policies} onChange={setField("policies")} rows={3} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cancellation Policy</Label>
                  <Textarea placeholder="Free cancellation up to 24 hours before check-in..." value={form.cancellationPolicy} onChange={setField("cancellationPolicy")} rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location */}
          <TabsContent value="location" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Address</Label>
                  <Textarea placeholder="Street address..." value={form.address} onChange={setField("address")} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Landmark</Label>
                  <Input placeholder="Near Taj Mahal East Gate" value={form.landmark} onChange={setField("landmark")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input placeholder="Agra" value={form.city} onChange={setField("city")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input placeholder="Uttar Pradesh" value={form.state} onChange={setField("state")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pincode</Label>
                  <Input placeholder="282001" value={form.pincode} onChange={setField("pincode")} maxLength={6} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Google Maps Link</Label>
                  <Input placeholder="https://maps.google.com/..." value={form.googleMapLink} onChange={setField("googleMapLink")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person</Label>
                  <Input placeholder="Name of manager / front desk" value={form.contactPerson} onChange={setField("contactPerson")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input placeholder="+91 9876543210" value={form.contactMobile} onChange={setField("contactMobile")} type="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input placeholder="hotel@example.com" value={form.contactEmail} onChange={setField("contactEmail")} type="email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Website (Optional)</Label>
                  <Input placeholder="https://yourhotel.com" value={form.website} onChange={setField("website")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Amenities */}
          <TabsContent value="amenities" className="mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" /> Amenities
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {AMENITIES_LIST.map((a) => (
                    <div key={a} className="flex items-center gap-2.5">
                      <Checkbox
                        id={a}
                        checked={form.amenities.includes(a)}
                        onCheckedChange={() => toggleAmenity(a)}
                      />
                      <Label htmlFor={a} className="text-sm cursor-pointer">{a}</Label>
                    </div>
                  ))}
                </div>
                {form.amenities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-4">{form.amenities.length} amenities selected</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media */}
          <TabsContent value="media" className="mt-3 space-y-4">
            <Card>
              <CardContent className="px-4 py-4">
                <ImageUpload
                  label="Cover Image"
                  value={form.coverImage}
                  onChange={(v) => setForm((f) => ({ ...f, coverImage: v as string }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <ImageUpload
                  label="Gallery Images (up to 8)"
                  value={form.galleryImages}
                  onChange={(v) => setForm((f) => ({ ...f, galleryImages: v as string[] }))}
                  multiple
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* UPI Payment Settings */}
          {isEdit && (
            <TabsContent value="payment" className="mt-3">
              <UpiSettingsCard
                entityType="hotel"
                entityId={parseInt(params.id as string, 10)}
                currentUpiId={(existingHotel as any)?.upiId ?? null}
                currentQrImage={(existingHotel as any)?.upiQrImage ?? null}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Save button */}
        <div className="flex gap-2 pt-2">
          <Link href="/hotel-owner/hotels" className="flex-1">
            <Button variant="outline" className="w-full" disabled={isSaving}>Cancel</Button>
          </Link>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : isEdit ? "Update Hotel" : "Save as Draft"}
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
}
