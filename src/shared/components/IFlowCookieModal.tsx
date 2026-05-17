"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

/**
 * iFlow Cookie Authentication Modal
 * User pastes browser cookie to get fresh API key.
 */
export interface IFlowCookieModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function IFlowCookieModal({ isOpen, onSuccess, onClose }: IFlowCookieModalProps) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setCookie("");
    setError(null);
    setSuccess(false);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!cookie.trim()) {
      setError("Please paste your cookie");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/oauth/iflow/cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: cookie.trim() }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="iFlow Cookie Authentication">
      <div className="space-y-4">
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Authentication Successful!</p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Fresh API key obtained</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">
                To get a fresh API key, paste your browser cookie from{" "}
                <a
                  href="https://platform.iflow.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-blue)] hover:underline"
                >
                  platform.iflow.cn
                </a>
              </p>
              <div className="bg-[var(--bg-secondary)] p-3 rounded-[var(--radius-md)] text-xs space-y-2">
                <p className="font-medium text-[var(--text-primary)]">How to get cookie:</p>
                <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
                  <li>Open platform.iflow.cn in your browser</li>
                  <li>Login to your account</li>
                  <li>Open DevTools (F12) → Application/Storage → Cookies</li>
                  <li>Copy the entire cookie string (must include BXAuth)</li>
                  <li>Paste it below</li>
                </ol>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Cookie String
              </label>
              <textarea
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="BXAuth=xxx; ..."
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--bg-secondary)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)] resize-none"
                rows={4}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-[var(--radius-md)]">
                <p className="text-sm text-[var(--accent-red)]">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={handleClose} disabled={loading} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={loading} fullWidth>
                Authenticate
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
