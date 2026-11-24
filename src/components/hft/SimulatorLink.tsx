import { toast } from "sonner";

export const FEED_URL = "https://project--49e1e139-c63e-47ac-9d2e-c42a40ce4d88.lovable.app/api/public/simulator-config";

export const SIMULATOR_PROMPT = `Connect this simulator to my remote controller "High Frequency Chess Bot".
Every 3 seconds, fetch JSON (GET, no auth) from:
${FEED_URL}
Apply these fields to the app when "version" changes (ignore missing fields):
- botRunning (true = start the bot, false = stop it)
- closeAllNonce (when this number increases, close all open positions in profit)
- execMode: "buy" | "sell" | "both" | "candle" | "winlose"
- outcome: "win" (100% win) | "winlose" (4 wins : 1 loss)
- symbol (e.g. XAUUSD), lot, entryPips, tradesPerWave, cooldownSec, holdSec, startTime ("HH:MM" or ""), continuity: "single" | "continuous"
- simTheme: "auto" | "dark" | "light"
- logoText, logoBg, logoFg, logoImage (URL or data URL; when set, show it instead of the text logo)
- accountName, company, login, server, email, phone
- balance, charge, historyDeposit, swap, commission
Keep the simulator's own admin settings working too; the latest change wins.`;

export function SimulatorLink() {
  const copy = async (t: string, what: string) => {
    try { await navigator.clipboard.writeText(t); toast.success(`${what} copied`); } catch { toast.error("Copy failed"); }
  };
  return (
    <section className="panel">
      <h2 className="text-2xl font-bold">🔗 Simulator Link</h2>
      <p className="mt-1 text-muted-foreground">Your simulator reads this address every few seconds. It works once this app is published.</p>
      <div className="mt-3 break-all rounded-xl border border-border bg-muted p-3 font-mono text-sm">{FEED_URL}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="chip justify-center" onClick={() => copy(FEED_URL, "Link")}>📋 Copy link</button>
        <button className="btn-primary py-2" onClick={() => copy(SIMULATOR_PROMPT, "Instructions")}>📋 Copy setup message</button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Paste the setup message into the chat of your simulator project so it starts following this remote.</p>
    </section>
  );
}
