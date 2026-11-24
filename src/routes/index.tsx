import { createFileRoute } from "@tanstack/react-router";
import { Controller } from "@/components/hft/Controller";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "High Frequency Chess Bot — Simulator Remote" },
      { name: "description", content: "Control the MT5-style trading simulator: brokers, trades per wave, lot size and live market prices." },
      { property: "og:title", content: "High Frequency Chess Bot — Simulator Remote" },
      { property: "og:description", content: "Remote control for the HFT trading simulator with live market prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Controller,
});
