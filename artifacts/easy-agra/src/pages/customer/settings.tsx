import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChangePassword, useDeleteAccount, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerLayout } from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Eye, EyeOff, Lock, Bell, Trash2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang, t } = useI18n();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const changePwdMutation = useChangePassword();
  const deleteAccMutation = useDeleteAccount();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwd, setPwd] = useState({ current: "", newPwd: "", confirm: "" });
  const [notifPrefs, setNotifPrefs] = useState({ ownerUpdates: true, announcements: true, accountAlerts: true });

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (pwd.newPwd !== pwd.confirm) {
      toast({ title: "Mismatch", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    try {
      await changePwdMutation.mutateAsync({ id: user.id, data: { currentPassword: pwd.current, newPassword: pwd.newPwd } });
      setPwd({ current: "", newPwd: "", confirm: "" });
      toast({ title: "Password changed successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Failed to change password", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await deleteAccMutation.mutateAsync({ id: user.id });
      queryClient.setQueryData(getGetMeQueryKey(), null);
      queryClient.clear();
      window.location.href = "/login";
    } catch {
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    }
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-5 space-y-4">
        <h1 className="text-xl font-bold">{t("settings")}</h1>

        {/* Language switcher */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />{t("language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={() => setLang("hi")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  lang === "hi" ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {t("hindi")}
              </button>
              <button
                onClick={() => setLang("en")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  lang === "en" ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {t("english")}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePwd} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input type={showCurrent ? "text" : "password"} value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} required className="pr-10" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <div className="relative">
                  <Input type={showNew ? "text" : "password"} value={pwd.newPwd} onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))} required className="pr-10" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full bg-primary" disabled={changePwdMutation.isPending}>
                {changePwdMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "ownerUpdates", label: "Owner status updates" },
              { key: "announcements", label: "Platform announcements" },
              { key: "accountAlerts", label: "Account alerts" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-normal cursor-pointer">{label}</Label>
                <Switch checked={notifPrefs[key as keyof typeof notifPrefs]} onCheckedChange={v => setNotifPrefs(p => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" />Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Deleting your account is permanent and cannot be undone. All your data will be removed.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Delete My Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Your account and all associated data will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                    {deleteAccMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
