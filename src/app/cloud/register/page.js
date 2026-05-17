"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/shared/components";
import { UniroMark } from "@/shared/components/UniroMark";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function CloudRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = getBrowserSupabase();
  const disabled = !supabase;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    setInfo("");
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/cloud/callback`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <UniroMark size={48} className="text-primary mb-3" />
          <h1 className="text-3xl font-bold text-primary mb-2">Create account</h1>
          <p className="text-text-muted">Free plan includes 1M Uniro-provider tokens / month</p>
        </div>

        <Card>
          {disabled ? (
            <p className="text-sm text-text-muted text-center py-6">
              Connected mode is not configured. Set Supabase env vars to enable registration.
            </p>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                {info && <p className="text-xs text-emerald-500">{info}</p>}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </Button>
              <p className="text-xs text-text-muted text-center">
                Have an account?{" "}
                <Link href="/cloud/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
