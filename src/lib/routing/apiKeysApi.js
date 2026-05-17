"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

function requireClient() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("connected_mode_not_configured");
  return s;
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b = Array.from(bytes, (x) => x.toString(36)).join("").slice(0, 40);
  return `uno_${b}`;
}

export async function listApiKeys() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select(`
      id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at, default_router_id,
      api_key_scopes ( scope_type, scope_value )
    `)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Creates an API key and returns BOTH the plaintext key (visible once) and the
// stored row. The plaintext is never persisted on the client.
export async function createApiKey({ name, defaultRouterId, scopes = [], expiresAt = null }) {
  const supabase = requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const plaintext = generateApiKey();
  const keyHash = await sha256Hex(plaintext);
  const keyPrefix = plaintext.slice(0, 12);

  const { data: row, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      default_router_id: defaultRouterId || null,
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error) throw error;

  if (scopes.length > 0) {
    const rows = scopes.map((s) => ({
      api_key_id: row.id,
      scope_type: s.scope_type,
      scope_value: s.scope_value,
    }));
    const { error: scopeErr } = await supabase.from("api_key_scopes").insert(rows);
    if (scopeErr) throw scopeErr;
  }

  return { plaintext, row };
}

export async function revokeApiKey(id) {
  const supabase = requireClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setApiKeyScopes(id, scopes) {
  const supabase = requireClient();
  // Replace strategy: delete then insert.
  const { error: delErr } = await supabase.from("api_key_scopes").delete().eq("api_key_id", id);
  if (delErr) throw delErr;
  if (scopes.length === 0) return;
  const rows = scopes.map((s) => ({
    api_key_id: id,
    scope_type: s.scope_type,
    scope_value: s.scope_value,
  }));
  const { error } = await supabase.from("api_key_scopes").insert(rows);
  if (error) throw error;
}
