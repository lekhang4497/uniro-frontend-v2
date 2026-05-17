"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

interface AuthData {
  authUrl?: string;
  redirectUri: string;
  codeVerifier?: string;
  state?: string;
  codexServerSide?: boolean;
}

interface DeviceData {
  device_code: string;
  user_code: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  interval?: number;
  codeVerifier?: string;
  _clientId?: string;
  _clientSecret?: string;
  _region?: string;
  _authMethod?: string;
  _startUrl?: string;
}

interface CallbackPayload {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export interface OAuthProviderInfo {
  name?: string;
}

export interface OAuthMeta {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  [key: string]: unknown;
}

export interface OAuthIdcConfig {
  startUrl: string;
  region?: string;
}

export interface OAuthModalProps {
  isOpen: boolean;
  provider?: string;
  providerInfo?: OAuthProviderInfo;
  onSuccess?: () => void;
  onClose: () => void;
  oauthMeta?: OAuthMeta | null;
  idcConfig?: OAuthIdcConfig | null;
}

type Step = "waiting" | "input" | "success" | "error";

/**
 * OAuth Modal Component
 * - Localhost: Auto callback via popup message
 * - Remote: Manual paste callback URL
 */
export default function OAuthModal({
  isOpen,
  provider,
  providerInfo,
  onSuccess,
  onClose,
  oauthMeta,
  idcConfig,
}: OAuthModalProps) {
  const [step, setStep] = useState<Step>("waiting");
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeviceCode, setIsDeviceCode] = useState(false);
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [polling, setPolling] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollingAbortRef = useRef(false);
  const { copied, copy } = useCopyToClipboard();

