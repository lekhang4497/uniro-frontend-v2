"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { buildCrumbs } from "@/lib/breadcrumb";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import ThemeToggle from "./ThemeToggle";
import HeaderMenu from "./HeaderMenu";

type HeaderProps = {
  /** Mobile drawer toggle (rendered by DashboardLayout). */
  onMenuClick?: () => void;
  /** Hide the mobile menu button on shells that don't have a drawer. */
  showMenuButton?: boolean;
};

export default function Header({
  onMenuClick,
  showMenuButton = true,
}: HeaderProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const crumbs = buildCrumbs(pathname);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header className="flex h-[56px] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 text-[13px] text-[var(--text-secondary)] lg:px-6">
      {/* Mobile drawer toggle — only on small screens */}
      {showMenuButton && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="-ml-1 flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2"
      >
        {crumbs.map((crumb, idx) => {
          const last = idx === crumbs.length - 1;
          return (
            <span
              key={crumb.href}
              className="flex min-w-0 items-center gap-2"
            >
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  className="text-[var(--text-tertiary)]"
                >
                  /
                </span>
              )}
              {last ? (
                <span className="truncate font-medium text-[var(--text-primary)]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <HeaderSearch />
        {/* className/variant are optional at runtime; pass-through stub keeps
            TS happy until T10 converts ThemeToggle to TSX. */}
        <ThemeToggle className="" />
        <HeaderMenu onLogout={handleLogout} />
      </div>
    </header>
  );
}

/**
 * Page-driven search input. Pages call `useHeaderSearchStore.register(...)`
 * on mount to show it; the store is reset on `unregister()`.
 */
function HeaderSearch() {
  const visible = useHeaderSearchStore(
    (s: { visible: boolean }) => s.visible,
  );
  const query = useHeaderSearchStore((s: { query: string }) => s.query);
  const placeholder = useHeaderSearchStore(
    (s: { placeholder: string }) => s.placeholder,
  );
  const setQuery = useHeaderSearchStore(
    (s: { setQuery: (q: string) => void }) => s.setQuery,
  );

  if (!visible) return null;

  return (
    <div className="relative w-[160px] sm:w-[220px]">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]"
        aria-hidden="true"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] pl-7 pr-7 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:border-[var(--accent-blue)] focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
