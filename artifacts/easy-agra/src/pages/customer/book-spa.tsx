import { useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useGetSpaById, useGetSpaServices, useCreateSpaAppointment, getGetMySpaAppointmentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarCheck, Loader2, Sparkles, BadgeIndianRupee } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BookForm {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  serviceName: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  numberOfPersons: string;
  specialRequest: string;
}

export default function BookSpa() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const spaId = parseInt(id, 10);

  const params = new URLSearchParams(search);
  const preServiceId = params.get("serviceId") ?? "";
  const preServiceName = params.get("serviceName") ?? "";
  const prePrice = params.get("price") ?? "";

  const { data: spa } = useGetSpaById(spaId);
  const { data: services = [] } = useGetSpaServices(spaId);
  const createMutation = useCreateSpaAppointment();

  const availableServices = services.filter((s) => s.isAvailable);

  const [form, setForm] = useState<BookForm>({
    customerName: user?.fullName ?? "",
    customerMobile: "",
    customerEmail: user?.email ?? "",
    serviceName: preServiceName,
    serviceId: preServiceId,
    appointmentDate: "",
    appointmentTime: "",
    numberOfPersons: "1",
    specialRequest: "",
  });

  const [done, setDone] = useState<string | null>(null);

  function handleServiceChange(val: string) {
    if (val === "__custom__") {
      setForm({ ...form, serviceId: "", serviceName: "" });
    } else {
      const svc = availableServices.find((s) => String(s.id) === val);
      setForm({
        ...form,
        serviceId: val,
        serviceName: svc?.name ?? "",
      });
    }
  }

  const selectedSvc = availableServices.find((s) => String(s.id) === form.serviceId);

  // Calculate estimate
  const priceEst = selectedSvc
    ? (parseFloat(String(selectedSvc.price)) * parseInt(form.numberOfPersons, 10) || 0)
    : prePrice
      ? parseFloat(prePrice) * parseInt(form.numberOfPersons, 10)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        spaId,
        serviceId: form.serviceId ? parseInt(form.serviceId, 10) : null,
        customerName: form.customerName,
        customerMobile: form.customerMobile,
        customerEmail: form.customerEmail || null,
        serviceName: form.serviceName,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        numberOfPersons: parseInt(form.numberOfPersons, 10) || 1,
        specialRequest: form.specialRequest || null,
      };
      const result = await createMutation.mutateAsync({ data: payload as any });
      qc.invalidateQueries({ queryKey: getGetMySpaAppointmentsQueryKey() });
      setDone(result.appointmentRef);
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    }
  }

  const today = new Date().toISOString().split("T")[0];

  if (done) {
    return (
      <CustomerLayout>
        <div className="px-4 py-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CalendarCheck className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Appointment Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your appointment has been submitted and is awaiting confirmation.
            </p>
          </div>
          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Appointment Reference</p>
            <p className="text-xl font-bold font-mono text-primary mt-1">{done}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/spas/${spaId}`)}
            >
              Back to Spa
            </Button>
            <Button className="flex-1" onClick={() => navigate("/my-spa-appointments")}>
              My Appointments
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/spas/${spaId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{t("book_appointment")}</h1>
            {spa && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {spa.name}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service selection */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Service</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {availableServices.length > 0 ? (
                <div className="space-y-1">
                  <Label>Select Service</Label>
                  <Select
                    value={form.serviceId || "__custom__"}
                    onValueChange={handleServiceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">Custom / Other</SelectItem>
                      {availableServices.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name} — ₹{Number(s.price).toLocaleString()} ({s.duration} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {(!form.serviceId || form.serviceId === "") && (
                <div className="space-y-1">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={form.serviceName}
                    onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                    placeholder="e.g. Deep Tissue Massage"
                    required
                  />
                </div>
              )}

              {priceEst != null && priceEst > 0 && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/5 rounded-lg px-3 py-2">
                  <BadgeIndianRupee className="h-4 w-4" />
                  Estimated: ₹{priceEst.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={form.customerMobile}
                  onChange={(e) => setForm({ ...form, customerMobile: e.target.value })}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    min={today}
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="persons">Number of Persons</Label>
                <Select
                  value={form.numberOfPersons}
                  onValueChange={(v) => setForm({ ...form, numberOfPersons: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} person{n !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="request">Special Request</Label>
                <Textarea
                  id="request"
                  value={form.specialRequest}
                  onChange={(e) => setForm({ ...form, specialRequest: e.target.value })}
                  placeholder="Any special requirements..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full gap-2"
            size="lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CalendarCheck className="h-5 w-5" />
            )}
            Confirm Appointment
          </Button>
        </form>
      </div>
    </CustomerLayout>
  );
}
