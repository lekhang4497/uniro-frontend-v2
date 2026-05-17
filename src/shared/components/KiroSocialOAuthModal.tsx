"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Check, Copy, Loader2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

type Step = "loading" | "input" | "success" | "error";

interface AuthData {
  authUrl: string;
  codeVerifier: string;
  [key: string]: unknown;
}

export interface KiroSocialOAuthModalProps {
  isOpen: boolean;
  provider: "google" | "github";
  onSuccess?: () => void;
  onClose: () => void;
}

/**
 * Kiro Social OAuth Modal (Google/GitHub)
 * Handles manual callback URL flow for social login.
 */
export default function KiroSocialOAuthModal({
  isOpen,
  provider,
  onSuccess,
  onClose,
}: KiroSocialOAuthModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [authUrl, setAuthUrl] = useState("");
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    if (!isOpen || !provider) return;

    const initAuth = async () => {
      try {
        setError(null);
        setStep("loading");

        const res = await fetch(`/api/oauth/kiro/social-authorize?provider=${provider}`);
        const data = (await res.json()) as { error?: string } & AuthData;

        if (!res.ok) {
          throw new Error(data.error);
        }

        setAuthData(data);
        setAuthUrl(data.authUrl);
        setStep("input");

        window.open(data.authUrl, "_blank");
      } catch (err) {
        setError((err as Error).message);
        setStep("error");
      }
    };

    initAuth();
  }, [isOpen, provider]);

  const handleManualSubmit = async () => {
    try {
      setError(null);

      let url: URL;
      try {
        url = new URL(callbackUrl);
      } catch {
        throw new Error("Invalid callback URL format");
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        throw new Error(url.searchParams.get("error_description") || errorParam);
      }

      if (!code) {
        throw new Error("No authorization code found in URL");
      }

      const res = await fetch("/api/oauth/kiro/social-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          codeVerifier: authData?.codeVerifier,
          provider,
          state,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);

      setStep("success");
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
      setStep("error");
    }
  };

  const providerName = provider === "google" ? "Google" : "GitHub";

  return (
    <Modal isOpen={isOpen} title={`Connect Kiro via ${providerName}`} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {step === "loading" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-blue)]/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[var(--accent-blue)] animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Initializing...</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Setting up {providerName} authentication
            </p>
          </div>
        )}

        {step === "input" && (
          <>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Step 1: Open this URL in your browser</p>
                <div className="flex gap-2">
                  <Input value={authUrl} readOnly className="flex-1" inputClassName="font-mono text-xs" />
                  <Button
                    variant="secondary"
                    icon={copied === "auth_url" ? Check : Copy}
                    onClick={() => copy(authUrl, "auth_url")}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Step 2: Paste the callback URL here</p>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  After authorization, copy the full URL from your browser address bar.
                </p>
                <Input
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="kiro://kiro.kiroAgent/authenticate-success?code=..."
                  inputClassName="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} fullWidth disabled={!callbackUrl}>
                Connect
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-green)]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connected Successfully!</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Your Kiro account via {providerName} has been connected.
            </p>
            <Button onClick={onClose} fullWidth>
              Done
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-red)]/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-[var(--accent-red)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-sm text-[var(--accent-red)] mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => setStep("input")} variant="secondary" fullWidth>
                Try Again
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
