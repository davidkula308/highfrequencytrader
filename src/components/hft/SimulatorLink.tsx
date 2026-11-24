import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { setPushTarget } from "@/lib/sync.functions";
import { sessionPassword, useSyncStatus, syncStatus } from "@/lib/controller-store";

export const SIMULATOR_PROMPT = `Reconnect this MetaTrader-style simulator to my remote controller app, "High Frequency Chess Bot". This project may already contain the receiver; inspect the current implementation first and preserve the existing simulator database, trading engine, admin controls, and positions. Do not rebuild working features or reset/migrate the database.

Controller-to-simulator contract:
- The controller sends HTTPS POST requests to /api/public/remote-config.
- Keep REMOTE_CONTROL_KEY server-only. Require Authorization: Bearer <REMOTE_CONTROL_KEY>; return 401 when missing or incorrect. Validate the JSON settings, apply them to the existing shared simulator state, and return 200 with {"ok":true} when accepted. Never expose, print, or commit the secret.
- Preserve live application of remote settings and the simulator's own admin controls; the newest valid update wins.
- Keep compatibility with these settings: botRunning, closeAllNonce, execMode (buy | sell | both | candle | winlose), outcome (win | winlose), symbol, lot, entryPips, tradesPerWave, cooldownSec, holdSec, startTime, continuity (single | continuous), simTheme (auto | dark | light), logoText, logoBg, logoFg, logoImage, accountName, company, login, server, email, phone, balance, charge, historyDeposit, swap, commission, version, updatedAt. Ignore unknown fields and reject invalid values.

Vercel deployment requirements:
- Ensure the production deployment has the same REMOTE_CONTROL_KEY value as the controller's saved key. If it is unavailable, ask me to set it securely; do not silently generate a different key. If rotation is necessary, tell me to update both apps.
- Keep /api/public/tick protected. Configure a Vercel Cron job to call it every minute, adapting the existing handler to Vercel's scheduled GET request and CRON_SECRET authorization while retaining any needed POST compatibility. Never make the tick endpoint unauthenticated.
- Keep secrets out of browser code, logs, and responses.

After changes, run the project's checks and report: whether the receiver is deployed, its full production URL ending in /api/public/remote-config, whether the matching key is configured (yes/no only), and whether the per-minute tick schedule is active. Test that a valid key is accepted and a missing/incorrect key gets 401 without revealing any key.`;

export function SimulatorLink({ initialUrl, hasKey }: { initialUrl: string; hasKey: boolean }) {
  const [url, setUrl] = useState(initialUrl);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [keySaved, setKeySaved] = useState(hasKey);
  const fn = useServerFn(setPushTarget);
  useSyncStatus();
  const copy = async (t: string, what: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };
  const delivered = syncStatus.delivered;
  return (
    <section className="panel">
      <h2 className="text-2xl font-bold">🔗 Simulator Connection</h2>
      <p className="mt-1 text-muted-foreground">
        Every change you make here is sent straight to your simulator.
      </p>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${delivered === "sent" ? "bg-success" : delivered === "failed" ? "bg-destructive" : "bg-muted-foreground"}`}
        />
        <span>
          {delivered === "sent"
            ? "Simulator received the latest settings"
            : delivered === "failed"
              ? "Simulator did not accept the last change"
              : "Not connected yet"}
        </span>
      </div>

      <label
        className="mb-2 mt-4 block font-medium text-muted-foreground"
        htmlFor="simulator-receiver-url"
      >
        Simulator production receiver address
      </label>
      <input
        id="simulator-receiver-url"
        className="field"
        placeholder="https://your-simulator-host/api/public/remote-config"
        value={url}
        onChange={(e) => setUrl(e.target.value.trim())}
      />
      <label
        className="mb-2 mt-4 block font-medium text-muted-foreground"
        htmlFor="simulator-remote-key"
      >
        Remote control key
      </label>
      <input
        id="simulator-remote-key"
        className="field"
        type="password"
        autoComplete="new-password"
        placeholder={
          keySaved ? "•••••••• (saved — type to replace)" : "Paste the key from your simulator"
        }
        value={key}
        onChange={(e) => setKey(e.target.value.trim())}
      />
      <button
        className="btn-primary mt-3 w-full py-3"
        disabled={saving}
        onClick={async () => {
          if (url && !url.startsWith("https://")) {
            toast.error("Address must start with https://");
            return;
          }
          setSaving(true);
          try {
            const r = await fn({ data: { password: sessionPassword.get(), url, key } });
            if (!r.ok) {
              toast.error("Could not save connection");
              return;
            }
            if (key) setKeySaved(true);
            setKey("");
            syncStatus.delivered = r.test;
            syncStatus.listeners.forEach((l) => l());
            if (r.test === "sent") toast.success("Connected — simulator received the settings");
            else if (r.test === "failed")
              toast.error("Saved, but the simulator refused. Check the address and key.");
            else toast("Connection removed");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Testing…" : "💾 Save & Test Connection"}
      </button>

      <hr className="my-5 border-border" />
      <p className="text-sm text-muted-foreground">
        Paste this verification and setup message into the simulator project&apos;s chat:
      </p>
      <button
        className="chip mt-2 w-full justify-center"
        onClick={() => copy(SIMULATOR_PROMPT, "Setup message")}
      >
        📋 Copy simulator setup message
      </button>
    </section>
  );
}
