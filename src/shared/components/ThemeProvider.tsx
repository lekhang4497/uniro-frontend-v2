"use client";

import { useEffect, type ReactNode } from "react";
import useThemeStore from "@/store/themeStore";

/**
 * Thin wrapper around the persisted zustand theme store. The actual
 * theme state (light / dark / system), the persistence to localStorage
 * and the `.dark` class sync on `<html>` all live in `@/store/themeStore`
 * and `@/shared/hooks/useTheme`. This provider's only job is to call
 * `initTheme()` on first render so the persisted theme is applied to
 * the document before children paint.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const initTheme = useThemeStore((s: { initTheme: () => void }) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <>{children}</>;
}

export default ThemeProvider;
