import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  useCreatePayment,
  useInitiatePayment,
  useConfirmPayment,
  useFailPayment,
  useValidateCoupon,
} from "@workspace/api-client-react";
import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  IndianRupee,
  Receipt,
  Shield,
  ChevronRight,
  Tag,
  X,
  QrCode,
  Copy,
  Check,
} from "lucide-react";

export type BookingType = "hotel" | "restaurant" | "spa";
export type PaymentMode = "full" | "advance";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (paymentRef: string) => void;
  bookingType: BookingType;
  bookingId: number;
  bookingRef: string;
  ownerId: number;
  amount: number;
  advanceAmount?: number;
  label?: string;
  ownerUpiId?: string | null;
  ownerUpiQrImage?: string | null;
}

const PAYMENT_METHODS = [
  {
    id: "upi",
    label: "UPI",
    icon: Smartphone,
    desc: "Google Pay, PhonePe, Paytm",
    badge: "Instant",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    id: "credit_card",
    label: "Credit Card",
    icon: CreditCard,
    desc: "Visa, Mastercard, RuPay",
    badge: null,
    badgeColor: "",
  },
  {
    id: "debit_card",
    label: "Debit Card",
    icon: CreditCard,
    desc: "All major bank cards",
    badge: null,
    badgeColor: "",
  },
  {
    id: "net_banking",
    label: "Net Banking",
    icon: Building2,
    desc: "All major banks supported",
    badge: null,
    badgeColor: "",
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
    desc: "Paytm, Mobikwik, Freecharge",
    badge: null,
    badgeColor: "",
  },
] as const;

type Step = "mode" | "method" | "upi_qr" | "processing" | "success" | "failed";

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

interface AppliedCoupon {
  code: string;
  name: string;
  discountAmount: number;
}

