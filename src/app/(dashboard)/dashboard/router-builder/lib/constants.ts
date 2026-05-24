// Shared constants for the router builder. Extracted from the original
// monolithic page.js with no behavior change.

import {
  Languages,
  MessagesSquare,
  Sparkles,
  GraduationCap,
  Gauge,
  Lock,
  LockKeyhole,
  Ruler,
  Brain,
  Image as ImageIcon,
  Layers,
  Search,
  Clock,
  Tag,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  Cog,
  Check,
  Library,
  Wand,
  Workflow,
  Boxes,
  Split,
  Calculator,
  Repeat,
  Cpu,
  Zap,
} from "lucide-react";

// v4 drops the canvas-only Model alias `name` (+ unmodelled config fields) and
// adds `modelGroups` for the `modelRefs` form. Old v3 state is migrated on
// load — see migrateLegacyState in lib/state.ts.
export const STORAGE_KEY = "uniro:router-builder:v4";
export const LEGACY_STORAGE_KEYS = ["uniro:router-builder:v3"];

// Singleton ID for the User Query entry node. Edges from this UID to a
// signal mark that signal as "active" — see yaml.ts buildRouterDict.
export const USER_QUERY_NODE_ID = "__user_query__";

// Drag-and-drop payload types. Flavors from the palette:
//   "signal:<type>"        — drop creates a signal node
//   "projection:<type>"   — drop creates a projection node
//   "route"               — drop creates a route with `when: always`
//   "model"               — drop creates a single-model node
//   "modelGroup"          — drop creates a model-group node (the modelRefs form)
//   "plugin:<type>"       — drop creates a plugin node
export const DRAG_TYPE = "application/x-uniro-rb";

// lucide icon lookup
export const ICONS: Record<string, any> = {
  Languages,
  MessagesSquare,
  Sparkles,
  GraduationCap,
  Gauge,
  Lock,
  LockKeyhole,
  Ruler,
  Brain,
  Image: ImageIcon,
  Layers,
  Search,
  Clock,
  Tag,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  Cog,
  Check,
  Library,
  Wand,
  Workflow,
  Boxes,
  Split,
  Calculator,
  Repeat,
  Cpu,
  Zap,
};

export function newUid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
