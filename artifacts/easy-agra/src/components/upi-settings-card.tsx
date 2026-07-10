import { useState } from "react";
import { getApiBase } from "@/lib/api-base";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, IndianRupee, CheckCircle2, Upload, X } from "lucide-react";

const BASE = getApiBase();

interface UpiSettingsCardProps {
  entityType: "hotel" | "restaurant" | "spa";
  entityId: number;
  currentUpiId?: string | null;
  currentQrImage?: string | null;
  onSaved?: () => void;
}

export function UpiSettingsCard({ entityType, entityId, currentUpiId, currentQrImage, onSaved }: UpiSettingsCardProps) {
  const { toast } = useToast();
  const [upiId, setUpiId] = useState(currentUpiId ?? "");
  const [qrPreview, setQrPreview] = useState<string | null>(currentQrImage ?? null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const endpoint = entityType === "hotel"
    ? `${BASE}/api/hotels/${entityId}/upi`
    : entityType === "restaurant"
    ? `${BASE}/api/restaurants/${entityId}/upi`
    : `${BASE}/api/spas/${entityId}/upi`;

  const handleQrChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrFile(file);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const url = await uploadToCloudinary(file);
      setQrPreview(url);
    } catch {
      toast({ title: "QR upload failed", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!upiId.trim()) { toast({ title: "UPI ID is required", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const qrImageUrl = qrPreview;

      const res = await fetch(endpoint, {
        method: "PATCH",

        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ upiId: upiId.trim(), upiQrImage: qrImageUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      toast({ title: "UPI settings saved!", description: `Customers can now pay via ${upiId}` });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          UPI Payment Settings
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Add your UPI ID so customers can pay you directly. They'll see this QR & ID at checkout.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* UPI ID input */}
        <div className="space-y-1.5">
          <Label>Your UPI ID</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="yourname@upi or 9876543210@ybl"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">Works with GPay, PhonePe, Paytm, and any UPI app</p>
        </div>

        {/* QR Code */}
        <div className="space-y-1.5">
          <Label>QR Code (optional)</Label>
          {qrPreview ? (
            <div className="relative inline-block">
              <img src={qrPreview} alt="QR Code" className="h-32 w-32 rounded-xl border object-contain bg-white p-1" />
              <button
                onClick={() => { setQrPreview(null); setQrFile(null); }}
                className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-white rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 w-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <QrCode className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <span className="text-xs text-muted-foreground">Upload QR</span>
              <input type="file" accept="image/*" onChange={handleQrChange} className="hidden" />
            </label>
          )}
          <p className="text-xs text-muted-foreground">Upload your UPI QR code image so customers can scan it</p>
        </div>

        {/* Preview */}
        {upiId && (
          <div className="bg-muted/50 rounded-xl p-3 border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Customer will see:</p>
            <div className="flex items-center gap-3">
              {qrPreview && <img src={qrPreview} alt="QR" className="h-12 w-12 rounded-lg border object-contain bg-white" />}
              <div>
                <p className="text-sm font-semibold">{upiId}</p>
                <p className="text-xs text-muted-foreground">Pay via any UPI app</p>
              </div>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !upiId.trim()} className="w-full gap-2 bg-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save UPI Settings
        </Button>
      </CardContent>
    </Card>
  );
}
