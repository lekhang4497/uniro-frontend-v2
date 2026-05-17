"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function PlansEditor({ initialPlans }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [plans, setPlans] = useState(initialPlans);
  const [savingCode, setSavingCode] = useState(null);
  const [error, setError] = useState(null);

  function update(code, field, value) {
    setPlans((ps) => ps.map((p) => (p.code === code ? { ...p, [field]: value } : p)));
  }

  function updateJson(code, field, key, value) {
    setPlans((ps) =>
      ps.map((p) =>
        p.code === code
          ? { ...p, [field]: { ...(p[field] || {}), [key]: value } }
          : p,
      ),
    );
  }

  async function save(plan) {
    setSavingCode(plan.code);
    setError(null);
    try {
      const { error } = await supabase
        .from("plans")
        .update({
          name: plan.name,
          monthly_grants: plan.monthly_grants,
          rate_limits: plan.rate_limits,
          features: plan.features,
          is_public: plan.is_public,
        })
        .eq("code", plan.code);
      if (error) throw error;
      router.refresh();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {plans.map((p) => (
        <div key={p.code} className="rounded-lg border border-border bg-bg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <code className="text-xs text-text-muted">{p.code}</code>
              <input
                value={p.name}
                onChange={(e) => update(p.code, "name", e.target.value)}
                className="block mt-1 text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none"
              />
            </div>
            <button
              onClick={() => save(p)}
              disabled={savingCode === p.code}
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5"
            >
              <Save className="size-3.5" />
              {savingCode === p.code ? "Saving…" : "Save"}
            </button>
          </div>

          <JsonGroup
            title="Monthly grants"
            obj={p.monthly_grants}
            onChange={(k, v) => updateJson(p.code, "monthly_grants", k, v)}
            valueType="number"
          />
          <JsonGroup
            title="Rate limits"
            obj={p.rate_limits}
            onChange={(k, v) => updateJson(p.code, "rate_limits", k, v)}
            valueType="number"
          />
          <JsonGroup
            title="Features"
            obj={p.features}
            onChange={(k, v) => updateJson(p.code, "features", k, v)}
            valueType="number"
          />
        </div>
      ))}
    </div>
  );
}

function JsonGroup({ title, obj, onChange, valueType }) {
  const entries = Object.entries(obj || {});
  return (
    <div>
      <h3 className="text-xs font-medium text-text-muted mb-2">{title}</h3>
      {entries.length === 0 && <p className="text-xs text-text-muted italic">empty</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <code className="text-xs text-text-muted min-w-[160px]">{key}</code>
            <input
              type={valueType}
              value={value ?? ""}
              onChange={(e) =>
                onChange(
                  key,
                  valueType === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value,
                )
              }
              className="flex-1 px-2 py-1 rounded border border-border bg-bg text-sm tabular-nums"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