  const [isLocalhost, setIsLocalhost] = useState(false);
  const [placeholderUrl, setPlaceholderUrl] = useState("/callback?code=...");
  const callbackProcessedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLocalhost(
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      );
      setPlaceholderUrl(`${window.location.origin}/callback?code=...`);
    }
  }, []);

  const exchangeTokens = useCallback(
    async (code: string, state?: string) => {
      if (!authData) return;
      try {
        const res = await fetch(`/api/oauth/${provider}/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirectUri: authData.redirectUri,
            codeVerifier: authData.codeVerifier,
            state,
            ...(oauthMeta ? { meta: oauthMeta } : {}),
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
    },
    [authData, provider, onSuccess, oauthMeta]
  );

  const startPolling = useCallback(
    async (
      deviceCode: string,
      codeVerifier: string | undefined,
      interval: number,
      extraData: Record<string, unknown> | null
    ) => {
      pollingAbortRef.current = false;
      setPolling(true);
      const maxAttempts = 60;

      for (let i = 0; i < maxAttempts; i++) {
        if (pollingAbortRef.current) {
          console.log("[OAuthModal] Polling aborted");
          setPolling(false);
          return;
        }

        await new Promise<void>((r) => setTimeout(r, interval * 1000));

        if (pollingAbortRef.current) {
          console.log("[OAuthModal] Polling aborted after sleep");
          setPolling(false);
          return;
        }

        try {
          const res = await fetch(`/api/oauth/${provider}/poll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceCode, codeVerifier, extraData }),
          });

          const data = (await res.json()) as {
            success?: boolean;
            error?: string;
            errorDescription?: string;
          };

          if (data.success) {
            pollingAbortRef.current = true;
            setStep("success");
            setPolling(false);
            onSuccess?.();
            return;
          }

          if (data.error === "expired_token" || data.error === "access_denied") {
            throw new Error(data.errorDescription || data.error);
          }

          if (data.error === "slow_down") {
            interval = Math.min(interval + 5, 30);
          }
        } catch (err) {
          setError((err as Error).message);
          setStep("error");
          setPolling(false);
          return;
        }
      }

      setError("Authorization timeout");
      setStep("error");
      setPolling(false);
    },
    [provider, onSuccess]
  );

  const startOAuthFlow = useCallback(async () => {
    if (!provider) return;
    try {
      setError(null);

      const deviceCodeProviders = [
        "github",
        "qwen",
        "kiro",
        "kimi-coding",
        "kilocode",
        "codebuddy",
      ];
      if (deviceCodeProviders.includes(provider)) {
        setIsDeviceCode(true);
        setStep("waiting");

        const deviceCodeUrl = new URL(
          `/api/oauth/${provider}/device-code`,
          window.location.origin
        );
        if (provider === "kiro" && idcConfig?.startUrl) {
          deviceCodeUrl.searchParams.set("start_url", idcConfig.startUrl);
          if (idcConfig.region) {
            deviceCodeUrl.searchParams.set("region", idcConfig.region);
          }
          deviceCodeUrl.searchParams.set("auth_method", "idc");
        }
        const res = await fetch(deviceCodeUrl.toString());
        const data = (await res.json()) as DeviceData & { error?: string };
        if (!res.ok) throw new Error(data.error);

        setDeviceData(data);

        const verifyUrl = data.verification_uri_complete || data.verification_uri;
        if (verifyUrl) window.open(verifyUrl, "_blank", "noopener,noreferrer");

        const extraData =
          provider === "kiro"
            ? {
                _clientId: data._clientId,
                _clientSecret: data._clientSecret,
                _region: data._region,
                _authMethod: data._authMethod,
                _startUrl: data._startUrl,
              }
            : null;
        startPolling(data.device_code, data.codeVerifier, data.interval || 5, extraData);
        return;
      }

      const appPort = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
      let redirectUri: string;
      if (provider === "codex") {
        redirectUri = "http://localhost:1455/auth/callback";
      } else {
        redirectUri = `http://localhost:${appPort}/callback`;
      }

      const authorizeUrl = new URL(`/api/oauth/${provider}/authorize`, window.location.origin);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      if (oauthMeta) {
        Object.entries(oauthMeta).forEach(([k, v]) => {
          if (v) authorizeUrl.searchParams.set(k, String(v));
        });
      }
      const res = await fetch(authorizeUrl.toString());
      const data = (await res.json()) as AuthData & { error?: string };
      if (!res.ok) throw new Error(data.error);

      let codexProxyActive = false;
      let codexServerSide = false;
      if (provider === "codex" && data.state && data.codeVerifier) {
        try {
          const proxyUrl = new URL(`/api/oauth/codex/start-proxy`, window.location.origin);
          proxyUrl.searchParams.set("app_port", String(appPort));
          proxyUrl.searchParams.set("state", data.state);
          proxyUrl.searchParams.set("code_verifier", data.codeVerifier);
          proxyUrl.searchParams.set("redirect_uri", redirectUri);
          const proxyRes = await fetch(proxyUrl.toString());
          const proxyData = (await proxyRes.json()) as { success?: boolean; serverSide?: boolean };
          codexProxyActive = !!proxyData.success;
          codexServerSide = !!proxyData.serverSide;
        } catch {
          codexProxyActive = false;
        }
      }

      setAuthData({ ...data, redirectUri, codexServerSide });

      if (provider === "codex" && codexProxyActive) {
        setStep("waiting");
        if (data.authUrl) {
          popupRef.current = window.open(data.authUrl, "oauth_popup", "width=600,height=700");
        }
        if (!popupRef.current) {
          setStep("input");
        }
      } else if (!isLocalhost || provider === "codex") {
        setStep("input");
        if (data.authUrl) window.open(data.authUrl, "_blank");
      } else {
        setStep("waiting");
        if (data.authUrl) {
          popupRef.current = window.open(data.authUrl, "oauth_popup", "width=600,height=700");
        }
        if (!popupRef.current) {
          setStep("input");
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setStep("error");
    }
  }, [provider, isLocalhost, startPolling, oauthMeta, idcConfig]);

  useEffect(() => {
    if (isOpen && provider) {
      setAuthData(null);
      setCallbackUrl("");
      setError(null);
      setIsDeviceCode(false);
      setDeviceData(null);
      setPolling(false);
      pollingAbortRef.current = false;
      startOAuthFlow();
    } else if (!isOpen) {
      pollingAbortRef.current = true;
      if (provider === "codex") {
        fetch("/api/oauth/codex/stop-proxy").catch(() => {});
      }
    }
  }, [isOpen, provider, startOAuthFlow]);

  // Codex server-side mode: poll status
  useEffect(() => {
    if (!authData?.codexServerSide || !authData?.state) return;
    if (callbackProcessedRef.current) return;
    let cancelled = false;
    const POLL_INTERVAL_MS = 1500;
    const MAX_ATTEMPTS = 200;
    let attempts = 0;

    const tick = async () => {
      if (cancelled || callbackProcessedRef.current) return;
      attempts += 1;
      try {
        const res = await fetch(
          `/api/oauth/codex/poll-status?state=${encodeURIComponent(authData.state || "")}`
        );
        const data = (await res.json()) as { status?: string; error?: string };
        if (cancelled || callbackProcessedRef.current) return;
        if (data.status === "done") {
          callbackProcessedRef.current = true;
          setStep("success");
          onSuccess?.();
          return;
        }
        if (data.status === "error") {
          callbackProcessedRef.current = true;
          setError(data.error || "Authentication failed");
          setStep("error");
          return;
        }
      } catch {
        // ignore
      }
      if (attempts >= MAX_ATTEMPTS) {
        callbackProcessedRef.current = true;
        setError("Authentication timeout");
        setStep("error");
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
    };
  }, [authData, onSuccess]);

  // Listen for OAuth callback
  useEffect(() => {
    if (!authData) return;
    callbackProcessedRef.current = false;

    const handleCallback = async (data: CallbackPayload) => {
      if (callbackProcessedRef.current) return;

      const { code, state, error: callbackError, errorDescription } = data;

      if (callbackError) {
        callbackProcessedRef.current = true;
        setError(errorDescription || callbackError);
        setStep("error");
        return;
      }

      if (code) {
        callbackProcessedRef.current = true;
        await exchangeTokens(code, state);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const isLocalhostOrigin =
        event.origin.includes("localhost") || event.origin.includes("127.0.0.1");
      const isSameOrigin = event.origin === window.location.origin;
      if (!isLocalhostOrigin && !isSameOrigin) return;

      const data = event.data as { type?: string; data?: CallbackPayload };
      if (data?.type === "oauth_callback" && data.data) {
        handleCallback(data.data);
      }
    };
    window.addEventListener("message", handleMessage);

    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("oauth_callback");
      channel.onmessage = (event: MessageEvent<CallbackPayload>) => handleCallback(event.data);
    } catch {
      console.log("BroadcastChannel not supported");
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "oauth_callback" && event.newValue) {
        try {
          const data = JSON.parse(event.newValue) as CallbackPayload;
          handleCallback(data);
          localStorage.removeItem("oauth_callback");
        } catch {
          console.log("Failed to parse localStorage data");
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    try {
      const stored = localStorage.getItem("oauth_callback");
      if (stored) {
        const data = JSON.parse(stored) as CallbackPayload & { timestamp?: number };
        if (data.timestamp && Date.now() - data.timestamp < 30000) {
          handleCallback(data);
        }
        localStorage.removeItem("oauth_callback");
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      if (channel) channel.close();
    };
  }, [authData, exchangeTokens]);

  const handleManualSubmit = async () => {
    try {
      setError(null);
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        throw new Error(url.searchParams.get("error_description") || errorParam);
      }

      if (!code) {
        throw new Error("No authorization code found in URL");
      }

      await exchangeTokens(code, state || undefined);
    } catch (err) {
      setError((err as Error).message);
      setStep("error");
    }
  };

  const handleClose = useCallback(() => {
    if (provider === "codex") {
      fetch("/api/oauth/codex/stop-proxy").catch(() => {});
    }
    onClose();
  }, [onClose, provider]);

  if (!provider || !providerInfo) return null;
  const deviceLoginUrl = deviceData?.verification_uri_complete || deviceData?.verification_uri || "";

  return (
    <Modal isOpen={isOpen} title={`Connect ${providerInfo.name}`} onClose={handleClose} size="lg">
      <div className="flex flex-col gap-4">
        {(step === "waiting" || step === "input") && !isDeviceCode && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 border border-[var(--bg-secondary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)]/50">
              <Loader2 className="h-4 w-4 text-[var(--accent-blue)] animate-spin" />
              <span className="text-sm">Waiting for popup authorization…</span>
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[var(--bg-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                Or paste callback URL manually
              </span>
              <div className="flex-1 h-px bg-[var(--bg-secondary)]" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Step 1: Open this URL in your browser</p>
                <div className="flex gap-2">
                  <Input
                    value={authData?.authUrl || ""}
                    readOnly
                    className="flex-1"
                    inputClassName="font-mono text-xs"
                  />
                  <Button
                    variant="secondary"
                    icon={copied === "auth_url" ? Check : Copy}
                    onClick={() => copy(authData?.authUrl || "", "auth_url")}
                    disabled={!authData?.authUrl}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Step 2: Paste the callback URL here</p>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  After authorization, copy the full URL from your browser.
                </p>
                <Input
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder={placeholderUrl}
                  inputClassName="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} fullWidth disabled={!callbackUrl}>
                Connect
              </Button>
              <Button onClick={handleClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === "waiting" && isDeviceCode && deviceData && (
          <>
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Visit the login URL below and authorize:
              </p>
              <div className="bg-[var(--bg-secondary)] p-4 rounded-[var(--radius-md)] mb-4">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm break-all">{deviceLoginUrl}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied === "login_url" ? Check : Copy}
                    onClick={() => copy(deviceLoginUrl, "login_url")}
                    disabled={!deviceLoginUrl}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={ExternalLink}
                    onClick={() =>
                      window.open(deviceLoginUrl, "_blank", "noopener,noreferrer")
                    }
                    disabled={!deviceLoginUrl}
                  >
                    Open
                  </Button>
                </div>
              </div>
              <div className="bg-[var(--accent-blue)]/10 p-4 rounded-[var(--radius-md)]">
                <p className="text-xs text-[var(--text-secondary)] mb-1">Your Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-mono font-bold text-[var(--accent-blue)]">
                    {deviceData.user_code}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copied === "user_code" ? Check : Copy}
                    onClick={() => copy(deviceData.user_code, "user_code")}
                  />
                </div>
              </div>
            </div>
            {polling && (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="animate-spin h-4 w-4" />
                Waiting for authorization...
              </div>
            )}
          </>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[var(--accent-green)]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connected Successfully!</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Your {providerInfo.name} account has been connected.
            </p>
            <Button onClick={handleClose} fullWidth>
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
              <Button onClick={startOAuthFlow} variant="secondary" fullWidth>
                Try Again
              </Button>
              <Button onClick={handleClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
