/**
 * Route → breadcrumb resolver.
 *
 * Splits a pathname into an array of `{ label, href }` crumbs by walking the
 * segments left-to-right. Known segments use a curated label; unknown
 * segments fall back to the URL-decoded raw segment (so dynamic IDs like
 * `[id]` still render, just unfriendly).
 *
 * The Header consumes this; pages should not call it directly.
 */

const LABEL_MAP: Record<string, string> = {
  dashboard: "Workspace",
  providers: "Providers",
  combos: "Combos",
  usage: "Usage",
  quota: "Quota",
  "router-builder": "Router builder",
  translator: "Translator",
  mitm: "MITM",
  chat: "Chat",
  "basic-chat": "Basic chat",
  "cli-tools": "CLI tools",
  "proxy-pools": "Proxy pools",
  "console-log": "Console log",
  endpoint: "Endpoint",
  skills: "Skills",
  settings: "Settings",
  profile: "Profile",
  "media-providers": "Media providers",
  admin: "Admin",
  users: "Users",
  plans: "Plans",
  new: "New",
  // Common media-provider "kinds" — these appear as path segments under
  // /dashboard/media-providers/[kind]. Listing them keeps breadcrumbs
  // readable without needing a runtime lookup.
  web: "Web",
  image: "Image",
  video: "Video",
  audio: "Audio",
  embedding: "Embedding",
  combo: "Combo",
};

export type Crumb = { label: string; href: string };

export function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const part of parts) {
    acc += "/" + part;
    crumbs.push({
      href: acc,
      label: LABEL_MAP[part] ?? safeDecode(part),
    });
  }
  return crumbs;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
