import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getLivePrice } from "@/lib/prices.functions";
import { SYMBOLS, BROKERS } from "@/lib/symbols";
import { useConfig, addHistory, hydrateConfig, sessionPassword, useSyncStatus, type Config, type ThemeMode } from "@/lib/controller-store";
import { loadRemoteConfig, changePassword } from "@/lib/sync.functions";
import { SimulatorLink } from "./SimulatorLink";
import { pickSide, isWinner, entryPrice, type Position } from "@/lib/trade-engine";

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, " ");
const APP_VERSION = "v2.9.0";

function Opt({ on, title, sub, onClick }: { on: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`opt ${on ? "opt-on" : ""}`}>
      <div className="font-bold">{title}</div>
      <div className={`text-sm ${on ? "" : "text-muted-foreground"}`}>{sub}</div>
    </button>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-4 font-medium text-muted-foreground">{children}</div>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`font-mono text-xl ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
function ThemePicker({ value, onChange, darkSub, lightSub }: { value: ThemeMode; onChange: (t: ThemeMode) => void; darkSub: string; lightSub: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Opt on={value === "auto"} title="📱 Auto" sub="Device Theme" onClick={() => onChange("auto")} />
      <Opt on={value === "dark"} title="🌙 Dark" sub={darkSub} onClick={() => onChange("dark")} />
      <Opt on={value === "light"} title="☀️ Light" sub={lightSub} onClick={() => onChange("light")} />
    </div>
  );
}

export function Controller() {
  const { cfg, update, ready } = useConfig();
  const priceFn = useServerFn(getLivePrice);
  const sym = SYMBOLS.find((s) => s.code === cfg.symbol) ?? SYMBOLS[0]!;
  const [live, setLive] = useState<number | null>(null);
  const [sim, setSim] = useState<number | null>(null);
  const lastMove = useRef(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState({ opened: 0, closed: 0, pl: 0 });
  const tradeIdx = useRef(0);
  const [locked, setLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const sync = useSyncStatus();
  const loadFn = useServerFn(loadRemoteConfig);
  const changeFn = useServerFn(changePassword);
  const [unlockPw, setUnlockPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Deposit-USDT(SOL)");
  const [draft, setDraft] = useState<Config>(cfg);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (ready) setDraft(cfg); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Controller theme
  useEffect(() => {
    const apply = () => {
      const dark = cfg.ctrlTheme === "dark" || (cfg.ctrlTheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [cfg.ctrlTheme]);

  // Real price every 10s, with tiny tick interpolation between fetches for the simulator feed
  useEffect(() => {
    let alive = true;
    setLive(null); setSim(null);
    const pull = async () => {
      const r = await priceFn({ data: { symbol: sym.code } });
      if (!alive) return;
      if (r.price != null) { setLive(r.price); setSim(r.price); } else if (r.error) toast.error(r.error);
    };
    pull();
    const id = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [sym.code, priceFn]);
  useEffect(() => {
    if (live == null) return;
    const id = setInterval(() => {
      setSim((p) => {
        const base = p ?? live;
        const drift = (live - base) * 0.3 + (Math.random() - 0.5) * sym.pip * 4;
        lastMove.current = drift;
        return base + drift;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [live, sym.pip]);

  const floating = useMemo(() => {
    if (sim == null) return 0;
    return positions.reduce((a, p) => a + (p.side === "BUY" ? sim - p.open : p.open - sim) * p.lot * sym.contract, 0);
  }, [positions, sim, sym.contract]);

  // Wave engine mirrors what the simulator will do with these settings
  const runningRef = useRef(cfg.botRunning);
  runningRef.current = cfg.botRunning;
  useEffect(() => {
    if (!cfg.botRunning || sim == null) return;
    let timer: ReturnType<typeof setTimeout>;
    const launch = () => {
      if (!runningRef.current) return;
      const now = Date.now();
      const wave: Position[] = Array.from({ length: Math.max(1, cfg.tradesPerWave) }, () => {
        const side = pickSide(cfg.execMode, lastMove.current);
        const win = isWinner(cfg.outcome, cfg.execMode, tradeIdx.current++);
        return { id: crypto.randomUUID(), side, symbol: cfg.symbol, lot: cfg.lot, open: entryPrice(side, simRef.current ?? sim, cfg.entryPips, sym.pip), openedAt: now, win };
      });
      setPositions((p) => [...p, ...wave]);
      setStats((s) => ({ ...s, opened: s.opened + wave.length }));
      timer = setTimeout(() => {
        closeTrades(wave.map((w) => w.id));
        if (cfg.continuity === "continuous" && runningRef.current) timer = setTimeout(launch, cfg.cooldownSec * 1000);
        else update({ botRunning: false });
      }, cfg.holdSec * 1000);
    };
    let delay = 0;
    if (cfg.startTime) {
      const [h, m] = cfg.startTime.split(":").map(Number);
      const t = new Date(); t.setHours(h ?? 0, m ?? 0, 0, 0);
      delay = Math.max(0, t.getTime() - Date.now());
      if (delay > 0) toast.info(`Bot armed — first wave at ${cfg.startTime}`);
    }
    timer = setTimeout(launch, delay);
    return () => clearTimeout(timer);
  }, [cfg.botRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  const simRef = useRef(sim); simRef.current = sim;
  const posRef = useRef(positions); posRef.current = positions;

  function closeTrades(ids?: string[], forceProfit = false) {
    const price = simRef.current;
    if (price == null) return;
    const closing = posRef.current.filter((p) => !ids || ids.includes(p.id));
    let total = 0;
    for (const p of closing) {
      const raw = (p.side === "BUY" ? price - p.open : p.open - price) * p.lot * sym.contract;
      const mag = Math.max(Math.abs(raw), cfg.entryPips * sym.pip * p.lot * sym.contract);
      total += forceProfit || p.win ? mag : -mag;
    }
    setPositions((ps) => ps.filter((p) => !closing.includes(p)));
    setStats((s) => ({ opened: s.opened, closed: s.closed + closing.length, pl: s.pl + total }));
    if (closing.length) update({ balance: +(cfg.balance + total).toFixed(2) });
  }

  const equity = cfg.balance + floating;
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const live1 = <K extends keyof Config>(k: K, v: Config[K]) => { update({ [k]: v } as Partial<Config>); setDraft((d) => ({ ...d, [k]: v })); };

  const statusTone = cfg.botRunning ? "border-primary bg-primary-soft text-primary" : "border-success bg-success-soft text-success";

  if (locked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <form className="panel w-full max-w-sm space-y-4" onSubmit={async (e) => {
          e.preventDefault(); setUnlocking(true);
          try {
            const r = await loadFn({ data: { password: unlockPw } });
            if (!r.ok) { toast.error("Wrong password"); return; }
            sessionPassword.set(unlockPw);
            const remote = JSON.parse(r.config || "{}") as Partial<Config>;
            if (Object.keys(remote).length) { hydrateConfig(remote); setDraft((d) => ({ ...d, ...remote })); }
            setLocked(false); setUnlockPw("");
          } catch { toast.error("Could not reach the server"); } finally { setUnlocking(false); }
        }}>
          <div className="text-xl font-bold">🔒 Controller Locked</div>
          <input type="password" className="field" placeholder="Enter password..." value={unlockPw} onChange={(e) => setUnlockPw(e.target.value)} autoFocus />
          <button className="btn-primary w-full py-3" disabled={unlocking}>{unlocking ? "Checking…" : "Unlock"}</button>
          <p className="text-center text-xs text-muted-foreground">First time? The starting password is 1234 — change it after unlocking.</p>
        </form>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-16">
      {/* Header */}
      <section className="panel">
        <div className="flex items-center gap-4">
          <div className="btn-primary flex h-14 w-14 items-center justify-center rounded-xl text-xl font-black">HF</div>
          <div>
            <h1 className="text-2xl font-black leading-tight">High Frequency Chess Bot</h1>
            <p className="text-muted-foreground">Real-Time HFT Bot & Simulator Profile Sync</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className={`chip ${statusTone}`}><span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-current" />{cfg.botRunning ? "BOT RUNNING" : "BOT IDLE"}</span>
          <button className="chip" onClick={() => live1("ctrlTheme", cfg.ctrlTheme === "auto" ? "dark" : cfg.ctrlTheme === "dark" ? "light" : "auto")}>🌗 {cfg.ctrlTheme[0]!.toUpperCase() + cfg.ctrlTheme.slice(1)}</button>
          <button className="chip border-primary bg-primary-soft text-primary" onClick={() => document.getElementById("ota")?.scrollIntoView({ behavior: "smooth" })}>⬇️ Pull OTA</button>
          <span className={`chip text-sm ${sync === "error" ? "border-destructive text-destructive" : "text-muted-foreground"}`}>{sync === "saving" ? "⏳ Syncing…" : sync === "error" ? "⚠️ Sync failed" : "☁️ Synced"}</span>
          <button className="chip" onClick={() => { sessionPassword.set(""); setLocked(true); }}>🔒 Lock</button>
        </div>
      </section>

      {/* Bot */}
      <section className="panel">
        <h2 className="text-2xl font-bold">⚡ High-Frequency Chasing Bot</h2>
        <p className="mt-1 text-muted-foreground">Real market prices + spread-tight entry (~{cfg.entryPips} pips from live price) that steps immediately to live Bid/Ask for fast blue scalps.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted p-4">
          <div><div className="text-sm text-muted-foreground">Live Spot Price</div><div className="font-mono text-lg">{live == null ? "…" : fmt(live, sym.digits)}</div></div>
          <div><div className="text-sm text-muted-foreground">Simulator Price</div><div className="font-mono text-lg text-primary">{sim == null ? "…" : fmt(sim, sym.digits)}</div></div>
          <div><div className="text-sm text-muted-foreground">Price Offset</div><div className="font-mono text-lg">{live == null || sim == null ? "…" : `${Math.round((sim - live) / sym.pip)} pips`}</div></div>
        </div>

        <Label>Bot Execution Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Opt on={cfg.execMode === "buy"} title="BUY ONLY" sub="Spread-tight below Bid" onClick={() => live1("execMode", "buy")} />
          <Opt on={cfg.execMode === "sell"} title="SELL ONLY" sub="Spread-tight above Ask" onClick={() => live1("execMode", "sell")} />
          <Opt on={cfg.execMode === "both"} title="BOTH SIDES" sub="Random Buy or Sell" onClick={() => live1("execMode", "both")} />
          <Opt on={cfg.execMode === "candle"} title="AUTO CANDLE" sub="Match green/red bar" onClick={() => live1("execMode", "candle")} />
          <div className="col-span-2"><Opt on={cfg.execMode === "winlose"} title="WIN & LOSE (4W : 1L)" sub="4 Wins & 1 Negative Loss in every 5 trades (Realistic Net Profit)" onClick={() => live1("execMode", "winlose")} /></div>
        </div>

        <Label>Bot Outcome Realism (Win / Loss Ratio)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Opt on={cfg.outcome === "win"} title="100% WIN ONLY" sub="Every trade closes in blue profit" onClick={() => live1("outcome", "win")} />
          <Opt on={cfg.outcome === "winlose"} title="WIN & LOSE (4W : 1L)" sub="1 in every 5 trades closes negative" onClick={() => live1("outcome", "winlose")} />
        </div>

        <Label>Instrument Symbol</Label>
        <select className="field" value={cfg.symbol} onChange={(e) => live1("symbol", e.target.value)}>
          {SYMBOLS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>

        <Label>Lot Volume per Trade</Label>
        <input type="number" step="0.01" min="0.01" className="field" value={draft.lot} onChange={(e) => set("lot", +e.target.value)} onBlur={() => update({ lot: Math.max(0.01, draft.lot) })} />
        <Label>Entry Distance (Pips)</Label>
        <input type="number" step="0.1" min="0" className="field" value={draft.entryPips} onChange={(e) => set("entryPips", +e.target.value)} onBlur={() => update({ entryPips: draft.entryPips })} />
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Trades per Wave</Label><input type="number" min="1" max="100" className="field" value={draft.tradesPerWave} onChange={(e) => set("tradesPerWave", +e.target.value)} onBlur={() => update({ tradesPerWave: Math.min(100, Math.max(1, Math.round(draft.tradesPerWave))) })} /></div>
          <div><Label>Cooldown (sec)</Label><input type="number" min="0" className="field" value={draft.cooldownSec} onChange={(e) => set("cooldownSec", +e.target.value)} onBlur={() => update({ cooldownSec: Math.max(0, draft.cooldownSec) })} /></div>
          <div><Label>Hold Time (sec)</Label><input type="number" min="1" className="field" value={draft.holdSec} onChange={(e) => set("holdSec", +e.target.value)} onBlur={() => update({ holdSec: Math.max(1, draft.holdSec) })} /></div>
          <div><Label>Start At (optional)</Label><input type="time" className="field" value={draft.startTime} onChange={(e) => live1("startTime", e.target.value)} /></div>
        </div>
        <Label>Wave Continuity</Label>
        <select className="field" value={cfg.continuity} onChange={(e) => live1("continuity", e.target.value as Config["continuity"])}>
          <option value="continuous">Continuous HFT Waves</option>
          <option value="single">Single Wave Only</option>
        </select>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="btn-primary py-3" disabled={cfg.botRunning} onClick={() => { update({ botRunning: true }); toast.success("HFT Bot started"); }}>▶ Start HFT Bot</button>
          <button className="btn-dark py-3" onClick={() => { update({ botRunning: false }); toast("Bot stopped"); }}>⏹ Stop Bot</button>
          <button className="btn-success py-3" onClick={() => { closeTrades(undefined, true); update({ closeAllNonce: cfg.closeAllNonce + 1 }); toast.success("All positions closed in profit"); }}>💰 Close All Profit</button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold">Live Simulator Positions ({positions.length})</h3>
          <div className="text-right text-sm text-muted-foreground">Opened: {stats.opened} · Closed: {stats.closed} · P/L: {stats.pl >= 0 ? "+" : "-"}${fmt(Math.abs(stats.pl))}</div>
        </div>
        {positions.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">No open positions. Tap "Start HFT Bot" to launch a wave.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {positions.map((p) => {
              const pl = sim == null ? 0 : (p.side === "BUY" ? sim - p.open : p.open - sim) * p.lot * sym.contract;
              return (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 font-mono text-sm">
                  <span><b className={p.side === "BUY" ? "text-primary" : "text-destructive"}>{p.side.toLowerCase()} {p.lot}</b> {p.symbol} @ {fmt(p.open, sym.digits)}</span>
                  <span className={pl >= 0 ? "text-primary" : "text-destructive"}>{fmt(pl)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Account */}
      <section className="panel">
        <h2 className="text-2xl font-bold">🎨 Simulator Logo, Account & Balance</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Balance" value={fmt(cfg.balance)} />
          <Stat label="Equity" value={fmt(equity)} />
          <Stat label="Floating P/L" value={fmt(floating)} tone="primary" />
          <Stat label="Free Margin" value={fmt(equity)} />
        </div>
        <Label>🎨 Simulator Theme (All Pages)</Label>
        <ThemePicker value={cfg.simTheme} onChange={(t) => live1("simTheme", t)} darkSub="Black MT5 UI" lightSub="White MT5 UI" />
        <Label>🖥️ Controller Dashboard Theme</Label>
        <ThemePicker value={cfg.ctrlTheme} onChange={(t) => live1("ctrlTheme", t)} darkSub="Dark Panel" lightSub="Light Panel" />

        <Label>💵 Deposit, Withdrawal & Reset to $0.00 (MT5 History)</Label>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <button className="w-full rounded-xl border border-destructive bg-destructive-soft py-2 font-bold text-destructive" onClick={() => { if (confirm("Reset account balance to $0.00?")) { update({ balance: 0 }); setDraft((d) => ({ ...d, balance: 0 })); addHistory({ type: "reset", amount: 0, note: "Reset" }); toast("Account reset to $0.00"); } }}>⟲ Reset Account Size to $0.00</button>
          <div className="grid grid-cols-2 gap-2">
            <input className="field" inputMode="decimal" placeholder="Amount (e.g. 97.5)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="field" placeholder="Deposit-USDT(SOL)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["deposit", "withdrawal"] as const).map((t) => (
              <button key={t} className={`${t === "deposit" ? "btn-primary" : "btn-danger"} py-3`} onClick={() => {
                const a = parseFloat(amount);
                if (!(a > 0)) { toast.error("Enter a valid amount"); return; }
                if (t === "withdrawal" && a > cfg.balance) { toast.error("Not enough balance"); return; }
                const bal = +(cfg.balance + (t === "deposit" ? a : -a)).toFixed(2);
                update({ balance: bal, ...(t === "deposit" ? { historyDeposit: +(cfg.historyDeposit + a).toFixed(2) } : {}) });
                setDraft((d) => ({ ...d, balance: bal }));
                addHistory({ type: t, amount: a, note }); setAmount("");
                toast.success(`${t === "deposit" ? "Deposited" : "Withdrew"} $${fmt(a)}`);
              }}>{t === "deposit" ? "➕ Deposit" : "➖ Withdrawal"}</button>
            ))}
          </div>
        </div>

        <Label>Simulator Left Menu Logo (Preset, Text, Colors or Custom Image)</Label>
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex gap-2">
            <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-foreground/30 text-sm font-bold" style={{ background: draft.logoBg, color: draft.logoFg }}>
              {draft.logoImage ? <img src={draft.logoImage} alt="Broker logo" className="h-full w-full object-contain" /> : draft.logoText}
            </div>
            <select className="field" value="" onChange={(e) => { const b = BROKERS.find((x) => x.name === e.target.value); if (b) setDraft((d) => ({ ...d, logoText: b.text, logoBg: b.bg, logoFg: b.fg, logoImage: "", company: b.company, server: b.server })); }}>
              <option value="">-- Choose Broker Preset --</option>
              {BROKERS.map((b) => <option key={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className="field" value={draft.logoText} onChange={(e) => set("logoText", e.target.value)} placeholder="Logo text" />
            <input type="color" aria-label="Logo background" className="h-12 w-14 shrink-0 rounded-md border border-border" value={draft.logoBg} onChange={(e) => set("logoBg", e.target.value)} />
            <input type="color" aria-label="Logo text colour" className="h-12 w-14 shrink-0 rounded-md border border-border" value={draft.logoFg} onChange={(e) => set("logoFg", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <input className="field" placeholder="Paste image URL or data" value={draft.logoImage.startsWith("data:") ? "(uploaded image)" : draft.logoImage} onChange={(e) => set("logoImage", e.target.value)} />
            <button className="chip shrink-0" onClick={async () => { try { set("logoImage", (await navigator.clipboard.readText()).trim()); } catch { toast.error("Clipboard not available"); } }}>📋 Paste</button>
            <button className="chip shrink-0" onClick={() => fileRef.current?.click()}>🖼️ Upload</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 500_000) { toast.error("Image must be under 500 KB"); return; } const r = new FileReader(); r.onload = () => set("logoImage", String(r.result)); r.readAsDataURL(f); }} />
          </div>
          <button className="chip text-destructive" aria-label="Remove logo image" onClick={() => set("logoImage", "")}>✕</button>
        </div>

        <Label>Account Name</Label>
        <input className="field" value={draft.accountName} onChange={(e) => set("accountName", e.target.value)} />
        <Label>Broker Company Name</Label>
        <input className="field" value={draft.company} onChange={(e) => set("company", e.target.value)} />
        <Label>Account Login & Server</Label>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" value={draft.login} onChange={(e) => set("login", e.target.value)} />
          <input className="field" value={draft.server} onChange={(e) => set("server", e.target.value)} placeholder="e.g. Exness-MT5Real" />
        </div>
        <Label>Account Email & Phone</Label>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="email" placeholder="Email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
          <input className="field" placeholder="Phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <Label>Balance (USD)</Label>
        <input className="field" type="number" step="0.01" value={draft.balance} onChange={(e) => set("balance", +e.target.value)} />
        <Label>Charge (Initial+Deposit)</Label>
        <input className="field" type="number" value={draft.charge} onChange={(e) => set("charge", +e.target.value)} />
        <Label>History Deposit Row</Label>
        <input className="field" type="number" value={draft.historyDeposit} onChange={(e) => set("historyDeposit", +e.target.value)} />
        <Label>History Swap / Commission</Label>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="number" value={draft.swap} onChange={(e) => set("swap", +e.target.value)} />
          <input className="field" type="number" value={draft.commission} onChange={(e) => set("commission", +e.target.value)} />
        </div>
        <button className="btn-primary mt-4 w-full py-3" onClick={() => {
          const { accountName, company, login, server, email, phone, balance, charge, historyDeposit, swap, commission, logoText, logoBg, logoFg, logoImage } = draft;
          update({ accountName, company, login, server, email, phone, balance, charge, historyDeposit, swap, commission, logoText, logoBg, logoFg, logoImage });
          toast.success("Changes saved to simulator");
        }}>💾 Save Changes to Simulator</button>

        <hr className="my-5 border-border" />
        <Label>🔐 Change Controller Lock Password</Label>
        <div className="flex gap-2">
          <input type="password" className="field" placeholder="Enter new password..." value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <button className="chip shrink-0" onClick={async () => { if (newPw.length < 4) { toast.error("At least 4 characters"); return; } const r = await changeFn({ data: { password: sessionPassword.get(), next: newPw } }); if (!r.ok) { toast.error("Could not update password"); return; } sessionPassword.set(newPw); setNewPw(""); toast.success("Password updated"); }}>Update</button>
        </div>
        
      </section>

      <SimulatorLink />

      <section id="ota" className="panel">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-success" />
          <span className="font-bold text-muted-foreground">Current Version:</span>
          <span className="rounded-md border border-primary bg-primary-soft px-2 font-mono">{APP_VERSION}</span>
          <span className="font-mono text-primary">sync #{cfg.version}</span>
        </div>
        <p className="mt-1 font-mono text-sm text-muted-foreground">Last sync {new Date(cfg.updatedAt).getTime() ? new Date(cfg.updatedAt).toLocaleString() : "never"}</p>
        <button className="btn-primary mt-4 w-full py-3 text-lg" disabled={checking} onClick={async () => {
          setChecking(true);
          const r = await priceFn({ data: { symbol: sym.code } });
          if (r.price != null) { setLive(r.price); setSim(r.price); }
          setChecking(false);
          toast.success(`You're on the latest version (${APP_VERSION}). Prices refreshed.`);
        }}>{checking ? "Checking…" : "⬇️ CHECK & PULL OTA UPDATES"}</button>
      </section>
    </main>
  );
}
