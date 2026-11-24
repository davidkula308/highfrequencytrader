import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SYMBOLS } from "./symbols";

export const getLivePrice = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ symbol: z.string().max(12) }).parse(d))
  .handler(async ({ data }) => {
    const s = SYMBOLS.find((x) => x.code === data.symbol);
    if (!s) return { price: null as number | null, error: "Unknown symbol" };
    try {
      if (s.source === "metal") {
        const r = await fetch(`https://api.gold-api.com/price/${s.apiId}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { price: number };
        return { price: j.price, error: null };
      }
      const [base, quote] = s.apiId.split("/");
      const r = await fetch(`https://api.frankfurter.dev/v1/latest?from=${base}&to=${quote}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { rates: Record<string, number> };
      return { price: j.rates[quote!] ?? null, error: null };
    } catch (e) {
      console.error("price fetch failed", e);
      return { price: null, error: "Price service unavailable" };
    }
  });
