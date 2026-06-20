import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Save, AlertTriangle, Globe, Percent, CreditCard, MessageSquare, Scale, Share2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchSettings() {
  const res = await fetch(`${BASE}/api/platform-settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

async function saveSettings(data: Record<string, any>) {
  const res = await fetch(`${BASE}/api/platform-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save"); }
  return res.json();
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SaveButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={isPending} className="bg-primary">
      {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
      Save Changes
    </Button>
  );
}

export default function PlatformSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["platform-settings"], queryFn: fetchSettings });

  const [general, setGeneral] = useState({ appName: "Easy Agra", logo: "", contactEmail: "", supportEmail: "", contactNumber: "", officeAddress: "" });
  const [social, setSocial] = useState({ facebookUrl: "", instagramUrl: "", youtubeUrl: "", twitterUrl: "" });
  const [commission, setCommission] = useState({ hotelCommissionPct: "10", restaurantCommissionPct: "10", spaCommissionPct: "10" });
  const [payment, setPayment] = useState({ paymentMode: "razorpay", razorpayKeyId: "", razorpayKeySecret: "", razorpayWebhookSecret: "", refundPolicy: "" });
  const [templates, setTemplates] = useState({ whatsappTemplate: "", smsTemplate: "", emailTemplate: "" });
  const [legal, setLegal] = useState({ termsAndConditions: "", privacyPolicy: "", maintenanceMode: false });

  useEffect(() => {
    if (!data) return;
    setGeneral({ appName: data.appName ?? "Easy Agra", logo: data.logo ?? "", contactEmail: data.contactEmail ?? "", supportEmail: data.supportEmail ?? "", contactNumber: data.contactNumber ?? "", officeAddress: data.officeAddress ?? "" });
    setSocial({ facebookUrl: data.facebookUrl ?? "", instagramUrl: data.instagramUrl ?? "", youtubeUrl: data.youtubeUrl ?? "", twitterUrl: data.twitterUrl ?? "" });
    setCommission({ hotelCommissionPct: data.hotelCommissionPct ?? "10", restaurantCommissionPct: data.restaurantCommissionPct ?? "10", spaCommissionPct: data.spaCommissionPct ?? "10" });
    setPayment({ paymentMode: data.paymentMode ?? "razorpay", razorpayKeyId: data.razorpayKeyId ?? "", razorpayKeySecret: data.razorpayKeySecret ?? "", razorpayWebhookSecret: data.razorpayWebhookSecret ?? "", refundPolicy: data.refundPolicy ?? "" });
    setTemplates({ whatsappTemplate: data.whatsappTemplate ?? "", smsTemplate: data.smsTemplate ?? "", emailTemplate: data.emailTemplate ?? "" });
    setLegal({ termsAndConditions: data.termsAndConditions ?? "", privacyPolicy: data.privacyPolicy ?? "", maintenanceMode: data.maintenanceMode ?? false });
  }, [data]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Settings saved", description: "Platform settings updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSecret = (key: string) => setShowSecrets(p => ({ ...p, [key]: !p[key] }));

  const handleLegalSave = () => {
    if (legal.maintenanceMode && !data?.maintenanceMode) {
      setMaintenanceConfirm(true);
    } else {
      mutation.mutate(legal);
    }
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure global platform behaviour, integrations, and system settings</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6 h-auto gap-1">
            <TabsTrigger value="general" className="flex items-center gap-1 text-xs py-2"><Globe className="h-3.5 w-3.5" />General</TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-1 text-xs py-2"><Share2 className="h-3.5 w-3.5" />Social</TabsTrigger>
            <TabsTrigger value="commission" className="flex items-center gap-1 text-xs py-2"><Percent className="h-3.5 w-3.5" />Commission</TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1 text-xs py-2"><CreditCard className="h-3.5 w-3.5" />Payment</TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-1 text-xs py-2"><MessageSquare className="h-3.5 w-3.5" />Templates</TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-1 text-xs py-2"><Scale className="h-3.5 w-3.5" />Legal</TabsTrigger>
          </TabsList>

          {/* GENERAL TAB */}
          <TabsContent value="general">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />General Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label="App Name"><Input value={general.appName} onChange={e => setGeneral(g => ({ ...g, appName: e.target.value }))} placeholder="Easy Agra" /></FieldRow>
                <FieldRow label="Logo URL" hint="Full URL to your logo image (PNG or SVG recommended)"><Input value={general.logo} onChange={e => setGeneral(g => ({ ...g, logo: e.target.value }))} placeholder="https://..." /></FieldRow>
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Contact Email"><Input type="email" value={general.contactEmail} onChange={e => setGeneral(g => ({ ...g, contactEmail: e.target.value }))} placeholder="contact@easyagra.com" /></FieldRow>
                  <FieldRow label="Support Email"><Input type="email" value={general.supportEmail} onChange={e => setGeneral(g => ({ ...g, supportEmail: e.target.value }))} placeholder="support@easyagra.com" /></FieldRow>
                </div>
                <FieldRow label="Contact Number"><Input value={general.contactNumber} onChange={e => setGeneral(g => ({ ...g, contactNumber: e.target.value }))} placeholder="+91 98765 43210" /></FieldRow>
                <FieldRow label="Office Address"><Textarea rows={3} value={general.officeAddress} onChange={e => setGeneral(g => ({ ...g, officeAddress: e.target.value }))} placeholder="123 Taj Road, Agra, UP - 282001" /></FieldRow>
                <div className="flex justify-end">
                  <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate(general)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SOCIAL TAB */}
          <TabsContent value="social">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4" />Social Media Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label="Facebook URL"><Input value={social.facebookUrl} onChange={e => setSocial(s => ({ ...s, facebookUrl: e.target.value }))} placeholder="https://facebook.com/easyagra" /></FieldRow>
                <FieldRow label="Instagram URL"><Input value={social.instagramUrl} onChange={e => setSocial(s => ({ ...s, instagramUrl: e.target.value }))} placeholder="https://instagram.com/easyagra" /></FieldRow>
                <FieldRow label="YouTube URL"><Input value={social.youtubeUrl} onChange={e => setSocial(s => ({ ...s, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/@easyagra" /></FieldRow>
                <FieldRow label="Twitter / X URL"><Input value={social.twitterUrl} onChange={e => setSocial(s => ({ ...s, twitterUrl: e.target.value }))} placeholder="https://x.com/easyagra" /></FieldRow>
                <div className="flex justify-end">
                  <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate(social)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMMISSION TAB */}
          <TabsContent value="commission">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" />Commission Rates</CardTitle>
                <p className="text-xs text-muted-foreground">Set the platform commission percentage deducted from each booking</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FieldRow label="Hotel Commission (%)" hint="e.g. 10 = 10%">
                    <Input type="number" min="0" max="100" step="0.5" value={commission.hotelCommissionPct} onChange={e => setCommission(c => ({ ...c, hotelCommissionPct: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Restaurant Commission (%)" hint="e.g. 10 = 10%">
                    <Input type="number" min="0" max="100" step="0.5" value={commission.restaurantCommissionPct} onChange={e => setCommission(c => ({ ...c, restaurantCommissionPct: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Spa Commission (%)" hint="e.g. 10 = 10%">
                    <Input type="number" min="0" max="100" step="0.5" value={commission.spaCommissionPct} onChange={e => setCommission(c => ({ ...c, spaCommissionPct: e.target.value }))} />
                  </FieldRow>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  Commission changes apply to <strong>new bookings only</strong>. Existing bookings retain the commission rate at the time of booking.
                </div>
                <div className="flex justify-end">
                  <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate(commission)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYMENT TAB */}
          <TabsContent value="payment">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment Gateway</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label="Payment Mode">
                  <Select value={payment.paymentMode} onValueChange={v => setPayment(p => ({ ...p, paymentMode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="razorpay">Razorpay</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="manual">Manual / Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                {payment.paymentMode === "razorpay" && (
                  <>
                    <FieldRow label="Razorpay Key ID">
                      <Input value={payment.razorpayKeyId} onChange={e => setPayment(p => ({ ...p, razorpayKeyId: e.target.value }))} placeholder="rzp_live_..." />
                    </FieldRow>
                    <FieldRow label="Razorpay Key Secret">
                      <div className="relative">
                        <Input type={showSecrets["rzpSecret"] ? "text" : "password"} value={payment.razorpayKeySecret} onChange={e => setPayment(p => ({ ...p, razorpayKeySecret: e.target.value }))} placeholder="••••••••••••" className="pr-10" />
                        <button type="button" onClick={() => toggleSecret("rzpSecret")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecrets["rzpSecret"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FieldRow>
                    <FieldRow label="Webhook Secret">
                      <div className="relative">
                        <Input type={showSecrets["webhook"] ? "text" : "password"} value={payment.razorpayWebhookSecret} onChange={e => setPayment(p => ({ ...p, razorpayWebhookSecret: e.target.value }))} placeholder="••••••••••••" className="pr-10" />
                        <button type="button" onClick={() => toggleSecret("webhook")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecrets["webhook"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FieldRow>
                  </>
                )}
                <FieldRow label="Refund Policy" hint="Shown to customers during cancellation">
                  <Textarea rows={4} value={payment.refundPolicy} onChange={e => setPayment(p => ({ ...p, refundPolicy: e.target.value }))} placeholder="Full refund if cancelled 48h before check-in..." />
                </FieldRow>
                <div className="flex justify-end">
                  <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate(payment)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Notification Templates</CardTitle>
                <p className="text-xs text-muted-foreground">Use {`{name}`}, {`{booking_id}`}, {`{amount}`}, {`{date}`} as placeholders</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label="WhatsApp Template" hint="Sent on booking confirmation via WhatsApp API">
                  <Textarea rows={4} value={templates.whatsappTemplate} onChange={e => setTemplates(t => ({ ...t, whatsappTemplate: e.target.value }))} placeholder={"Hi {name}! Your booking #{booking_id} is confirmed for {date}. Amount: ₹{amount}."} />
                </FieldRow>
                <FieldRow label="SMS Template" hint="Sent via SMS gateway">
                  <Textarea rows={3} value={templates.smsTemplate} onChange={e => setTemplates(t => ({ ...t, smsTemplate: e.target.value }))} placeholder={"EasyAgra: Booking #{booking_id} confirmed. Check-in: {date}."} />
                </FieldRow>
                <FieldRow label="Email Template Header" hint="Shown at the top of booking confirmation emails">
                  <Textarea rows={4} value={templates.emailTemplate} onChange={e => setTemplates(t => ({ ...t, emailTemplate: e.target.value }))} placeholder={"Dear {name},\n\nThank you for your booking with Easy Agra!"} />
                </FieldRow>
                <div className="flex justify-end">
                  <SaveButton isPending={mutation.isPending} onClick={() => mutation.mutate(templates)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEGAL TAB */}
          <TabsContent value="legal">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" />Legal Documents</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FieldRow label="Terms & Conditions" hint="Full text or URL to T&C document">
                    <Textarea rows={5} value={legal.termsAndConditions} onChange={e => setLegal(l => ({ ...l, termsAndConditions: e.target.value }))} placeholder="Enter terms and conditions text or a URL (https://...)" />
                  </FieldRow>
                  <FieldRow label="Privacy Policy" hint="Full text or URL to privacy policy document">
                    <Textarea rows={5} value={legal.privacyPolicy} onChange={e => setLegal(l => ({ ...l, privacyPolicy: e.target.value }))} placeholder="Enter privacy policy text or a URL (https://...)" />
                  </FieldRow>
                </CardContent>
              </Card>

              <Card className={legal.maintenanceMode ? "border-orange-300 bg-orange-50/50" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />Maintenance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable maintenance mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">All non-super-admin users will see a maintenance page</p>
                    </div>
                    <Switch checked={legal.maintenanceMode} onCheckedChange={v => setLegal(l => ({ ...l, maintenanceMode: v }))} />
                  </div>
                  {legal.maintenanceMode && (
                    <div className="rounded-lg bg-orange-100 border border-orange-300 p-3 text-sm text-orange-800">
                      <strong>Warning:</strong> Enabling maintenance mode will prevent all non-super-admin users from accessing the platform.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <SaveButton isPending={mutation.isPending} onClick={handleLegalSave} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={maintenanceConfirm} onOpenChange={setMaintenanceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Maintenance Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent all non-super-admin users from accessing the platform. Are you sure you want to enable maintenance mode?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLegal(l => ({ ...l, maintenanceMode: false }))}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { mutation.mutate(legal); setMaintenanceConfirm(false); }} className="bg-orange-600 hover:bg-orange-700">Yes, Enable Maintenance</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
