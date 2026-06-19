import { useState } from "react";
import { useSubmitOwnerRequest, useGetMyOwnerRequest, getGetMyOwnerRequestQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, UtensilsCrossed, Sparkles, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roleIcons: Record<string, any> = {
  hotel_owner: <Building2 className="h-5 w-5" />,
  restaurant_owner: <UtensilsCrossed className="h-5 w-5" />,
  spa_owner: <Sparkles className="h-5 w-5" />,
};

const statusConfig: Record<string, { icon: any; color: string; title: string; desc: string }> = {
  pending: { icon: <Clock className="h-10 w-10 text-yellow-500" />, color: "border-yellow-200 bg-yellow-50", title: "Request Under Review", desc: "Our team is reviewing your application. You'll be notified once a decision is made." },
  approved: { icon: <CheckCircle2 className="h-10 w-10 text-green-500" />, color: "border-green-200 bg-green-50", title: "Request Approved!", desc: "Congratulations! Your owner request has been approved. Your role has been updated." },
  rejected: { icon: <XCircle className="h-10 w-10 text-red-500" />, color: "border-red-200 bg-red-50", title: "Request Rejected", desc: "Your request was not approved." },
};

export default function BecomeOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: existingRequest, isLoading: loadingRequest } = useGetMyOwnerRequest({ query: { retry: false, queryKey: ["getMyOwnerRequest"] } });
  const submitMutation = useSubmitOwnerRequest();
  const [form, setForm] = useState({ requestedRole: "", businessName: "", businessDescription: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requestedRole) {
      toast({ title: "Select role", description: "Please select the type of owner you want to become", variant: "destructive" });
      return;
    }
    try {
      await submitMutation.mutateAsync({ data: form as any });
      queryClient.invalidateQueries({ queryKey: getGetMyOwnerRequestQueryKey() });
      toast({ title: "Request submitted!", description: "We'll review your application and notify you." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Failed to submit request", variant: "destructive" });
    }
  };

  if (loadingRequest) {
    return <CustomerLayout><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></CustomerLayout>;
  }

  if (existingRequest) {
    const config = statusConfig[existingRequest.status];
    return (
      <CustomerLayout>
        <div className="px-4 py-5">
          <h1 className="text-xl font-bold mb-4">Owner Request</h1>
          <Card className={`border-2 ${config.color}`}>
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-3">{config.icon}</div>
              <h2 className="font-bold text-lg mb-1">{config.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">{config.desc}</p>
              {existingRequest.status === "rejected" && existingRequest.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-left mb-3">
                  <strong>Reason:</strong> {existingRequest.rejectionReason}
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {roleIcons[existingRequest.requestedRole]}
                <span className="capitalize">{existingRequest.requestedRole?.replace(/_/g, " ")}</span>
                <Badge variant="secondary" className="capitalize">{existingRequest.status}</Badge>
              </div>
              {existingRequest.businessName && (
                <p className="text-sm font-medium mt-2">{existingRequest.businessName}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Become an Owner</h1>
          <p className="text-sm text-muted-foreground mt-1">List your business on Easy Agra and reach thousands of visitors.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "hotel_owner", label: "Hotel Owner", icon: Building2, color: "text-blue-600 bg-blue-50" },
            { value: "restaurant_owner", label: "Restaurant", icon: UtensilsCrossed, color: "text-orange-600 bg-orange-50" },
            { value: "spa_owner", label: "Spa Owner", icon: Sparkles, color: "text-purple-600 bg-purple-50" },
          ].map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(f => ({ ...f, requestedRole: value }))}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${form.requestedRole === value ? "border-primary bg-primary/5" : "border-border bg-white"}`}
            >
              <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-center">{label}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Owner Type</Label>
                <Select value={form.requestedRole} onValueChange={v => setForm(f => ({ ...f, requestedRole: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel_owner">Hotel Owner</SelectItem>
                    <SelectItem value="restaurant_owner">Restaurant Owner</SelectItem>
                    <SelectItem value="spa_owner">Spa Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Business Name</Label>
                <Input placeholder="e.g. Taj View Hotel" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>About Your Business</Label>
                <Textarea
                  placeholder="Describe your business, location, and what makes it special..."
                  value={form.businessDescription}
                  onChange={e => setForm(f => ({ ...f, businessDescription: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full bg-primary" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
