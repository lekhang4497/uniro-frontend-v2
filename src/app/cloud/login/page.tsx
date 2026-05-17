"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <UniroMark size={44} className="text-[var(--text-primary)]" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Uniro Cloud
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Sign in with your Uniro account
          </p>
        </div>

        <Card className="p-6">
          {disabled ? (
            <p className="py-6 text-center text-[13px] text-[var(--text-secondary)]">
              Connected mode is not configured. Set{" "}
              <code className="rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px]">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[11px]">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              to enable cloud login.
            </p>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                <Link
                  href="/cloud/register"
                  className="text-[var(--accent-blue)] hover:underline"
                >
                  Create one
                </Link>
              </p>
              <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                <Link href="/login" className="hover:underline">
                  &larr; back to self-hosted login
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
