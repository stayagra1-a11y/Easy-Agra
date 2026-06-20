import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setPromptEvent(null);
    };
    window.addEventListener("appinstalled", appInstalledHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setPromptEvent(null);
    setIsInstallable(false);
    return choice.outcome === "accepted";
  };

  return { isInstallable, isInstalled, promptInstall };
}
