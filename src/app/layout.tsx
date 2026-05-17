import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";
import "@/lib/initCloudSync"; // Auto-initialize cloud sync
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

export const metadata: Metadata = {
  title: "Uniro - AI Infrastructure Management",
  description:
    "One endpoint for all your AI providers. Manage keys, monitor usage, and scale effortlessly.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <RuntimeI18nProvider>{children}</RuntimeI18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
