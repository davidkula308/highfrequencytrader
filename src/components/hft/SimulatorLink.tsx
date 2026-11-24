import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { setPushTarget } from "@/lib/sync.functions";
import { sessionPassword, useSyncStatus, syncStatus } from "@/lib/controller-store";

export const FEED_URL = "https://project--49e1e139-c63e-47ac-9d2e-c42a40ce4d88.lovable.app/api/public/simulator-config";

export const SIMULATOR_PROMPT = `Let my remote controller app "High Frequency Chess Bot" control this simulator.

1. Create a secret named REMOTE_CONTROL_KEY (give me a Generate button so I can copy the value into the remote).
2. Create a public endpoint: POST /api/public/remote-config
   - Reject the request with 401 unless the header "Authorization" equals "Bearer " + REMOTE_CONTROL_KEY.
   - The body is a JSON object with the settings below. Validate it and save it as the current bot/admin settings in the database (one row, overwrite each time).
   - Reply 200 {"ok":true}.
3. Make the simulator screens follow the saved settings live (realtime or re-check every 2 seconds), so a change shows without refreshing.
4. Keep the simulator's own admin settings page working; whichever change is newest wins.

Fields (ignore unknown ones):
- botRunning: true = start the bot, false = stop it
- closeAllNonce: when this number increases, close all open positions in profit
- execMode: "buy" | "sell" | "both" | "candle" | "winlose"
- outcome: "win" (every trade profit) | "winlose" (4 wins : 1 loss)
- symbol (e.g. XAUUSD), lot, entryPips, tradesPerWave, cooldownSec, holdSec, startTime ("HH:MM" or ""), continuity: "single" | "continuous"
- simTheme: "auto" | "dark" | "light"
- logoText, logoBg, logoFg (hex colours), logoImage (URL or data URL; when set, show it instead of the text logo in the left menu)
- accountName, company, login, server, email, phone
- balance, charge, historyDeposit, swap, commission
- version (number that increases on each change), updatedAt

Then tell me the full published address of the endpoint.`;

export function SimulatorLink({ initialUrl, hasKey }: { initialUrl: string; hasKey: boolean }) {
  const [url, setUrl] = useState(initialUrl);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [keySaved, setKeySaved] = useState(hasKey);
  const fn = useServerFn(setPushTarget);
  useSyncStatus();
  const copy = async (t: string, what: string) => {
    try { await navigator.clipboard.writeText(t); toast.success(`${what} copied`); } catch { toast.error("Copy failed"); }
  };
  const delivered = syncStatus.delivered;
  return (
    <section className="panel">
      <h2 className="text-2xl font-bold">🔗 Simulator Connection</h2>
      <p className="mt-1 text-muted-foreground">Every change you make here is sent straight to your simulator.</p>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${delivered === "sent" ? "bg-success" : delivered === "failed" ? "bg-destructive" : "bg-muted-foreground"}`} />
        <span>{delivered === "sent" ? "Simulator received the latest settings" : delivered === "failed" ? "Simulator did not accept the last change" : "Not connected yet"}</span>
      </div>

      <div className="mb-2 mt-4 font-medium text-muted-foreground">Simulator receiver address</div>
      <input className="field" placeholder="https://your-simulator.lovable.app/api/public/remote-config" value={url} onChange={(e) => setUrl(e.target.value.trim())} />
      <div className="mb-2 mt-4 font-medium text-muted-foreground">Remote control key</div>
      <input className="field" type="password" placeholder={keySaved ? "•••••••• (saved — type to replace)" : "Paste the key from your simulator"} value={key} onChange={(e) => setKey(e.target.value.trim())} />
      <button className="btn-primary mt-3 w-full py-3" disabled={saving} onClick={async () => {
        if (url && !url.startsWith("https://")) { toast.error("Address must start with https://"); return; }
        setSaving(true);
        try {
          const r = await fn({ data: { password: sessionPassword.get(), url, key } });
          if (!r.ok) { toast.error("Could not save connection"); return; }
          if (key) setKeySaved(true);
          setKey("");
          syncStatus.delivered = r.test; syncStatus.listeners.forEach((l) => l());
          if (r.test === "sent") toast.success("Connected — simulator received the settings");
          else if (r.test === "failed") toast.error("Saved, but the simulator refused. Check the address and key.");
          else toast("Connection removed");
        } finally { setSaving(false); }
      }}>{saving ? "Testing…" : "💾 Save & Test Connection"}</button>

      <hr className="my-5 border-border" />
      <p className="text-sm text-muted-foreground">Set up your simulator project by pasting this message into its chat:</p>
      <button className="chip mt-2 w-full justify-center" onClick={() => copy(SIMULATOR_PROMPT, "Setup message")}>📋 Copy simulator setup message</button>
      <details className="mt-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer">Backup: read-only settings link</summary>
        <div className="mt-2 break-all rounded-xl border border-border bg-muted p-3 font-mono">{FEED_URL}</div>
        <button className="chip mt-2" onClick={() => copy(FEED_URL, "Link")}>📋 Copy link</button>
      </details>
    </section>
  );
}
