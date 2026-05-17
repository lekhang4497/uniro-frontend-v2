"use client";

// Inline editor for plan rows. Loose typing on the JSON blobs (monthly_grants,
// rate_limits, features) — these come back from a permissive Postgres jsonb
// column with no shared contract, so they're typed as `Record<string, number>`
// here and validated by the JsonGroup rendering only.
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type JsonNumberMap = Record<string, number>;

export type Plan = {
  code: string;
  name: string;
  monthly_grants?: JsonNumberMap | null;
  rate_limits?: JsonNumberMap | null;
  features?: JsonNumberMap | null;
  is_public?: boolean | null;
};

type JsonField = "monthly_grants" | "rate_limits" | "features";

export default function PlansEditor({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Plan>(code: string, field: K, value: Plan[K]) {
    setPlans((ps) => ps.map((p) => (p.code === code ? { ...p, [field]: value } : p)));
  }

  function updateJson(code: string, field: JsonField, key: string, value: number) {
    setPlans((ps) =>
      ps.map((p) =>
        p.code === code
          ? { ...p, [field]: { ...(p[field] ?? {}), [key]: value } }
          : p,
      ),
    );
  }

  async function save(plan: Plan) {
    if (!supabase) {
      setError("Supabase client is not configured");
      return;
    }
    setSavingCode(plan.code);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from("plans")
        .update({
          name: plan.name,
          monthly_grants: plan.monthly_grants,
          rate_limits: plan.rate_limits,
          features: plan.features,
          is_public: plan.is_public,
        })
        .eq("code", plan.code);
      if (updErr) throw updErr;
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-[12px] text-[var(--accent-red)]">{error}</p>}

      {plans.map((p) => (
        <Card key={p.code} className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <code className="text-[11px] text-[var(--text-tertiary)]">{p.code}</code>
              <input
                value={p.name}
                onChange={(e) => update(p.code, "name", e.target.value)}
                className="mt-1 block w-full bg-transparent text-[17px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] outline-none border-b border-transparent transition-colors hover:border-[var(--bg-secondary)] focus:border-[var(--accent-blue)]"
              />
            </div>
            <Button
              onClick={() => save(p)}
              disabled={savingCode === p.code}
              size="sm"
            >
              <Save className="h-3.5 w-3.5" />
              {savingCode === p.code ? "Saving…" : "Save"}
            </Button>
          </div>

          <JsonGroup
            title="Monthly grants"
            obj={p.monthly_grants ?? null}
            onChange={(k, v) => updateJson(p.code, "monthly_grants", k, v)}
          />
          <JsonGroup
            title="Rate limits"
            obj={p.rate_limits ?? null}
            onChange={(k, v) => updateJson(p.code, "rate_limits", k, v)}
          />
          <JsonGroup
            title="Features"
            obj={p.features ?? null}
            onChange={(k, v) => updateJson(p.code, "features", k, v)}
          />
        </Card>
      ))}
    </div>
  );
}

type JsonGroupProps = {
  title: string;
  obj: JsonNumberMap | null;
  onChange: (key: string, value: number) => void;
};

function JsonGroup({ title, obj, onChange }: JsonGroupProps) {
  const entries = Object.entries(obj ?? {});
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
        {title}
      </h3>
      {entries.length === 0 && (
        <p className="text-[12px] italic text-[var(--text-tertiary)]">empty</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <code className="min-w-[160px] text-[11px] text-[var(--text-tertiary)]">{key}</code>
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange(key, e.target.value === "" ? 0 : Number(e.target.value))
              }
              className="flex-1 tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
