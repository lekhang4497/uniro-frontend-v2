"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Info, Loader2 } from "lucide-react";

type CallbackStatus = "processing" | "success" | "manual" | "done";

type CallbackData = {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
  fullUrl: string;
};

/**
 * OAuth Callback Page Content
 */
function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>("processing");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const callbackData: CallbackData = {
      code,
      state,
      error,
      errorDescription,
      fullUrl: window.location.href,
    };

    // Trusted origins that may receive this callback. The OAuth code/state
    // must only be relayed to the dashboard window we expect to be the opener
    // (same origin) or the Codex helper that listens on a fixed loopback port.
    // Any other origin is treated as hostile (drive-by attacker that opened
    // the popup against the well-known redirect_uri to phish the code).
    const expectedOrigins = [
      window.location.origin, // Same origin (for most providers)
      "http://localhost:1455", // Codex specific port
    ];

    // Method 1: postMessage to opener (popup mode)
    // Send once per expected origin. The browser delivers the message only
    // when the opener's origin matches the targetOrigin we pass — using "*"
    // here would leak the code/state to any opener (e.g. an attacker page
    // that opened this URL in a popup), so iterate over the allowlist.
    if (window.opener) {
      for (const origin of expectedOrigins) {
        try {
          window.opener.postMessage(
            { type: "oauth_callback", data: callbackData },
            origin
          );
        } catch (e) {
          console.log("postMessage failed:", e);
        }
      }
    }

    // Method 2: BroadcastChannel (same origin tabs)
    try {
      const channel = new BroadcastChannel("oauth_callback");
      channel.postMessage(callbackData);
      channel.close();
    } catch (e) {
      console.log("BroadcastChannel failed:", e);
    }

    // Method 3: localStorage event (fallback)
    try {
      localStorage.setItem(
        "oauth_callback",
        JSON.stringify({ ...callbackData, timestamp: Date.now() })
      );
    } catch (e) {
      console.log("localStorage failed:", e);
    }

    if (!(code || error)) {
      setTimeout(() => setStatus("manual"), 0);
      return;
    }

    setStatus("success");
    setTimeout(() => {
      window.close();
      setTimeout(() => setStatus("done"), 500);
    }, 1500);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
      <div className="w-full max-w-[420px] text-center">
        {status === "processing" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-blue)]" />
            </div>
            <h1 className="mb-2 text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Processing...
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Please wait while we complete the authorization.
            </p>
          </>
        )}

        {(status === "success" || status === "done") && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-green)]/10">
              <CheckCircle2 className="h-7 w-7 text-[var(--accent-green)]" />
            </div>
            <h1 className="mb-2 text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Authorization Successful
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              {status === "success"
                ? "This window will close automatically..."
                : "You can close this tab now."}
            </p>
          </>
        )}

        {status === "manual" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-orange)]/10">
              <Info className="h-7 w-7 text-[var(--accent-orange)]" />
            </div>
            <h1 className="mb-2 text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              Copy This URL
            </h1>
            <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
              Please copy the URL from the address bar and paste it in the
              application.
            </p>
            <div className="rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-3 text-left">
              <code className="break-all font-mono text-[11px] text-[var(--text-primary)]">
                {typeof window !== "undefined" ? window.location.href : ""}
              </code>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * OAuth Callback Page
 * Receives callback from OAuth providers and sends data back via multiple methods
 */
export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-blue)]" />
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
