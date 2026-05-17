// Centralised Supabase configuration. Returns `null` when connected mode is
// disabled or env vars are missing, so callers can degrade gracefully.
//
// Supabase is migrating from legacy keys (anon JWT / service-role JWT) to JWT
// Signing Keys with the `sb_publishable_*` / `sb_secret_*` format. We prefer
// the new vars and fall back to the legacy ones so this code keeps working on
// both projects during the transition.

function pickPublishable() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null
  );
}

function pickSecret() {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = pickPublishable();
  const connected = process.env.UNIRO_CONNECTED_MODE === "true";
  if (!url || !anonKey) return null;
  return { url, anonKey, connected };
}

export function isConnectedMode() {
  // Both vars carry the same intent. The non-public one is read on the server
  // (middleware, route handlers); the NEXT_PUBLIC_ one is the only thing
  // visible to client components, since Next.js doesn't inline unprefixed
  // env vars into the browser bundle.
  return (
    process.env.UNIRO_CONNECTED_MODE === "true" ||
    process.env.NEXT_PUBLIC_UNIRO_CONNECTED_MODE === "true"
  );
}

export function getServiceRoleKey() {
  return pickSecret();
}

export function getGatewaySecret() {
  return process.env.UNIRO_GATEWAY_SECRET || null;
}
