"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, Gift, Pencil } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const RESOURCES = [
  "requests",
  "tokens_in",
  "tokens_out",
  "uniro_provider_tokens",
  "images",
  "audio_seconds",
];

export function UserActions({ userId, isAdmin, isSelf, currentPlan, plans }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [grantResource, setGrantResource] = useState("requests");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [newPlan, setNewPlan] = useState(currentPlan || "free");

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); }
    catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function toggleAdmin() {
    if (!confirm(isAdmin ? "Remove admin privileges from this user?" : "Promote this user to admin?")) return;
    await run(async () => {
      const { error } = await supabase.rpc("admin_set_user_admin", {
        p_user_id: userId,
        p_is_admin: !isAdmin,
      });
      if (error) throw error;
    });
  }

  async function applyGrant() {
    const amount = parseInt(grantAmount, 10);
    if (!amount || amount <= 0) { setError("Amount must be positive"); return; }
    await run(async () => {
      const { error } = await supabase.rpc("admin_grant_quota", {
        p_user_id: userId,
        p_resource: grantResource,
        p_amount: amount,
        p_note: grantNote || null,
      });
      if (error) throw error;
      setGrantOpen(false);
      setGrantAmount("");
      setGrantNote("");
    });
  }

  async function applyPlan() {
    if (newPlan === currentPlan) { setPlanOpen(false); return; }
    if (!confirm(`Change plan to "${newPlan}"? Current period ends immediately.`)) return;
    await run(async () => {
      const { error } = await supabase.rpc("admin_set_user_plan", {
        p_user_id: userId,
        p_plan_code: newPlan,
      });
      if (error) throw error;
      setPlanOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <button
          onClick={() => setGrantOpen((v) => !v)}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-border bg-bg hover:bg-bg-muted text-sm inline-flex items-center gap-1.5"
        >
          <Gift className="size-3.5" /> Grant quota
        </button>
        <button
          onClick={() => setPlanOpen((v) => !v)}
          disabled={busy}
          className="px-3 py-1.5 rounded border border-border bg-bg hover:bg-bg-muted text-sm inline-flex items-center gap-1.5"
        >
          <Pencil className="size-3.5" /> Change plan
        </button>
        <button
          onClick={toggleAdmin}
          disabled={busy || isSelf}
          title={isSelf ? "You can't change your own admin flag here" : ""}
          className={`px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5 ${
            isAdmin
              ? "border-red-500/40 text-red-500 hover:bg-red-500/10"
              : "border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isAdmin ? <><ShieldOff className="size-3.5" /> Demote admin</> : <><Shield className="size-3.5" /> Make admin</>}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {grantOpen && (
        <div className="rounded border border-border bg-bg-muted/40 p-3 flex flex-col gap-2 w-80">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Resource</label>
            <select
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={grantResource}
              onChange={(e) => setGrantResource(e.target.value)}
            >
              {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Amount</label>
            <input
              type="number"
              min="1"
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              placeholder="e.g. 1000000"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Note (optional)</label>
            <input
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="Why this grant?"
            />
          </div>
          <button
            onClick={applyGrant}
            disabled={busy}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
          >
            {busy ? "Granting…" : "Apply grant"}
          </button>
        </div>
      )}

      {planOpen && (
        <div className="rounded border border-border bg-bg-muted/40 p-3 flex flex-col gap-2 w-80">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">New plan</label>
            <select
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
            >
              {plans.map((p) => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
            </select>
          </div>
          <button
            onClick={applyPlan}
            disabled={busy}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
          >
            {busy ? "Applying…" : "Apply plan change"}
          </button>
        </div>
      )}
    </div>
  );
}
