"use client";

import { useState } from "react";
import { Key, LockOpen } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import OAuthModal from "./OAuthModal";

const GITLAB_COM = "https://gitlab.com";

function getRedirectUri(): string {
  if (typeof window === "undefined") return "http://localhost/callback";
  const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
  return `http://localhost:${port}/callback`;
}

interface OAuthMeta {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  [key: string]: unknown;
}

export interface GitLabProviderInfo {
  name?: string;
}

export interface GitLabAuthModalProps {
  isOpen: boolean;
  providerInfo?: GitLabProviderInfo;
  onSuccess?: () => void;
  onClose: () => void;
}

type Mode = null | "oauth" | "pat";

/**
 * GitLab Duo Authentication Modal
 * Supports OAuth (PKCE) or Personal Access Token.
 */
export default function GitLabAuthModal({
  isOpen,
  providerInfo,
  onSuccess,
  onClose,
}: GitLabAuthModalProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [baseUrl, setBaseUrl] = useState(GITLAB_COM);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOAuth, setShowOAuth] = useState(false);
  const [oauthMeta, setOauthMeta] = useState<OAuthMeta | null>(null);

  const reset = () => {
    setMode(null);
    setBaseUrl(GITLAB_COM);
    setClientId("");
    setClientSecret("");
    setPat("");
    setError(null);
    setLoading(false);
    setShowOAuth(false);
    setOauthMeta(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOAuthStart = () => {
    if (!clientId.trim()) {
      setError("Client ID is required");
      return;
    }
    setError(null);
    setOauthMeta({
      baseUrl: baseUrl.trim() || GITLAB_COM,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });
    setShowOAuth(true);
  };

  const handlePATSubmit = async () => {
    if (!pat.trim()) {
      setError("Personal Access Token is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/gitlab/pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pat.trim(), baseUrl: baseUrl.trim() || GITLAB_COM }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Authentication failed");
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showOAuth && oauthMeta) {
    return (
      <OAuthModal
        isOpen
        provider="gitlab"
        providerInfo={providerInfo}
        oauthMeta={oauthMeta}
        onSuccess={() => {
          onSuccess?.();
          handleClose();
        }}
        onClose={() => {
          setShowOAuth(false);
          setOauthMeta(null);
        }}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} title="Connect GitLab Duo" onClose={handleClose} size="lg">
      <div className="flex flex-col gap-4">
        {!mode && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Choose how to authenticate with GitLab Duo:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("oauth")}
                className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/5 transition-colors text-left"
              >
                <LockOpen className="h-6 w-6 text-[var(--accent-blue)]" />
                <div>
                  <p className="text-sm font-medium">OAuth App</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Use a GitLab OAuth application
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("pat")}
                className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/5 transition-colors text-left"
              >
                <Key className="h-6 w-6 text-[var(--accent-blue)]" />
                <div>
                  <p className="text-sm font-medium">Personal Access Token</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Use a GitLab PAT with api scope
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {mode === "oauth" && (
          <>
            <p className="text-xs text-[var(--text-secondary)]">
              Create an OAuth app at{" "}
              <a
                href={`${baseUrl.trim() || GITLAB_COM}/-/profile/applications`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-blue)] underline"
              >
                GitLab Applications
              </a>{" "}
              with redirect URI{" "}
              <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">
                {getRedirectUri()}
              </code>
            </p>
            <Input
              label="GitLab Base URL"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={GITLAB_COM}
            />
            <Input
              label="Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your OAuth application client ID"
            />
            <Input
              label="Client Secret (optional for PKCE)"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Leave empty for public PKCE app"
            />
            {error && <p className="text-sm text-[var(--accent-red)]">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleOAuthStart} fullWidth disabled={!clientId.trim()}>
                Authorize
              </Button>
              <Button
                onClick={() => {
                  setMode(null);
                  setError(null);
                }}
                variant="ghost"
                fullWidth
              >
                Back
              </Button>
            </div>
          </>
        )}

        {mode === "pat" && (
          <>
            <p className="text-xs text-[var(--text-secondary)]">
              Create a PAT at{" "}
              <a
                href={`${baseUrl.trim() || GITLAB_COM}/-/user_settings/personal_access_tokens`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-blue)] underline"
              >
                GitLab Access Tokens
              </a>{" "}
              with scopes:{" "}
              <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">api</code>,{" "}
              <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">read_user</code>, and{" "}
              <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">ai_features</code>.
            </p>
            <Input
              label="GitLab Base URL"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={GITLAB_COM}
            />
            <Input
              label="Personal Access Token"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              type="password"
            />
            {error && <p className="text-sm text-[var(--accent-red)]">{error}</p>}
            <div className="flex gap-2">
              <Button
                onClick={handlePATSubmit}
                fullWidth
                disabled={!pat.trim() || loading}
                loading={loading}
              >
                Connect
              </Button>
              <Button
                onClick={() => {
                  setMode(null);
                  setError(null);
                }}
                variant="ghost"
                fullWidth
              >
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
