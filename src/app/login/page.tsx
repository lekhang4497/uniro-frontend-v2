"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { UniroMark } from "@/shared/components/UniroMark";

type SettingsResponse = {
  requireLogin?: boolean;
  hasPassword?: boolean;
};

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/settings`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: SettingsResponse = await res.json();
          if (data.requireLogin === false) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
          setHasPassword(!!data.hasPassword);
        } else {
          // Safe fallback on non-OK response to avoid infinite loading state.
          setHasPassword(true);
        }
      } catch {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
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

  // Show loading state while checking password
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
            Enter your password to access the dashboard
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <p className="mt-2 text-center text-[12px] text-[var(--text-tertiary)]">
              Default password is{" "}
              <code className="rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
                123456
              </code>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
