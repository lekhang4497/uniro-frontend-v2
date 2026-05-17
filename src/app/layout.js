import { DM_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "material-symbols/outlined.css";
import "material-symbols/rounded.css";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import "@/lib/initCloudSync"; // Auto-initialize cloud sync
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";
import { FontsReady } from "@/components/FontsReady";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

// Body sans — DM Sans, matching the Anthropic-handoff prototype.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Display serif — Source Serif 4. Used for brand mark + h1 headings.
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// Mono — JetBrains Mono. For tabular numbers, code, kbd, URL fields.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Uniro - AI Infrastructure Management",
  description: "One endpoint for all your AI providers. Manage keys, monitor usage, and scale effortlessly.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#141413",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${serif.variable} ${mono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <RuntimeI18nProvider>
            {children}
          </RuntimeI18nProvider>
        </ThemeProvider>
        <FontsReady />
      </body>
    </html>
  );
}
