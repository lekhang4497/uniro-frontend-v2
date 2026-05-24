"use client";

// Sign-in entry point.
//
// Default mode: Uniro account (Supabase email + password). This is the
// path most users want — multi-tenant cloud, real accounts.
//
// Fallback mode: self-hosted single-password. Same UI the previous
// /login page exposed (one input, default "123456"). Available when
// Supabase isn't configured OR when the user opts out of cloud login
// via the "Use self-hosted password" link.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { UniroMark } from "@/shared/components/UniroMark";
import { getBrowserSupabase } from "@/lib/supabase/client";

type SettingsResponse = {
  requireLogin?: boolean;
  hasPassword?: boolean;
};

type Mode = "cloud" | "selfHosted";

export default function LoginPage() {
  const router = useRouter();
  // `getBrowserSupabase` returns null when connected mode is off (no
  // publishable key configured). In that case we have no choice but to
  // render the self-hosted form.
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const cloudAvailable = !!supabase;
  // Self-hosted server may or may not require a password; we still hit
  // /api/settings to short-circuit "no password required" installs.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>(cloudAvailable ? "cloud" : "selfHosted");

  // Cloud form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Self-hosted form
  const [selfHostedPassword, setSelfHostedPassword] = useState("");

  // Shared
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSelfHostedAuth() {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch("/api/settings", { signal: controller.signal });
        clearTimeout(t);
        if (cancelled) return;
        if (res.ok) {
          const data: SettingsResponse = await res.json();
          if (data.requireLogin === false) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
          setHasPassword(!!data.hasPassword);
        } else {
          setHasPassword(true);
        }
      } catch {
        clearTimeout(t);
        if (!cancelled) setHasPassword(true);
      }
    }
    checkSelfHostedAuth();
    return () => { cancelled = true; };
  }, [router]);

  const handleCloudLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleSelfHostedLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: selfHostedPassword }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data: { error?: string } = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Still resolving "does this install need a password at all?"
  if (hasPassword === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
        <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[13px]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <UniroMark size={44} className="text-[var(--text-primary)]" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Sign in to Uniro
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {mode === "cloud"
              ? "Use your Uniro account to access cloud routers, quota, and chat."
              : "Self-hosted install — enter the local admin password."}
          </p>
        </div>

        <Card className="p-6">
          {mode === "cloud" ? (
            <form onSubmit={handleCloudLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <p className="text-[12px] text-[var(--accent-red)]">{error}</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <p className="text-center text-[12px] text-[var(--text-secondary)]">
                No account?{" "}
                <Link href="/cloud/register" className="text-[var(--accent-blue)] hover:underline">
                  Create one
                </Link>
              </p>
              {hasPassword && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  <button
                    type="button"
                    onClick={() => { setMode("selfHosted"); setError(""); }}
                    className="hover:underline"
                  >
                    Use self-hosted password instead
                  </button>
                </p>
              )}
              {!cloudAvailable && (
                <p className="text-center text-[11.5px] text-[var(--accent-orange)]">
                  Connected mode isn&apos;t configured on this install.
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleSelfHostedLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="selfhost-password">Local admin password</Label>
                <Input
                  id="selfhost-password"
                  type="password"
                  placeholder="Enter password"
                  value={selfHostedPassword}
                  onChange={(e) => setSelfHostedPassword(e.target.value)}
                  required
                  autoFocus
                />
                {error && (
                  <p className="text-[12px] text-[var(--accent-red)]">{error}</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                Default password is{" "}
                <code className="rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                  123456
                </code>
              </p>
              {cloudAvailable && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  <button
                    type="button"
                    onClick={() => { setMode("cloud"); setError(""); }}
                    className="hover:underline"
                  >
                    ← Back to Uniro account sign-in
                  </button>
                </p>
              )}
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
