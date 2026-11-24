import { describe, it, expect } from "vitest";
import { isWinner, pickSide } from "@/lib/trade-engine";

describe("trade rules", () => {
  it("4W:1L makes exactly 1 loser per 5 trades", () => {
    const r = [0, 1, 2, 3, 4].map((i) => isWinner("winlose", "both", i));
    expect(r.filter((x) => !x).length).toBe(1);
  });
  it("100% win never loses", () => {
    expect([0, 1, 2, 3, 4].every((i) => isWinner("win", "both", i))).toBe(true);
  });
  it("buy only always buys", () => {
    expect(pickSide("buy", -5)).toBe("BUY");
  });
});
