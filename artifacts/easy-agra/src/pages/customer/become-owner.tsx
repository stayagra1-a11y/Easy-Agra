import { useState, useRef } from "react";
import {
  useSubmitOwnerRequest,
  useGetMyOwnerRequest,
  useUpdateOwnerRequest,
  useCancelOwnerRequest,
  getGetMyOwnerRequestQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Building2, UtensilsCrossed, Sparkles, Clock, CheckCircle2, XCircle, Loader2,
  Camera, FileText, MapPin, User, Phone, Mail, ChevronRight, ChevronLeft,
  Edit3, Trash2, RefreshCw, Upload, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = ["Business Type", "Business Info", "Contact Info", "Documents"];

const roleCards = [
  { value: "hotel_owner", label: "Hotel Owner", icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-200", desc: "List your hotel, guesthouse, or homestay" },
  { value: "restaurant_owner", label: "Restaurant Owner", icon: UtensilsCrossed, color: "text-orange-600 bg-orange-50 border-orange-200", desc: "List your restaurant, café, or dhaba" },
  { value: "spa_owner", label: "Spa Owner", icon: Sparkles, color: "text-purple-600 bg-purple-50 border-purple-200", desc: "List your spa, salon, or wellness center" },
];

const statusConfig: Record<string, { icon: any; color: string; title: string; desc: string }> = {
  pending: {
    icon: <Clock className="h-12 w-12 text-yellow-500" />,
    color: "border-yellow-300 bg-yellow-50",
    title: "Application Under Review",
    desc: "Our team is carefully reviewing your application. You'll receive a notification once a decision is made.",
  },
  approved: {
    icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
    color: "border-green-300 bg-green-50",
    title: "Application Approved! 🎉",
    desc: "Congratulations! Your owner request has been approved and your role has been upgraded.",
  },
  rejected: {
    icon: <XCircle className="h-12 w-12 text-red-500" />,
    color: "border-red-300 bg-red-50",
    title: "Application Not Approved",
    desc: "Your request was reviewed but not approved this time. Please check the reason below.",
  },
};

async function fileToBase64(file: File): Promise<string> {
  const { uploadToCloudinary } = await import("@/lib/cloudinary");
  return uploadToCloudinary(file);
}

interface FormState {
  requestedRole: string;
  businessName: string;
  businessDescription: string;
  businessAddress: string;
  city: string;
  state: string;
  gstNumber: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  businessPhotos: string[];
  identityProof: string;
}

const emptyForm: FormState = {
  requestedRole: "",
  businessName: "",
  businessDescription: "",
  businessAddress: "",
  city: "",
  state: "",
  gstNumber: "",
  ownerName: "",
  ownerMobile: "",
  ownerEmail: "",
  businessPhotos: [],
  identityProof: "",
};

export default function BecomeOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const photoRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const { data: existingRequest, isLoading: loadingRequest } = useGetMyOwnerRequest({
    query: { retry: false, queryKey: getGetMyOwnerRequestQueryKey() },
  });

  const submitMutation = useSubmitOwnerRequest();
  const updateMutation = useUpdateOwnerRequest();
  const cancelMutation = useCancelOwnerRequest();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FormState>>({});
  const [showCancel, setShowCancel] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const setField = (key: keyof FormState, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const setEditField = (key: keyof FormState, val: any) =>
    setEditForm(f => ({ ...f, [key]: val }));

  const handlePhotoUpload = async (files: FileList | null, forEdit = false) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const base64s = await Promise.all(Array.from(files).slice(0, 5).map(fileToBase64));
      if (forEdit) {
        setEditForm(f => ({ ...f, businessPhotos: [...(f.businessPhotos || existingRequest?.businessPhotos || []), ...base64s].slice(0, 5) }));
      } else {
        setForm(f => ({ ...f, businessPhotos: [...f.businessPhotos, ...base64s].slice(0, 5) }));
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleProofUpload = async (files: FileList | null, forEdit = false) => {
    if (!files || files.length === 0) return;
    setUploadingProof(true);
    try {
      const base64 = await fileToBase64(files[0]);
      if (forEdit) setEditForm(f => ({ ...f, identityProof: base64 }));
      else setField("identityProof", base64);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.requestedRole) {
      toast({ title: "Select business type", variant: "destructive" });
      setStep(0);
      return;
    }
    try {
      await submitMutation.mutateAsync({ data: form as any });
      queryClient.invalidateQueries({ queryKey: getGetMyOwnerRequestQueryKey() });
      toast({ title: "Application submitted!", description: "We'll review your application and notify you shortly." });
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Failed to submit";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!existingRequest) return;
    try {
      await updateMutation.mutateAsync({ id: existingRequest.id, data: editForm as any });
      queryClient.invalidateQueries({ queryKey: getGetMyOwnerRequestQueryKey() });
      setEditMode(false);
      toast({ title: "Application updated!" });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!existingRequest) return;
    try {
      await cancelMutation.mutateAsync({ id: existingRequest.id });
      queryClient.invalidateQueries({ queryKey: getGetMyOwnerRequestQueryKey() });
      setShowCancel(false);
      setStep(0);
      setForm(emptyForm);
      toast({ title: "Application cancelled" });
    } catch {
      toast({ title: "Error", description: "Failed to cancel", variant: "destructive" });
    }
  };

  const canGoNext = () => {
    if (step === 0) return !!form.requestedRole;
    if (step === 1) return !!form.businessName.trim();
    return true;
  };

  if (loadingRequest) {
    return <CustomerLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></CustomerLayout>;
  }

  // ── Existing request view ──────────────────────────────────────────────────
  if (existingRequest && !editMode) {
    const config = statusConfig[existingRequest.status];
    const roleLabel = existingRequest.requestedRole?.replace(/_/g, " ");
    const photos = existingRequest.businessPhotos as string[] | null;

    return (
      <CustomerLayout>
        <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Owner Application</h1>

          {/* Status card */}
          <Card className={`border-2 ${config.color}`}>
            <CardContent className="pt-5 text-center">
              <div className="flex justify-center mb-3">{config.icon}</div>
              <h2 className="font-bold text-lg mb-1">{config.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">{config.desc}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge className={
                  existingRequest.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  existingRequest.status === "approved" ? "bg-green-100 text-green-700" :
                  "bg-red-100 text-red-700"
                } variant="secondary">{existingRequest.status}</Badge>
                <Badge variant="outline" className="capitalize">{roleLabel}</Badge>
              </div>
              {existingRequest.status === "rejected" && existingRequest.rejectionReason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-left">
                  <strong>Reason:</strong> {existingRequest.rejectionReason}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application details */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Application Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {existingRequest.businessName && (
                <div>
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="font-medium">{existingRequest.businessName}</p>
                </div>
              )}
              {(existingRequest.businessAddress || existingRequest.city) && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{[existingRequest.businessAddress, existingRequest.city, existingRequest.state].filter(Boolean).join(", ")}</p>
                </div>
              )}
              {existingRequest.businessDescription && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-muted-foreground">{existingRequest.businessDescription}</p>
                </div>
              )}
              {existingRequest.gstNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">GST Number</p>
                  <p className="font-mono font-medium">{existingRequest.gstNumber}</p>
                </div>
              )}
              {photos && photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Business Photos</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map((p, i) => (
                      <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    ))}
                  </div>
                </div>
              )}
              {existingRequest.identityProof && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-2.5">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="text-sm">Identity proof uploaded</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Submitted: {new Date(existingRequest.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
            </CardContent>
          </Card>

          {/* Actions */}
          {existingRequest.status === "pending" && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditForm({}); setEditMode(true); }}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit Application
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setShowCancel(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Cancel
              </Button>
            </div>
          )}
        </div>

        <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Application?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently cancel your owner request. You can submit a new one afterwards.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Application</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Cancel Application
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CustomerLayout>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (existingRequest && editMode) {
    const currentPhotos = (editForm.businessPhotos ?? existingRequest.businessPhotos ?? []) as string[];

    return (
      <CustomerLayout>
        <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditMode(false)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Edit Application</h1>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={editForm.businessName ?? existingRequest.businessName ?? ""} onChange={e => setEditField("businessName", e.target.value)} placeholder="Your business name" />
              </div>
              <div className="space-y-1.5">
                <Label>Business Address</Label>
                <Input value={editForm.businessAddress ?? existingRequest.businessAddress ?? ""} onChange={e => setEditField("businessAddress", e.target.value)} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={editForm.city ?? existingRequest.city ?? ""} onChange={e => setEditField("city", e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={editForm.state ?? existingRequest.state ?? ""} onChange={e => setEditField("state", e.target.value)} placeholder="State" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editForm.businessDescription ?? existingRequest.businessDescription ?? ""} onChange={e => setEditField("businessDescription", e.target.value)} rows={3} placeholder="Describe your business..." />
              </div>
              <div className="space-y-1.5">
                <Label>Owner Name</Label>
                <Input value={editForm.ownerName ?? existingRequest.ownerName ?? ""} onChange={e => setEditField("ownerName", e.target.value)} placeholder="Your full name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Mobile</Label>
                  <Input value={editForm.ownerMobile ?? existingRequest.ownerMobile ?? ""} onChange={e => setEditField("ownerMobile", e.target.value)} placeholder="10-digit mobile" />
                </div>
                <div className="space-y-1.5">
                  <Label>GST Number</Label>
                  <Input value={editForm.gstNumber ?? existingRequest.gstNumber ?? ""} onChange={e => setEditField("gstNumber", e.target.value)} placeholder="Optional" />
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-1.5">
                <Label>Business Photos</Label>
                <div className="grid grid-cols-4 gap-2">
                  {currentPhotos.map((p, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center"
                        onClick={() => setEditForm(f => ({ ...f, businessPhotos: currentPhotos.filter((_, j) => j !== i) }))}
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {currentPhotos.length < 5 && (
                    <button type="button" onClick={() => photoRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      {uploadingPhotos ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    </button>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e.target.files, true)} />
              </div>

              {/* Identity proof */}
              <div className="space-y-1.5">
                <Label>Identity Proof</Label>
                {(editForm.identityProof || existingRequest.identityProof) ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-sm">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="flex-1 text-green-700">Document uploaded</span>
                    <button type="button" onClick={() => { setEditForm(f => ({ ...f, identityProof: "" })); if (proofRef.current) proofRef.current.value = ""; }}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => proofRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm">
                    {uploadingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload ID Proof (Aadhar, PAN, etc.)
                  </button>
                )}
                <input ref={proofRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleProofUpload(e.target.files, true)} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary" onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  // ── New application form ───────────────────────────────────────────────────
  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Become an Owner</h1>
          <p className="text-sm text-muted-foreground mt-1">List your business on Easy Agra and reach thousands of visitors.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}: <span className="font-medium text-foreground">{STEPS[step]}</span></p>

        {/* Step 0: Business Type */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">What type of business do you own?</p>
            <div className="space-y-2.5">
              {roleCards.map(({ value, label, icon: Icon, color, desc }) => (
                <button key={value} type="button" onClick={() => setField("requestedRole", value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.requestedRole === value ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"}`}>
                  <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center shrink-0 border`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {form.requestedRole === value && <CheckCircle2 className="h-5 w-5 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.businessName} onChange={e => setField("businessName", e.target.value)} placeholder="e.g. Taj View Hotel, Spice Garden Restaurant" />
              </div>
              <div className="space-y-1.5">
                <Label>Business Address *</Label>
                <Input value={form.businessAddress} onChange={e => setField("businessAddress", e.target.value)} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input value={form.city} onChange={e => setField("city", e.target.value)} placeholder="e.g. Agra" />
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Input value={form.state} onChange={e => setField("state", e.target.value)} placeholder="e.g. Uttar Pradesh" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>About Your Business</Label>
                <Textarea value={form.businessDescription} onChange={e => setField("businessDescription", e.target.value)} rows={3} placeholder="Describe your business, location, and what makes it special..." />
              </div>
              <div className="space-y-1.5">
                <Label>GST Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Input value={form.gstNumber} onChange={e => setField("gstNumber", e.target.value)} placeholder="e.g. 09ABCDE1234F1Z5" className="font-mono" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Owner Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">These details may differ from your account information.</p>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Full Name</Label>
                <Input value={form.ownerName} onChange={e => setField("ownerName", e.target.value)} placeholder="Owner's full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Mobile Number</Label>
                <Input value={form.ownerMobile} onChange={e => setField("ownerMobile", e.target.value)} placeholder="+91 9876543210" type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
                <Input value={form.ownerEmail} onChange={e => setField("ownerEmail", e.target.value)} placeholder="business@email.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Business City</Label>
                <Input value={form.city || "Agra"} onChange={e => setField("city", e.target.value)} placeholder="City" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Business photos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> Business Photos
                  <span className="text-xs font-normal text-muted-foreground ml-auto">Up to 5 photos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {form.businessPhotos.map((p, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg border" />
                      <button type="button" className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center shadow"
                        onClick={() => setField("businessPhotos", form.businessPhotos.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {form.businessPhotos.length < 5 && (
                    <button type="button" onClick={() => photoRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      {uploadingPhotos ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><span className="text-xs">Add</span></>}
                    </button>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e.target.files)} />
                <p className="text-xs text-muted-foreground">Upload photos of your storefront, interior, or menu</p>
              </CardContent>
            </Card>

            {/* Identity proof */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Identity Proof
                  <span className="text-xs font-normal text-muted-foreground ml-auto">Optional</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {form.identityProof ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700">Document uploaded</p>
                      <p className="text-xs text-green-600">Aadhar / PAN / Passport</p>
                    </div>
                    <button type="button" onClick={() => { setField("identityProof", ""); if (proofRef.current) proofRef.current.value = ""; }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => proofRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {uploadingProof ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    <span className="text-sm font-medium">Upload ID Proof</span>
                    <span className="text-xs">Aadhar Card, PAN Card, Passport</span>
                  </button>
                )}
                <input ref={proofRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleProofUpload(e.target.files)} />
              </CardContent>
            </Card>

            {/* Review summary */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Application Summary</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">Type:</span> {form.requestedRole.replace(/_/g, " ")}</p>
                <p><span className="font-medium text-foreground">Business:</span> {form.businessName || "—"}</p>
                <p><span className="font-medium text-foreground">Location:</span> {[form.city, form.state].filter(Boolean).join(", ") || "—"}</p>
                {form.ownerName && <p><span className="font-medium text-foreground">Owner:</span> {form.ownerName}</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-2 pt-1">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1 bg-primary" disabled={!canGoNext()} onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1 bg-primary" onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
