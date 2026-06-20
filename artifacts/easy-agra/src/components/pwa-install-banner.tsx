import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PwaInstallBanner() {
  const { isInstallable, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("pwa-banner-dismissed") === "1";
  });

  if (!isInstallable || dismissed) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <Download className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install Easy Agra</p>
        <p className="text-xs text-white/70">Add to home screen for the best experience</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={handleInstall} className="bg-primary hover:bg-primary/90 text-xs h-8">Install</Button>
        <button onClick={handleDismiss} className="text-white/50 hover:text-white p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Inline install button for settings/profile pages
export function InstallAppButton() {
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Download className="h-4 w-4" />
        <span>App installed</span>
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <Button variant="outline" size="sm" onClick={promptInstall} className="gap-2">
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
