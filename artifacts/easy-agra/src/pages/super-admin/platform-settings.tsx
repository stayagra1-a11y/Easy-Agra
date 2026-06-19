import { useState, useEffect } from "react";
import { useGetPlatformSettings, useUpdatePlatformSettings, getGetPlatformSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Loader2, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlatformSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetPlatformSettings();
  const updateMutation = useUpdatePlatformSettings();
  const [form, setForm] = useState({
    appName: "Easy Agra",
    contactEmail: "",
    supportEmail: "",
    maintenanceMode: false,
    termsAndConditions: "",
    privacyPolicy: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        appName: data.appName || "Easy Agra",
        contactEmail: data.contactEmail || "",
        supportEmail: data.supportEmail || "",
        maintenanceMode: data.maintenanceMode ?? false,
        termsAndConditions: data.termsAndConditions || "",
        privacyPolicy: "",
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        data: {
          appName: form.appName,
          contactEmail: form.contactEmail,
          supportEmail: form.supportEmail,
          maintenanceMode: form.maintenanceMode,
          termsAndConditions: form.termsAndConditions || undefined,
        },
      });
      queryClient.setQueryData(getGetPlatformSettingsQueryKey(), updated);
      toast({ title: "Settings saved", description: "Platform settings have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure global platform behavior and appearance</p>
        </div>

        {/* General settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>App Name</Label>
              <Input value={form.appName} onChange={e => setForm(f => ({ ...f, appName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@easyagra.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input type="email" value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} placeholder="support@easyagra.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Terms & Conditions URL</Label>
              <Input value={form.termsAndConditions} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance mode */}
        <Card className={form.maintenanceMode ? "border-orange-300 bg-orange-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              Maintenance Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable maintenance mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">When enabled, all users except super admins will see a maintenance page</p>
              </div>
              <Switch
                checked={form.maintenanceMode}
                onCheckedChange={v => setForm(f => ({ ...f, maintenanceMode: v }))}
              />
            </div>
            {form.maintenanceMode && (
              <div className="rounded-lg bg-orange-100 border border-orange-300 p-3 text-sm text-orange-800">
                <strong>Warning:</strong> Enabling maintenance mode will prevent all non-super-admin users from accessing the platform.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        {form.maintenanceMode ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full bg-primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Enable Maintenance Mode?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will prevent all non-super-admin users from accessing the platform. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">Yes, Save Settings</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button className="w-full bg-primary" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        )}
      </div>
    </AdminLayout>
  );
}
