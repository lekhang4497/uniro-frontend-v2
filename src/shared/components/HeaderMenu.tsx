"use client";

import { useState, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import {
  History,
  Languages,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Grid3x3,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { useTheme } from "@/shared/hooks/useTheme";
import ChangelogModal from "./ChangelogModal";
import NineRemotePromoModal from "./NineRemotePromoModal";
import LanguageSwitcher from "./LanguageSwitcher";

interface LocaleInfo {
  name: string;
  flag: string;
}

const LOCALE_INFO: Record<string, LocaleInfo> = {
  en: { name: "English", flag: "🇺🇸" },
  vi: { name: "Tiếng Việt", flag: "🇻🇳" },
  "zh-CN": { name: "简体中文", flag: "🇨🇳" },
  "zh-TW": { name: "繁體中文", flag: "🇹🇼" },
  ja: { name: "日本語", flag: "🇯🇵" },
  "pt-BR": { name: "Português (BR)", flag: "🇧🇷" },
  "pt-PT": { name: "Português (PT)", flag: "🇵🇹" },
  ko: { name: "한국어", flag: "🇰🇷" },
  es: { name: "Español", flag: "🇪🇸" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  fr: { name: "Français", flag: "🇫🇷" },
  he: { name: "עברית", flag: "🇮🇱" },
  ar: { name: "العربية", flag: "🇸🇦" },
  ru: { name: "Русский", flag: "🇷🇺" },
  pl: { name: "Polski", flag: "🇵🇱" },
  cs: { name: "Čeština", flag: "🇨🇿" },
  nl: { name: "Nederlands", flag: "🇳🇱" },
  tr: { name: "Türkçe", flag: "🇹🇷" },
  uk: { name: "Українська", flag: "🇺🇦" },
  tl: { name: "Tagalog", flag: "🇵🇭" },
  id: { name: "Indonesia", flag: "🇮🇩" },
  th: { name: "ไทย", flag: "🇹🇭" },
  hi: { name: "हिन्दी", flag: "🇮🇳" },
  bn: { name: "বাংলা", flag: "🇧🇩" },
  ur: { name: "اردو", flag: "🇵🇰" },
  ro: { name: "Română", flag: "🇷🇴" },
  sv: { name: "Svenska", flag: "🇸🇪" },
  it: { name: "Italiano", flag: "🇮🇹" },
  el: { name: "Ελληνικά", flag: "🇬🇷" },
  hu: { name: "Magyar", flag: "🇭🇺" },
  fi: { name: "Suomi", flag: "🇫🇮" },
  da: { name: "Dansk", flag: "🇩🇰" },
  no: { name: "Norsk", flag: "🇳🇴" },
};

function getLocaleFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : "en";
  return normalizeLocale(value);
}

interface MenuItemProps {
  Icon: ComponentType<LucideProps>;
  label: string;
  onClick: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}

function MenuItem({ Icon, label, onClick, trailing, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
        danger
          ? "text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
          : "text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
      }`}
    >
      <Icon
        className={`h-5 w-5 ${danger ? "" : "text-[var(--text-secondary)]"}`}
      />
      <span className="flex-1 text-left">{label}</span>
      {trailing && <span className="text-base">{trailing}</span>}
    </button>
  );
}

export interface HeaderMenuProps {
  onLogout: () => void;
}

export default function HeaderMenu({ onLogout }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [locale, setLocale] = useState("en");
  const { toggleTheme, isDark } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, [langOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const close = () => setIsOpen(false);
  const localeMeta = LOCALE_INFO[locale];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center justify-center p-2 rounded-[var(--radius)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Menu"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-60 bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] z-50 overflow-hidden py-1">
            <MenuItem
              Icon={History}
              label="Change Log"
              onClick={() => {
                close();
                setChangelogOpen(true);
              }}
            />
            <MenuItem
              Icon={Languages}
              label={localeMeta?.name ?? locale}
              trailing={localeMeta?.flag ?? "🌐"}
              onClick={() => {
                close();
                setLangOpen(true);
              }}
            />
            <MenuItem
              Icon={isDark ? Sun : Moon}
              label="Theme"
              onClick={() => {
                toggleTheme();
                close();
              }}
            />
            <MenuItem
              Icon={Monitor}
              label="Remote"
              onClick={() => {
                close();
                setRemoteOpen(true);
              }}
            />
            <MenuItem
              Icon={LogOut}
              label="Logout"
              danger
              onClick={() => {
                close();
                onLogout();
              }}
            />
          </div>
        )}
      </div>

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <NineRemotePromoModal isOpen={remoteOpen} onClose={() => setRemoteOpen(false)} />
      <LanguageSwitcher hideTrigger isOpen={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}
