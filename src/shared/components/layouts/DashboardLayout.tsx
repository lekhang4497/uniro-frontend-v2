"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useNotificationStore } from "@/store/notificationStore";
import Sidebar from "../Sidebar";
import Header from "../Header";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastStyle {
  wrapper: string;
  Icon: typeof CheckCircle2;
}

function getToastStyle(type: ToastType | string | undefined): ToastStyle {
  if (type === "success") {
    return {
      wrapper:
        "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/10 text-[var(--accent-green)]",
      Icon: CheckCircle2,
    };
  }
  if (type === "error") {
    return {
      wrapper:
        "border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 text-[var(--accent-red)]",
      Icon: AlertCircle,
    };
  }
  if (type === "warning") {
    return {
      wrapper:
        "border-[var(--accent-orange)]/30 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]",
      Icon: AlertTriangle,
    };
  }
  return {
    wrapper:
      "border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]",
    Icon: Info,
  };
}

interface Notification {
  id: string;
  type?: ToastType | string;
  title?: string;
  message?: string;
  dismissible?: boolean;
}

interface NotificationStoreShape {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export interface DashboardLayoutProps {
  children: ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "uniro:sidebar:collapsed";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Persist the desktop collapsed state across reloads. Hydrate from
  // localStorage on first client render — undefined / "false" → expanded,
  // "true" → collapsed.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch { /* SSR / disabled storage */ }
  }, []);
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  };
  const pathname = usePathname();
  const notifications = useNotificationStore(
    (state: NotificationStoreShape) => state.notifications
  );
  const removeNotification = useNotificationStore(
    (state: NotificationStoreShape) => state.removeNotification
  );

  // Full-bleed routes: the chat UI, the router builder, and the legacy
  // basic-chat — all want the entire viewport with no outer padding.
  const fullBleed =
    pathname === "/dashboard/basic-chat" ||
    pathname === "/dashboard/chat" ||
    pathname === "/dashboard/router-builder";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      <div className="fixed top-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          const ToastIcon = style.Icon;
          return (
            <div
              key={n.id}
              className={`rounded-[var(--radius-md)] border px-3 py-2 backdrop-blur-sm ${style.wrapper}`}
            >
              <div className="flex items-start gap-2">
                <ToastIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {n.title ? (
                    <p className="text-xs font-semibold mb-0.5">{n.title}</p>
                  ) : null}
                  <p className="text-xs whitespace-pre-wrap break-words">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-300 isolate overflow-hidden">
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div
          className={`flex-1 overflow-y-auto custom-scrollbar ${
            fullBleed ? "flex flex-col overflow-hidden" : "p-6 lg:p-10"
          }`}
        >
          <div className={fullBleed ? "flex-1 w-full h-full flex flex-col" : "max-w-7xl mx-auto"}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
