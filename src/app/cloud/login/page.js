"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/shared/components";
import { UniroMark } from "@/shared/components/UniroMark";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function CloudLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = getBrowserSupabase();
  const disabled = !supabase;

  const handleLogin = async (e) => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <UniroMark size={48} className="text-primary mb-3" />
          <h1 className="text-3xl font-bold text-primary mb-2">Uniro Cloud</h1>
          <p className="text-text-muted">Sign in with your Uniro account</p>
        </div>

        <Card>
          {disabled ? (
            <p className="text-sm text-text-muted text-center py-6">
              Connected mode is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and
              <code> NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable cloud login.
            </p>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-xs text-text-muted text-center">
                No account?{" "}
                <Link href="/cloud/register" className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
              <p className="text-xs text-text-muted text-center">
                <Link href="/login" className="hover:underline">
                  ← back to self-hosted login
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
