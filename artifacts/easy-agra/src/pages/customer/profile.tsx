import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateUser, useUploadProfilePhoto, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMutation = useUpdateUser();
  const photoMutation = useUploadProfilePhoto();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ fullName: "", mobile: "", city: "", state: "" });

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, mobile: user.mobile, city: user.city || "", state: user.state || "" });
  }, [user]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: user.id, data: form });
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const url = await uploadToCloudinary(file);
      const updated = await photoMutation.mutateAsync({ id: user.id, data: { photoUrl: url } });
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      toast({ title: "Photo updated" });
    } catch {
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
    rejected: "bg-gray-100 text-gray-600",
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold">My Profile</h1>

        {/* Photo + info card */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-primary/20">
                  <AvatarImage src={user?.profilePhoto || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {user?.fullName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="photoInput" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 shadow-md">
                  {photoMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                </label>
                <input id="photoInput" type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{user?.fullName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <Badge className={`text-xs ${statusColors[user?.status || "active"]}`} variant="secondary">{user?.status}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{user?.role?.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={form.fullName} onChange={handleChange("fullName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" value={form.mobile} onChange={handleChange("mobile")} required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={handleChange("city")} placeholder="Agra" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={handleChange("state")} placeholder="Uttar Pradesh" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                  saved ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> : null}
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact info (read-only) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate max-w-[180px]">{user?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