export function PaymentModal({
  open,
  onClose,
  onSuccess,
  bookingType,
  bookingId,
  bookingRef,
  ownerId,
  amount,
  advanceAmount,
  label,
  ownerUpiId,
  ownerUpiQrImage,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("mode");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [resultRef, setResultRef] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [utrError, setUtrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const createPayment = useCreatePayment();
  const initiatePayment = useInitiatePayment();
  const confirmPayment = useConfirmPayment();
  const failPayment = useFailPayment();
  const validateCoupon = useValidateCoupon();

  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const discountedAmount = Math.max(0, amount - discountAmount);
  const discountedAdvanceAmount = advanceAmount
    ? Math.max(0, advanceAmount - discountAmount)
    : undefined;

  const basePayable =
    paymentMode === "advance" && discountedAdvanceAmount != null
      ? discountedAdvanceAmount
      : discountedAmount;

  const handleClose = () => {
    setStep("mode");
    setPaymentMode("full");
    setSelectedMethod(null);
    setPaymentRef(null);
    setResultRef(null);
    setCouponInput("");
    setCouponError(null);
    setAppliedCoupon(null);
    setUtrNumber("");
    setUtrError(null);
    setCopied(false);
    onClose();
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError(null);

    try {
      const result = await validateCoupon.mutateAsync({
        data: { code, bookingType, amount },
      });
      setAppliedCoupon({
        code: result.coupon.code,
        name: result.coupon.name,
        discountAmount: result.discountAmount,
      });
      setCouponInput("");
      toast({ title: "Coupon applied!", description: `${result.coupon.name} — saving ${fmtCurrency(result.discountAmount)}` });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Invalid coupon code";
      setCouponError(msg);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  };

  const handleSelectMode = (mode: PaymentMode) => {
    setPaymentMode(mode);
    setStep("method");
  };

  const handleCopyUpiId = () => {
    if (!ownerUpiId) return;
    navigator.clipboard.writeText(ownerUpiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // When Pay is clicked on the method step
  const handlePay = () => {
    if (!selectedMethod) return;
    // If UPI is selected and owner has UPI set up, show QR step
    if (selectedMethod === "upi" && ownerUpiId) {
      setStep("upi_qr");
    } else {
      processPayment(null, null);
    }
  };

  // Confirm UPI payment after customer enters UTR
  const handleUpiConfirm = () => {
    const utr = utrNumber.trim();
    if (!utr) { setUtrError("Please enter the UTR / transaction reference number"); return; }
    if (utr.length < 8) { setUtrError("UTR number should be at least 8 characters"); return; }
    setUtrError(null);
    processPayment(utr, ownerUpiId ?? null);
  };

  const processPayment = async (utr: string | null, upiId: string | null) => {
    setStep("processing");

    try {
      const created = await createPayment.mutateAsync({
        data: {
          bookingType,
          bookingId,
          bookingRef,
          ownerId,
          amount: amount,
          paymentMode,
          couponCode: appliedCoupon?.code ?? undefined,
        },
      });
      const ref = created.paymentRef;
      setPaymentRef(ref);

      await initiatePayment.mutateAsync({
        ref,
        data: { paymentMethod: selectedMethod as any, paymentGateway: "manual" },
      });

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const confirmed = await confirmPayment.mutateAsync({
        ref,
        data: {
          paidAmount: basePayable,
          utrNumber: utr ?? undefined,
          ownerUpiId: upiId ?? undefined,
        },
      });

      setResultRef(confirmed.paymentRef);
      setStep("success");
      onSuccess?.(confirmed.paymentRef);
    } catch {
      if (paymentRef) {
        try {
          await failPayment.mutateAsync({
            ref: paymentRef,
            data: { reason: "Payment processing failed" },
          });
        } catch {
          // ignore
        }
      }
      setStep("failed");
    }
  };

  const handleRetry = () => {
    setStep("method");
    setSelectedMethod(null);
    setPaymentRef(null);
    setUtrNumber("");
    setUtrError(null);
  };

  const canShowAdvance = !!advanceAmount && advanceAmount < amount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <IndianRupee className="h-5 w-5" />
            {step === "success"
              ? "Payment Successful"
              : step === "failed"
                ? "Payment Failed"
                : step === "processing"
                  ? "Processing Payment"
                  : step === "upi_qr"
                    ? "Pay via UPI"
                    : "Secure Payment"}
          </DialogTitle>
        </DialogHeader>

        {/* Booking summary — always visible except on result screens */}
        {step !== "success" && step !== "failed" && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{label ?? bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Booking</span>
              <span className="font-medium text-xs text-muted-foreground">{bookingRef}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <div className="text-right">
                {appliedCoupon && (
                  <span className="text-xs line-through text-muted-foreground mr-1">{fmtCurrency(amount)}</span>
                )}
                <span className="font-bold text-primary text-lg">{fmtCurrency(basePayable)}</span>
              </div>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {appliedCoupon.code}</span>
                <span>−{fmtCurrency(appliedCoupon.discountAmount)}</span>
              </div>
            )}
            {paymentMode === "advance" && discountedAdvanceAmount != null && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remaining at property</span>
                <span>{fmtCurrency(discountedAmount - discountedAdvanceAmount)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Mode Selection ── */}
        {step === "mode" && (
          <div className="space-y-3">
            {/* Coupon input */}
            <div className="space-y-2">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Tag className="h-4 w-4" />
                    <div>
                      <span className="text-sm font-medium">{appliedCoupon.code}</span>
                      <p className="text-xs text-emerald-600">{appliedCoupon.name} — saving {fmtCurrency(appliedCoupon.discountAmount)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      className="h-9 text-sm uppercase"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      disabled={!couponInput.trim() || validateCoupon.isPending}
                      onClick={handleApplyCoupon}
                    >
                      {validateCoupon.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-500">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <p className="text-sm text-muted-foreground">How would you like to pay?</p>
            <button
              onClick={() => handleSelectMode("full")}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
            >
              <div>
                <div className="font-semibold text-primary">Pay Full Amount</div>
                <div className="text-sm text-muted-foreground">
                  {appliedCoupon ? (
                    <span>
                      <span className="line-through mr-1">{fmtCurrency(amount)}</span>
                      <span className="text-emerald-600 font-medium">{fmtCurrency(discountedAmount)}</span>
                    </span>
                  ) : fmtCurrency(amount)}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
            {canShowAdvance && (
              <button
                onClick={() => handleSelectMode("advance")}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 bg-amber-50 hover:bg-amber-100 transition-all text-left"
              >
                <div>
                  <div className="font-semibold text-amber-700">Pay Advance Only</div>
                  <div className="text-sm text-amber-600">
                    {fmtCurrency(discountedAdvanceAmount ?? advanceAmount!)} now · {fmtCurrency(discountedAmount - (discountedAdvanceAmount ?? advanceAmount!))} at venue
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-600" />
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Shield className="h-3.5 w-3.5" />
              <span>100% secure · SSL encrypted payment</span>
            </div>
          </div>
        )}

        {/* ── Step: Method Selection ── */}
        {step === "method" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Choose payment method</p>
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.desc}</div>
                  </div>
                  {m.badge && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setStep("mode")}
              >
                Back
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary"
                disabled={!selectedMethod}
                onClick={handlePay}
              >
                Pay {fmtCurrency(basePayable)}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Razorpay / Stripe ready architecture</span>
            </div>
          </div>
        )}

        {/* ── Step: UPI QR ── */}
        {step === "upi_qr" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              {ownerUpiQrImage ? (
                <img
                  src={ownerUpiQrImage}
                  alt="UPI QR Code"
                  className="h-44 w-44 rounded-2xl border-2 border-primary/20 object-contain bg-white p-2"
                />
              ) : (
                <div className="h-44 w-44 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2">
                  <QrCode className="h-12 w-12 text-primary/40" />
                  <span className="text-xs text-muted-foreground">No QR available</span>
                </div>
              )}

              {/* UPI ID */}
              <div className="w-full bg-muted/60 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Pay to UPI ID</p>
                  <p className="font-semibold text-sm font-mono">{ownerUpiId}</p>
                </div>
                <button
                  onClick={handleCopyUpiId}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-background border hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Scan the QR or copy the UPI ID above · open your UPI app and pay{" "}
                <span className="font-semibold text-primary">{fmtCurrency(basePayable)}</span>
              </p>
            </div>

            {/* UTR input */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Transaction / UTR Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 123456789012 or T2506201234"
                value={utrNumber}
                onChange={(e) => { setUtrNumber(e.target.value); setUtrError(null); }}
                className={utrError ? "border-red-500" : ""}
              />
              {utrError && <p className="text-xs text-red-500">{utrError}</p>}
              <p className="text-xs text-muted-foreground">
                After paying, enter the UTR/reference number from your UPI app to confirm
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep("method")}>
                Back
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary gap-1"
                onClick={handleUpiConfirm}
                disabled={!utrNumber.trim()}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Payment
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <IndianRupee className="absolute inset-0 m-auto h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Processing Payment</div>
              <div className="text-sm text-muted-foreground mt-1">
                Please do not close this window…
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label} ·{" "}
              {fmtCurrency(basePayable)}
            </div>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <div className="text-center">
              <div className="font-bold text-lg text-emerald-700">Payment Successful!</div>
              <div className="text-sm text-muted-foreground mt-1">
                {fmtCurrency(basePayable)} paid via{" "}
                {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 w-full text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking Ref</span>
                <span className="font-medium">{bookingRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Ref</span>
                <span className="font-mono text-xs font-medium">{resultRef ?? paymentRef}</span>
              </div>
              {utrNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UTR Number</span>
                  <span className="font-mono text-xs font-medium">{utrNumber}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Coupon</span>
                  <span>−{fmtCurrency(appliedCoupon.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-emerald-700">{fmtCurrency(basePayable)}</span>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleClose}>
                <Receipt className="h-4 w-4" /> View Receipts
              </Button>
              <Button size="sm" className="flex-1 bg-primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Failed ── */}
        {step === "failed" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <div className="text-center">
              <div className="font-bold text-lg text-red-700">Payment Failed</div>
              <div className="text-sm text-muted-foreground mt-1">
                Something went wrong. Please try again.
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-primary" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
