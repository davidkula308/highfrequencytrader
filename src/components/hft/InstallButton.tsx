import { useEffect, useState } from "react";
import { toast } from "sonner";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); toast.success("App installed — open it from your home screen"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return null;
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <section className="panel text-center">
      <img src="/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
      <div className="mt-2 text-lg font-bold">Get the app</div>
      <p className="text-sm text-muted-foreground">Opens full-screen from your home screen, like a real app.</p>
      <button className="btn-primary mt-3 w-full py-3 text-lg" onClick={async () => {
        if (evt) { await evt.prompt(); const c = await evt.userChoice; if (c.outcome === "accepted") setEvt(null); return; }
        setHelp(true);
      }}>📲 Install App</button>
      {help && (
        <p className="mt-3 rounded-xl bg-muted p-3 text-left text-sm">
          {ios
            ? "On iPhone: open this page in Safari, tap the Share button, then “Add to Home Screen”."
            : "Open the published app in Chrome, tap the ⋮ menu, then “Install app” or “Add to Home screen”. (Installing doesn't work inside the editor preview.)"}
        </p>
      )}
    </section>
  );
}
