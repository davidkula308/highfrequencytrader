import { useEffect, useState, useCallback } from "react";
import { pushRemoteConfig } from "./sync.functions";

export type ThemeMode = "auto" | "dark" | "light";
export type ExecMode = "buy" | "sell" | "both" | "candle" | "winlose";
export type Outcome = "win" | "winlose";

export type Config = {
  execMode: ExecMode;
  outcome: Outcome;
  symbol: string;
  lot: number;
  entryPips: number;
  tradesPerWave: number;
  cooldownSec: number;
  holdSec: number;
  startTime: string;
  continuity: "single" | "continuous";
  simTheme: ThemeMode;
  ctrlTheme: ThemeMode;
  logoText: string;
  logoBg: string;
  logoFg: string;
  logoImage: string;
  accountName: string;
  company: string;
  login: string;
  server: string;
  email: string;
  phone: string;
  balance: number;
  charge: number;
  historyDeposit: number;
  swap: number;
  commission: number;
  botRunning: boolean;
  closeAllNonce: number;
  version: number;
  updatedAt: string;
};

export type HistoryRow = { id: string; type: "deposit" | "withdrawal" | "reset"; amount: number; note: string; at: string };

export const DEFAULT_CONFIG: Config = {
  execMode: "both", outcome: "win", symbol: "XAUUSD", lot: 0.01, entryPips: 1.5, tradesPerWave: 6,
  cooldownSec: 5, holdSec: 12, startTime: "", continuity: "continuous", simTheme: "auto", ctrlTheme: "auto",
  logoText: "exness", logoBg: "#FFDE02", logoFg: "#000000", logoImage: "", accountName: "Abdul Hakim",
  company: "Exness Technologies Limited", login: "134683126", server: "Exness-MT5Real", email: "", phone: "",
  balance: 2466.33, charge: 0, historyDeposit: 0, swap: 0, commission: 0, botRunning: false, closeAllNonce: 0, version: 1,
  updatedAt: new Date(0).toISOString(),
};

const KEY = "hfcb.config.v1";
const HKEY = "hfcb.history.v1";
const listeners = new Set<() => void>();
let current: Config | null = null;

function load(): Config {
  if (current) return current;
  try { current = { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { current = { ...DEFAULT_CONFIG }; }
  return current!;
}

const SKEY = "hfcb.session.pw";
export const sessionPassword = { get: () => sessionStorage.getItem(SKEY) || "", set: (p: string) => sessionStorage.setItem(SKEY, p) };
let pushTimer: ReturnType<typeof setTimeout> | undefined;
export const syncStatus = { state: "idle" as "idle" | "saving" | "saved" | "error", delivered: "off" as "sent" | "failed" | "off", listeners: new Set<() => void>() };
function setSync(st: typeof syncStatus.state) { syncStatus.state = st; syncStatus.listeners.forEach((l) => l()); }

function schedulePush() {
  clearTimeout(pushTimer);
  setSync("saving");
  pushTimer = setTimeout(async () => {
    try {
      const r = await pushRemoteConfig({ data: { password: sessionPassword.get(), config: JSON.stringify(load()) } });
      if (r.ok && "delivered" in r) syncStatus.delivered = r.delivered;
      setSync(r.ok ? "saved" : "error");
    } catch { setSync("error"); }
  }, 400);
}

/** Replace local config with the online copy (used after unlocking). */
export function hydrateConfig(remote: Partial<Config>) {
  current = { ...DEFAULT_CONFIG, ...load(), ...remote };
  localStorage.setItem(KEY, JSON.stringify(current));
  listeners.forEach((l) => l());
}

/** Publishes the config: saved on this device and pushed online for the simulator to read. */
export function publishConfig(patch: Partial<Config>) {
  const next = { ...load(), ...patch, version: load().version + 1, updatedAt: new Date().toISOString() };
  current = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
  schedulePush();
  return next;
}

export function useConfig() {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setCfg(load()); setReady(true);
    const l = () => setCfg(load());
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const update = useCallback((p: Partial<Config>) => publishConfig(p), []);
  return { cfg, update, ready };
}

export function getHistory(): HistoryRow[] {
  try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch { return []; }
}
export function addHistory(r: Omit<HistoryRow, "id" | "at">) {
  const rows = [{ ...r, id: crypto.randomUUID(), at: new Date().toISOString() }, ...getHistory()];
  localStorage.setItem(HKEY, JSON.stringify(rows.slice(0, 100)));
  return rows;
}
export function useSyncStatus() {
  const [st, setSt] = useState(syncStatus.state);
  useEffect(() => { const l = () => setSt(syncStatus.state); syncStatus.listeners.add(l); return () => { syncStatus.listeners.delete(l); }; }, []);
  return st;
}
