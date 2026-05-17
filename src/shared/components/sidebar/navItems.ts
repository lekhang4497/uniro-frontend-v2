import {
  Network,
  Plug2,
  Layers,
  Workflow,
  TerminalSquare,
  MessageSquare,
  Hash,
  Image as ImageIcon,
  Mic,
  Volume2,
  Globe2,
  Activity,
  Gauge,
  ShieldCheck,
  MonitorPlay,
  Share2,
  Wrench,
  Languages,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show a small status dot next to the label (e.g. "ok" = green pulse) */
  dot?: "ok";
  /** Hide unless the named runtime feature flag is enabled */
  requiresFlag?: "enableTranslator";
};

export type NavGroupContext = {
  isAdmin: boolean;
  pathname: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  visibleWhen?: (ctx: NavGroupContext) => boolean;
};

// Navigation map. Mirrors the routes actually mounted under
// src/app/(dashboard)/dashboard/** plus the optional /admin tree.
// Items are grouped by purpose, matching the prior Sidebar layout
// (Endpoint / Beyond text / Observability / Workspace) and add a
// conditional Admin group when the viewer has admin access.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Endpoint",
    items: [
      { href: "/dashboard/endpoint", label: "Endpoint", icon: Network },
      { href: "/dashboard/providers", label: "Providers", icon: Plug2 },
      { href: "/dashboard/combos", label: "Combos", icon: Layers },
      { href: "/dashboard/router-builder", label: "Router builder", icon: Workflow },
      { href: "/dashboard/cli-tools", label: "CLI tools", icon: TerminalSquare },
      { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    label: "Beyond text",
    items: [
      { href: "/dashboard/media-providers/embedding", label: "Embeddings", icon: Hash },
      { href: "/dashboard/media-providers/image", label: "Images", icon: ImageIcon },
      { href: "/dashboard/media-providers/tts", label: "Voice TTS", icon: Volume2 },
      { href: "/dashboard/media-providers/stt", label: "Voice STT", icon: Mic },
      { href: "/dashboard/media-providers/web", label: "Web & Search", icon: Globe2 },
    ],
  },
  {
    label: "Observability",
    items: [
      { href: "/dashboard/usage", label: "Usage", icon: Activity },
      { href: "/dashboard/quota", label: "Quota", icon: Gauge },
      { href: "/dashboard/mitm", label: "MITM proxy", icon: ShieldCheck, dot: "ok" },
      { href: "/dashboard/console-log", label: "Console", icon: MonitorPlay },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard/proxy-pools", label: "Proxy pools", icon: Share2 },
      { href: "/dashboard/skills", label: "Agent skills", icon: Wrench },
      {
        href: "/dashboard/translator",
        label: "Translator",
        icon: Languages,
        requiresFlag: "enableTranslator",
      },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/profile", label: "Profile", icon: UserRound },
    ],
  },
  {
    label: "Admin",
    visibleWhen: ({ isAdmin }) => isAdmin,
    items: [
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/admin/users", label: "Users", icon: UserRound },
      { href: "/admin/plans", label: "Plans", icon: Gauge },
    ],
  },
];
