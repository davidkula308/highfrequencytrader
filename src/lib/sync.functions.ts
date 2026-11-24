import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function verify(pw: string) {
  const db = await admin();
  const { data } = await db.from("controller_state").select("password_hash").eq("id", "default").single();
  return !!data && data.password_hash === (await sha(pw));
}

export const checkPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => ({ ok: await verify(data.password) }));

export const loadRemoteConfig = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verify(data.password))) return { ok: false as const, config: null, pushUrl: "", hasPushKey: false };
    const db = await admin();
    const { data: row } = await db.from("controller_state").select("config, push_url, push_key").eq("id", "default").single();
    return { ok: true as const, config: JSON.stringify(row?.config ?? {}), pushUrl: row?.push_url ?? "", hasPushKey: !!row?.push_key };
  });

export const pushRemoteConfig = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(100), config: z.string().max(800_000) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verify(data.password))) return { ok: false };
    let parsed: unknown;
    try { parsed = JSON.parse(data.config); } catch { return { ok: false }; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false };
    const db = await admin();
    const { error } = await db.from("controller_state").update({ config: parsed as never, updated_at: new Date().toISOString() }).eq("id", "default");
    if (error) { console.error(error); return { ok: false }; }
    const delivered = await deliver(parsed);
    return { ok: true, delivered };
  });

/** Sends the config straight to the simulator's receiver endpoint, if one is set. */
async function deliver(config: unknown): Promise<"sent" | "failed" | "off"> {
  const db = await admin();
  const { data } = await db.from("controller_state").select("push_url, push_key").eq("id", "default").single();
  if (!data?.push_url) return "off";
  try {
    const r = await fetch(data.push_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.push_key}` },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("simulator push failed", r.status, await r.text());
    return r.ok ? "sent" : "failed";
  } catch (e) { console.error("simulator push error", e); return "failed"; }
}

export const setPushTarget = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(100), url: z.string().max(500), key: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verify(data.password))) return { ok: false, test: "off" as const };
    if (data.url && !/^https:\/\//.test(data.url)) return { ok: false, test: "off" as const };
    const db = await admin();
    const patch: { push_url: string; push_key?: string } = { push_url: data.url };
    if (data.key !== undefined && data.key !== "") patch.push_key = data.key;
    await db.from("controller_state").update(patch).eq("id", "default");
    const { data: row } = await db.from("controller_state").select("config").eq("id", "default").single();
    return { ok: true, test: await deliver(row?.config ?? {}) };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(100), next: z.string().min(4).max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verify(data.password))) return { ok: false };
    const db = await admin();
    await db.from("controller_state").update({ password_hash: await sha(data.next) }).eq("id", "default");
    return { ok: true };
  });
