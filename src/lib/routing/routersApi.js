"use client";

// Browser-side CRUD for user routers. Uses supabase-js with RLS, so all
// queries are automatically scoped to the signed-in user.

import { getBrowserSupabase } from "@/lib/supabase/client";

function requireClient() {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    throw new Error("connected_mode_not_configured");
  }
  return supabase;
}

export async function listRouters() {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("routers")
    .select("id, name, description, engine, fallback_model, version, is_default, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRouter(id) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("routers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw error;
  return data;
}

export async function createRouter({ name, description, engine = "local", fallbackModel = "gpt-4o-mini", configYaml }) {
  const supabase = requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data, error } = await supabase
    .from("routers")
    .insert({
      user_id: user.id,
      name,
      description,
      engine,
      fallback_model: fallbackModel,
      config_yaml: configYaml,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRouter(id, patch) {
  const supabase = requireClient();
  // Only allow these fields. version bumps automatically on config change.
  const allowed = {};
  for (const k of ["name", "description", "engine", "fallback_model", "config_yaml", "is_default"]) {
    if (patch[k] !== undefined) allowed[k] = patch[k];
  }
  const { data, error } = await supabase
    .from("routers")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRouter(id) {
  const supabase = requireClient();
  const { error } = await supabase
    .from("routers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setDefaultRouter(id) {
  const supabase = requireClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  // Clear existing default, set new one. Two-step because of the unique index.
  await supabase
    .from("routers")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true);
  const { data, error } = await supabase
    .from("routers")
    .update({ is_default: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
