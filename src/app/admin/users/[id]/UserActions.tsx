"use client";

// Admin actions on a single user. Three flows backed by Supabase RPCs:
//   - admin_grant_quota (positive-only resource credit)
//   - admin_set_user_plan (changes active subscription)
//   - admin_set_user_admin (promote/demote)
//
// Native confirm() is intentionally kept for the destructive flows — matches
// the prior behavior and avoids extra dialog plumbing for a single dev page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, Gift, Pencil } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const RESOURCES = [
  "requests",
  "tokens_in",
  "tokens_out",
  "uniro_provider_tokens",
  "images",
  "audio_seconds",
] as const;

type Resource = (typeof RESOURCES)[number];

export type PlanOption = { code: string; name: string };

type UserActionsProps = {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
  currentPlan: string | null;
  plans: PlanOption[];
};

export default function UserActions({
  userId,
  isAdmin,
  isSelf,
  currentPlan,
  plans,
}: UserActionsProps) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [grantResource, setGrantResource] = useState<Resource>("requests");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [newPlan, setNewPlan] = useState<string>(currentPlan || "free");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAdmin() {
    if (!supabase) {
      setError("Supabase client is not configured");
      return;
    }
    if (
      !confirm(
        isAdmin ? "Remove admin privileges from this user?" : "Promote this user to admin?",
      )
    ) {
      return;
    }
    await run(async () => {
      const { error: rpcErr } = await supabase.rpc("admin_set_user_admin", {
        p_user_id: userId,
        p_is_admin: !isAdmin,
      });
      if (rpcErr) throw rpcErr;
    });
  }

  async function applyGrant() {
    if (!supabase) {
      setError("Supabase client is not configured");
      return;
    }
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) {
      setError("Amount must be positive");
      return;
    }
    await run(async () => {
      const { error: rpcErr } = await supabase.rpc("admin_grant_quota", {
        p_user_id: userId,
        p_resource: grantResource,
        p_amount: amount,
        p_note: grantNote || null,
      });
      if (rpcErr) throw rpcErr;
      setGrantOpen(false);
      setGrantAmount("");
      setGrantNote("");
    });
  }

  async function applyPlan() {
    if (!supabase) {
      setError("Supabase client is not configured");
      return;
    }
    if (newPlan === currentPlan) {
      setPlanOpen(false);
      return;
    }
    if (!confirm(`Change plan to "${newPlan}"? Current period ends immediately.`)) {
      return;
    }
    await run(async () => {
      const { error: rpcErr } = await supabase.rpc("admin_set_user_plan", {
        p_user_id: userId,
        p_plan_code: newPlan,
      });
      if (rpcErr) throw rpcErr;
      setPlanOpen(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setGrantOpen((v) => !v)}
          disabled={busy}
        >
          <Gift className="h-3.5 w-3.5" />
          Grant quota
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPlanOpen((v) => !v)}
          disabled={busy}
        >
          <Pencil className="h-3.5 w-3.5" />
          Change plan
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAdmin}
          disabled={busy || isSelf}
          title={isSelf ? "You can't change your own admin flag here" : ""}
          className={
            isAdmin
              ? "border-[var(--accent-red)]/40 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)]"
              : "border-[var(--accent-orange)]/40 text-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/10 hover:text-[var(--accent-orange)]"
          }
        >
          {isAdmin ? (
            <>
              <ShieldOff className="h-3.5 w-3.5" />
              Demote admin
            </>
          ) : (
            <>
              <Shield className="h-3.5 w-3.5" />
              Make admin
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-[12px] text-[var(--accent-red)]">{error}</p>}

      {grantOpen && (
        <Card className="w-80 bg-[var(--bg-tertiary)]/40 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grant-resource" className="text-[12px] text-[var(--text-tertiary)]">
                Resource
              </Label>
              <Select
                value={grantResource}
                onValueChange={(v) => setGrantResource(v as Resource)}
              >
                <SelectTrigger id="grant-resource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grant-amount" className="text-[12px] text-[var(--text-tertiary)]">
                Amount
              </Label>
              <Input
                id="grant-amount"
                type="number"
                min={1}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                placeholder="e.g. 1000000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grant-note" className="text-[12px] text-[var(--text-tertiary)]">
                Note (optional)
              </Label>
              <Input
                id="grant-note"
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="Why this grant?"
              />
            </div>
            <Button onClick={applyGrant} disabled={busy} size="sm">
              {busy ? "Granting…" : "Apply grant"}
            </Button>
          </div>
        </Card>
      )}

      {planOpen && (
        <Card className="w-80 bg-[var(--bg-tertiary)]/40 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-select" className="text-[12px] text-[var(--text-tertiary)]">
                New plan
              </Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger id="plan-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyPlan} disabled={busy} size="sm">
              {busy ? "Applying…" : "Apply plan change"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
