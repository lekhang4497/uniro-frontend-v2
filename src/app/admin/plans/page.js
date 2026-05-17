import { requireAdmin } from "@/lib/admin/requireAdmin";
import { PlansEditor } from "./PlansEditor";

export default async function AdminPlansPage() {
  const { supabase } = await requireAdmin();
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order");

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Plans</h1>
        <p className="text-sm text-text-muted mt-1">
          Edit monthly grants and rate limits. Changes apply to new subscription periods (existing balances keep their previous grants).
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 text-red-500 text-sm p-3">{error.message}</div>
      )}

      <PlansEditor initialPlans={plans || []} />
    </div>
  );
}
