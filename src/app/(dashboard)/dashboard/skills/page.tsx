"use client";

import { Card, Badge } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import type { ComponentType } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Network,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  Volume2,
  ScatterChart,
  Search,
  Globe,
  Sparkles,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import {
  SKILLS,
  SKILLS_REPO_URL,
  getSkillRawUrl,
  getSkillBlobUrl,
} from "@/shared/constants/skills";

type Skill = {
  id: string;
  name: string;
  description: string;
  icon: string;
  isEntry?: boolean;
  endpoint?: string | null;
};

// Map Material Symbols names (from the skills constants source-of-truth)
// to Lucide components for this page.
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  hub: Network,
  chat: MessageSquare,
  image: ImageIcon,
  record_voice_over: Volume2,
  mic: Mic,
  scatter_plot: ScatterChart,
  search: Search,
  language: Globe,
};

function CopyButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const { copied, copy } = useCopyToClipboard(2000);
  return (
    <button
      onClick={() => copy(value)}
      className="px-2 py-1 rounded-md bg-[var(--accent-orange)] text-[var(--text-inverted)] text-[11px] font-medium hover:brightness-95 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
      title={value}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const url = getSkillRawUrl(skill.id);
  const IconComp = ICON_MAP[skill.icon] ?? Sparkles;
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-[14px] border transition-colors ${
        skill.isEntry
          ? "border-[var(--accent-orange)]/40 bg-[var(--accent-orange)]/5"
          : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)]"
      }`}
    >
      <div
        className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
          skill.isEntry
            ? "bg-[var(--accent-orange)] text-[var(--text-inverted)]"
            : "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]"
        }`}
      >
        <IconComp size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">{skill.name}</h3>
          {skill.isEntry && (
            <Badge variant="primary" size="sm">START HERE</Badge>
          )}
          {skill.endpoint && (
            <Badge variant="default" size="sm">
              <code className="text-[10px]">{skill.endpoint}</code>
            </Badge>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{skill.description}</p>
        <a
          href={getSkillBlobUrl(skill.id)}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent-orange)] mt-1 inline-flex items-center gap-1 break-all"
        >
          {url}
          <ExternalLink size={12} />
        </a>
      </div>

      <CopyButton value={url} />
    </div>
  );
}

export default function SkillsPage() {
  return (
    <div className="px-8 py-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Skills</h1>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
        Drop-in markdown skills your AI tooling can fetch directly.
      </p>

      <div className="mt-6 max-w-4xl space-y-6">
        <Card padding="md">
          <div className="text-xs text-[var(--text-secondary)] mb-2">Paste this to your AI:</div>
          <div className="px-3 py-2 rounded bg-[var(--bg-muted)] font-mono text-[12px] text-[var(--text-primary)]">
            Read this skill and use it: {getSkillRawUrl("uniro")}
          </div>
        </Card>

        <div className="space-y-2">
          {(SKILLS as Skill[]).map((skill) => (
            <SkillRow key={skill.id} skill={skill} />
          ))}
        </div>

        <Card padding="md">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">More on GitHub</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Browse source, README, and examples.
              </p>
            </div>
            <a
              href={`${SKILLS_REPO_URL}/tree/master/skills`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-orange)] hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink size={16} />
              View on GitHub
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
