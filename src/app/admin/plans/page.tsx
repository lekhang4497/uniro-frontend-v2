// Plans admin — server-rendered list of plan rows handed off to the
// PlansEditor client component for in-place edits.
import { requireAdmin } from "@/lib/admin/requireAdmin";
import PlansEditor, { type Plan } from "./PlansEditor";

export default async function AdminPlansPage() {
  const { supabase } = await requireAdmin();
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          Plans
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)] max-w-[640px]">
          Edit monthly grants and rate limits. Changes apply to new subscription
          periods (existing balances keep their previous grants).
        </p>
      </header>

      {error && (
        <div className="rounded-[var(--radius)] border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 px-3 py-2 text-[13px] text-[var(--accent-red)]">
          {error.message}
        </div>
      )}

      <PlansEditor initialPlans={(plans ?? []) as Plan[]} />
    </div>
  );
}
