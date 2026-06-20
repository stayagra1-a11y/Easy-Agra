import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  useCreatePayment,
  useInitiatePayment,
  useConfirmPayment,
  useFailPayment,
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

type Step = "mode" | "method" | "processing" | "success" | "failed";

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
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
}: PaymentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("mode");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [resultRef, setResultRef] = useState<string | null>(null);

  const createPayment = useCreatePayment();
  const initiatePayment = useInitiatePayment();
  const confirmPayment = useConfirmPayment();
  const failPayment = useFailPayment();

  const payableAmount =
    paymentMode === "advance" && advanceAmount ? advanceAmount : amount;

  const handleClose = () => {
    setStep("mode");
    setPaymentMode("full");
    setSelectedMethod(null);
    setPaymentRef(null);
    setResultRef(null);
    onClose();
  };

  const handleSelectMode = (mode: PaymentMode) => {
    setPaymentMode(mode);
    setStep("method");
  };

  const handlePay = async () => {
    if (!selectedMethod) return;
    setStep("processing");

    try {
      // Step 1: Create payment record
      const created = await createPayment.mutateAsync({
        data: {
          bookingType,
          bookingId,
          bookingRef,
          ownerId,
          amount: payableAmount,
          paymentMode,
        },
      });
      const ref = created.paymentRef;
      setPaymentRef(ref);

      // Step 2: Initiate (simulate gateway)
      await initiatePayment.mutateAsync({
        ref,
        data: { paymentMethod: selectedMethod as any, paymentGateway: "manual" },
      });

      // Step 3: Simulate processing delay (1.5s)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 4: Confirm payment
      const confirmed = await confirmPayment.mutateAsync({
        ref,
        data: { paidAmount: payableAmount },
      });

      setResultRef(confirmed.paymentRef);
      setStep("success");
      onSuccess?.(confirmed.paymentRef);
    } catch {
      // Mark payment as failed if we have a ref
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
              <span className="font-bold text-primary text-lg">{fmtCurrency(payableAmount)}</span>
            </div>
            {paymentMode === "advance" && advanceAmount && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Remaining at property</span>
                <span>{fmtCurrency(amount - advanceAmount)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Mode Selection ── */}
        {step === "mode" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">How would you like to pay?</p>
            <button
              onClick={() => handleSelectMode("full")}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
            >
              <div>
                <div className="font-semibold text-primary">Pay Full Amount</div>
                <div className="text-sm text-muted-foreground">{fmtCurrency(amount)}</div>
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
                    {fmtCurrency(advanceAmount!)} now · {fmtCurrency(amount - advanceAmount!)} at venue
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
                Pay {fmtCurrency(payableAmount)}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Razorpay / Stripe ready architecture</span>
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
              {fmtCurrency(payableAmount)}
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
                {fmtCurrency(payableAmount)} paid via{" "}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-emerald-700">{fmtCurrency(payableAmount)}</span>
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
