"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

let _client = null;

export function getBrowserSupabase() {
  if (_client) return _client;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  _client = createBrowserClient(cfg.url, cfg.anonKey);
  return _client;
}
