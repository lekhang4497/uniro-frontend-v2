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

export default function CloudRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = getBrowserSupabase();
  const disabled = !supabase;

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <UniroMark size={44} className="text-[var(--text-primary)]" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Create account
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Free plan includes 1M Uniro-provider tokens / month
          </p>
        </div>

        <Card className="p-6">
          {disabled ? (
            <p className="py-6 text-center text-[13px] text-[var(--text-secondary)]">
              Connected mode is not configured. Set Supabase env vars to enable
              registration.
            </p>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
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
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                {error && (
                  <p className="text-[12px] text-[var(--accent-red)]">{error}</p>
                )}
                {info && (
                  <p className="text-[12px] text-[var(--accent-green)]">{info}</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-center text-[12px] text-[var(--text-secondary)]">
                Have an account?{" "}
                <Link
                  href="/cloud/login"
                  className="text-[var(--accent-blue)] hover:underline"
                >
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
