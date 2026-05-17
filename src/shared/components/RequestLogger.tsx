"use client";

import { useState, useEffect } from "react";
import Card from "./Card";

export default function RequestLogger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/usage/request-logs");
      if (res.ok) {
        const data = (await res.json()) as string[];
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(false);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Request Logs</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2 cursor-pointer">
            <span>Auto Refresh (3s)</span>
            <div
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                autoRefresh
                  ? "bg-[var(--accent-blue)]"
                  : "bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)]"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      <Card className="overflow-hidden bg-[var(--bg-tertiary)]">
        <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">No logs recorded yet.</div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-[var(--bg-tertiary)] border-b border-[var(--bg-secondary)] z-10">
                <tr>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">DateTime</th>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">Model</th>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">Provider</th>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">Account</th>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">In</th>
                  <th className="px-3 py-2 border-r border-[var(--bg-secondary)]">Out</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-secondary)]/50">
                {logs.map((log, i) => {
                  const parts = log.split(" | ");
                  if (parts.length < 7) return null;

                  const status = parts[6] ?? "";
                  const isPending = status.includes("PENDING");
                  const isFailed = status.includes("FAILED");
                  const isSuccess = status.includes("OK");

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-[var(--accent-blue)]/5 transition-colors ${
                        isPending ? "bg-[var(--accent-blue)]/5" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 border-r border-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        {parts[0]}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[var(--bg-secondary)] font-medium">
                        {parts[1]}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[var(--bg-secondary)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--bg-secondary)] text-[10px] uppercase font-bold">
                          {parts[2]}
                        </span>
                      </td>
                      <td
                        className="px-3 py-1.5 border-r border-[var(--bg-secondary)] truncate max-w-[150px]"
                        title={parts[3]}
                      >
                        {parts[3]}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[var(--bg-secondary)] text-right text-[var(--accent-blue)]">
                        {parts[4]}
                      </td>
                      <td className="px-3 py-1.5 border-r border-[var(--bg-secondary)] text-right text-[var(--accent-green)]">
                        {parts[5]}
                      </td>
                      <td
                        className={`px-3 py-1.5 font-bold ${
                          isSuccess
                            ? "text-[var(--accent-green)]"
                            : isFailed
                              ? "text-[var(--accent-red)]"
                              : "text-[var(--accent-blue)] animate-pulse"
                        }`}
                      >
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <div className="text-[10px] text-[var(--text-secondary)] italic">
        Logs are loaded from the request history database.
      </div>
    </div>
  );
}
