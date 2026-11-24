import { createFileRoute } from "@tanstack/react-router";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Cache-Control": "no-store" };

// Read-only feed the simulator app polls. Holds only the display settings the owner chose to publish.
export const Route = createFileRoute("/api/public/simulator-config")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("controller_state").select("config, updated_at").eq("id", "default").single();
        if (error || !data) return Response.json({ error: "unavailable" }, { status: 503, headers: cors });
        return Response.json({ ...(data.config as object), serverUpdatedAt: data.updated_at }, { headers: cors });
      },
    },
  },
});
