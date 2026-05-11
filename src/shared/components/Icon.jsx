"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Bookmark,
  Bot,
  Brain,
  Bug,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  Code,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  Heart,
  Home,
  Info,
  Key,
  KeyRound,
  Languages,
  Link as LinkIcon,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Minus,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plug,
  Plus,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Square,
  Star,
  Sun,
  Terminal,
  Trash2,
  Upload,
  UserCircle,
  Users,
  Waypoints,
  Wrench,
  X,
  Zap,
} from "lucide-react";

// Material Symbols name -> Lucide React component.
// Keep additions to the most commonly used Material Symbols names in
// the codebase. Unmapped names fall back to a Material Symbols <span>
// so legacy callsites keep rendering until the migration is complete.
const ICON_MAP = {
  add: Plus,
  add_circle: PlusCircle,
  remove: Minus,
  close: X,
  check: Check,
  check_circle: CheckCircle,
  delete: Trash2,
  edit: Pencil,
  search: Search,
  settings: Settings,
  home: Home,
  info: Info,
  error: AlertCircle,
  warning: AlertTriangle,
  expand_more: ChevronDown,
  expand_less: ChevronUp,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  keyboard_arrow_down: ChevronDown,
  keyboard_arrow_up: ChevronUp,
  keyboard_arrow_right: ChevronRight,
  keyboard_arrow_left: ChevronLeft,
  arrow_forward: ArrowRight,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  arrow_downward: ArrowDown,
  refresh: RefreshCw,
  content_copy: Copy,
  copy: Copy,
  download: Download,
  upload: Upload,
  more_vert: MoreVertical,
  more_horiz: MoreHorizontal,
  menu: Menu,
  visibility: Eye,
  visibility_off: EyeOff,
  key: Key,
  password: KeyRound,
  link: LinkIcon,
  open_in_new: ExternalLink,
  launch: ExternalLink,
  hub: Waypoints,
  dark_mode: Moon,
  light_mode: Sun,
  language: Languages,
  translate: Languages,
  account_circle: UserCircle,
  group: Users,
  logout: LogOut,
  login: LogIn,
  play_arrow: Play,
  pause: Pause,
  stop: Square,
  send: Send,
  notifications: Bell,
  star: Star,
  favorite: Heart,
  bookmark: Bookmark,
  share: Share2,
  filter_list: Filter,
  filter_alt: Filter,
  sort: ArrowUpDown,
  swap_vert: ArrowUpDown,
  cloud: Cloud,
  folder: Folder,
  description: FileText,
  article: FileText,
  code: Code,
  terminal: Terminal,
  bug_report: Bug,
  build: Wrench,
  api: Plug,
  smart_toy: Bot,
  psychology: Brain,
  auto_awesome: Sparkles,
  bolt: Zap,
  flash_on: Zap,
  save: Save,
  progress_activity: Loader2,
  sync: RefreshCw,
};

// Generic Icon component. Accepts either:
//   <Icon name="add" />                   — Material Symbols-style string
//   <Icon icon={Plus} />                  — direct Lucide component
// Renders a Lucide React icon when a mapping exists, otherwise falls
// back to a Material Symbols span (legacy escape hatch).
export function Icon({ name, icon: IconComp, size = 16, className, ...props }) {
  const Comp = IconComp || (name ? ICON_MAP[name] : null);

  if (Comp) {
    return <Comp size={size} className={className} aria-hidden="true" {...props} />;
  }

  // Legacy fallback: render the Material Symbols glyph by name.
  if (name) {
    return (
      <span
        aria-hidden="true"
        className={["material-symbols-outlined", className].filter(Boolean).join(" ")}
        style={{ fontSize: `${size}px` }}
        {...props}
      >
        {name}
      </span>
    );
  }

  return null;
}

export default Icon;
