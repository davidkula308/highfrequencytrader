import type { Config } from "./controller-store";

export type Position = { id: string; side: "BUY" | "SELL"; symbol: string; lot: number; open: number; openedAt: number; win: boolean };

/** Decide trade direction from execution mode. */
export function pickSide(mode: Config["execMode"], lastMove: number): "BUY" | "SELL" {
  if (mode === "buy") return "BUY";
  if (mode === "sell") return "SELL";
  if (mode === "candle") return lastMove >= 0 ? "BUY" : "SELL";
  return Math.random() < 0.5 ? "BUY" : "SELL";
}

/** 4W:1L means exactly one loser in every block of 5 trades (the 5th). */
export function isWinner(outcome: Config["outcome"], mode: Config["execMode"], tradeIndex: number) {
  if (outcome === "winlose" || mode === "winlose") return tradeIndex % 5 !== 4;
  return true;
}

export function entryPrice(side: "BUY" | "SELL", live: number, pips: number, pip: number) {
  return side === "BUY" ? live - pips * pip : live + pips * pip;
}
