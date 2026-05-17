"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

/**
 * Cursor Auth Modal
 * Auto-detect and import token from Cursor IDE's local SQLite database.
 */
export interface CursorAuthModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose: () => void;
}

interface AutoImportResponse {
  found?: boolean;
  windowsManual?: boolean;
  accessToken?: string;
  machineId?: string;
  error?: string;
}

export default function CursorAuthModal({ isOpen, onSuccess, onClose }: CursorAuthModalProps) {
  const [accessToken, setAccessToken] = useState("");
  const [machineId, setMachineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [windowsManual, setWindowsManual] = useState(false);

  const runAutoDetect = async () => {
    setAutoDetecting(true);
    setError(null);
    setAutoDetected(false);
    setWindowsManual(false);

    try {
      const res = await fetch("/api/oauth/cursor/auto-import");
      const data = (await res.json()) as AutoImportResponse;

      if (data.found) {
        setAccessToken(data.accessToken ?? "");
        setMachineId(data.machineId ?? "");
        setAutoDetected(true);
      } else if (data.windowsManual) {
        setWindowsManual(true);
      } else {
        setError(data.error || "Could not auto-detect tokens");
      }
    } catch {
      setError("Failed to auto-detect tokens");
    } finally {
      setAutoDetecting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    runAutoDetect();
  }, [isOpen]);

  const handleImportToken = async () => {
    if (!accessToken.trim()) {
      setError("Please enter an access token");
      return;
    }
    if (!machineId.trim()) {
      setError("Please enter a machine ID");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/oauth/cursor/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          machineId: machineId.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Connect Cursor IDE" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {autoDetecting && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[var(--accent-blue)] animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Auto-detecting tokens...</h3>
            <p className="text-sm text-[var(--text-secondary)]">Reading from Cursor IDE database</p>
          </div>
        )}

        {!autoDetecting && (
          <>
            {autoDetected && (
              <div className="bg-[var(--accent-green)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-green)]/30">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[var(--accent-green)] shrink-0" />
                  <p className="text-sm text-[var(--accent-green)]">
                    Tokens auto-detected from Cursor IDE successfully!
                  </p>
                </div>
              </div>
            )}

            {windowsManual && (
              <div className="bg-[var(--accent-orange)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-orange)]/30 flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <Info className="h-5 w-5 text-[var(--accent-orange)]" />
                  <p className="text-sm font-medium text-[var(--accent-orange)]">
                    Could not read Cursor database automatically.
                  </p>
                </div>
                <p className="text-xs text-[var(--accent-orange)]/80">
                  Make sure Cursor IDE has been opened at least once, then click{" "}
                  <strong>Retry</strong>. If the problem persists, paste your tokens manually below.
                </p>
                <Button onClick={runAutoDetect} variant="outline" fullWidth>
                  Retry
                </Button>
              </div>
            )}

            {!autoDetected && !windowsManual && !error && (
              <div className="bg-[var(--accent-blue)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-blue)]/30">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 text-[var(--accent-blue)]" />
                  <p className="text-sm text-[var(--accent-blue)]">
                    Cursor IDE not detected. Please paste your tokens manually.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Access Token <span className="text-[var(--accent-red)]">*</span>
              </label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Access token will be auto-filled..."
                rows={3}
                className="w-full px-3 py-2 text-sm font-mono border border-[var(--bg-secondary)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Machine ID <span className="text-[var(--accent-red)]">*</span>
              </label>
              <Input
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                placeholder="Machine ID will be auto-filled..."
                inputClassName="font-mono text-sm"
              />
            </div>

            {error && (
              <div className="bg-[var(--accent-red)]/10 p-3 rounded-[var(--radius-md)] border border-[var(--accent-red)]/30">
                <p className="text-sm text-[var(--accent-red)]">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImportToken}
                fullWidth
                disabled={importing || !accessToken.trim() || !machineId.trim()}
              >
                {importing ? "Importing..." : "Import Token"}
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
