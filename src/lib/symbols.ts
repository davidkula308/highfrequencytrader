export type Sym = { code: string; label: string; source: "metal" | "fx"; apiId: string; digits: number; pip: number; contract: number };
export const SYMBOLS: Sym[] = [
  { code: "XAUUSD", label: "XAUUSD (Spot Gold)", source: "metal", apiId: "XAU", digits: 2, pip: 0.1, contract: 100 },
  { code: "XAGUSD", label: "XAGUSD (Spot Silver)", source: "metal", apiId: "XAG", digits: 3, pip: 0.01, contract: 5000 },
  { code: "BTCUSD", label: "BTCUSD (Bitcoin)", source: "metal", apiId: "BTC", digits: 2, pip: 1, contract: 1 },
  { code: "ETHUSD", label: "ETHUSD (Ethereum)", source: "metal", apiId: "ETH", digits: 2, pip: 0.1, contract: 1 },
  { code: "EURUSD", label: "EURUSD (Euro / Dollar)", source: "fx", apiId: "EUR/USD", digits: 5, pip: 0.0001, contract: 100000 },
  { code: "GBPUSD", label: "GBPUSD (Pound / Dollar)", source: "fx", apiId: "GBP/USD", digits: 5, pip: 0.0001, contract: 100000 },
  { code: "USDJPY", label: "USDJPY (Dollar / Yen)", source: "fx", apiId: "USD/JPY", digits: 3, pip: 0.01, contract: 100000 },
  { code: "AUDUSD", label: "AUDUSD (Aussie / Dollar)", source: "fx", apiId: "AUD/USD", digits: 5, pip: 0.0001, contract: 100000 },
  { code: "USDCHF", label: "USDCHF (Dollar / Franc)", source: "fx", apiId: "USD/CHF", digits: 5, pip: 0.0001, contract: 100000 },
  { code: "USDCAD", label: "USDCAD (Dollar / Loonie)", source: "fx", apiId: "USD/CAD", digits: 5, pip: 0.0001, contract: 100000 },
];

export const BROKERS = [
  { name: "Exness (Yellow)", text: "exness", bg: "#FFDE02", fg: "#000000", company: "Exness Technologies Limited", server: "Exness-MT5Real" },
  { name: "XM (Red)", text: "XM", bg: "#D51F26", fg: "#FFFFFF", company: "XM Global Limited", server: "XMGlobal-MT5" },
  { name: "IC Markets", text: "IC Markets", bg: "#0B1F3A", fg: "#FFFFFF", company: "Raw Trading Ltd", server: "ICMarketsSC-MT5" },
  { name: "FBS (Green)", text: "FBS", bg: "#16A34A", fg: "#FFFFFF", company: "FBS Markets Inc.", server: "FBS-Real" },
  { name: "HFM (Red)", text: "HFM", bg: "#E11D2E", fg: "#FFFFFF", company: "HF Markets (SV) Ltd", server: "HFMarketsSV-Live" },
  { name: "Deriv", text: "deriv", bg: "#FF444F", fg: "#FFFFFF", company: "Deriv (SVG) LLC", server: "Deriv-Server" },
  { name: "Vantage", text: "VANTAGE", bg: "#002A5C", fg: "#FFFFFF", company: "Vantage Global Prime", server: "VantageInternational-Live" },
  { name: "Octa (Blue)", text: "octa", bg: "#1E5EFF", fg: "#FFFFFF", company: "Octa Markets Inc.", server: "OctaFX-Real" },
  { name: "JustMarkets", text: "JustMarkets", bg: "#111827", fg: "#FACC15", company: "Just Global Markets Ltd", server: "JustMarkets-Live" },
  { name: "Pepperstone", text: "pepperstone", bg: "#0A0A23", fg: "#FFFFFF", company: "Pepperstone Group Ltd", server: "Pepperstone-MT5-Live" },
];
