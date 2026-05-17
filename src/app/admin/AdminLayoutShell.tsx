"use client";

// Client shell for /admin/* routes. Mirrors DashboardLayout but flips
// `isAdmin` on Sidebar so the Admin nav group is visible. Layout shape
// (sidebar + header + scrollable main) is kept in lockstep with the
// dashboard shell so the two areas feel like one app.
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/shared/components/Sidebar";
import Header from "@/shared/components/Header";

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div className="hidden lg:flex">
        <Sidebar isAdmin />
      </div>

      {/* Sidebar — mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar isAdmin onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-300 isolate overflow-hidden">
        <Header key={pathname} onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
