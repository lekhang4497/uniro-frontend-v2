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

export const STORAGE_KEY = "uniro:router-builder:v3";

// Drag-and-drop payload types. Six flavors from the palette:
//   "signal:<type>"        — drop creates a signal node
//   "projection:<type>"   — drop creates a projection node
//   "route"               — drop creates a route with `when: always`
//   "model"               — drop creates a model node
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
