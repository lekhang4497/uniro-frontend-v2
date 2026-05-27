"use client";

// Minimal agent settings dialog. Spec §9.4 + Phase 5/6 split: the full
// settings surface (reset thread, advanced knobs) lands in Phase 6. For
// Phase 5 we ship just enough to pick a reasoning model so the agent loop
// can be exercised end-to-end.
//
// Model list comes from the same /v1/models endpoint the basic chat uses.

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function SettingsDialog({ open, onOpenChange, agent }) {
  const [models, setModels] = useState([]);
  const [draft, setDraft] = useState(agent?.reasoningModel || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pull models when the dialog opens. The state resets (clear error,
  // sync draft from prop) live inside the fetch chain rather than the
  // effect body so we don't trip the React 19 setState-in-effect rule.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const seedDraft = agent?.reasoningModel || "";
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setError(null);
        setDraft(seedDraft);
        return fetch("/v1/models").then((r) => (r.ok ? r.json() : null));
      })
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.data) ? data.data : [];
        setModels(list.map((m) => m.id).filter(Boolean));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [open, agent?.reasoningModel]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasoningModel: draft }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Tell useRouterAgent to refetch so the new model lights up the chat
      // banner / composer state immediately.
      if (agent && typeof agent.refreshReasoningModel === "function") {
        await agent.refreshReasoningModel();
      }
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Pick which model the router-builder agent uses for reasoning. This
            model is called through your existing Uniro routing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">
              Reasoning model
            </label>
            {models.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">
                No models available. Configure a provider first.
              </div>
            ) : (
              <Select value={draft || undefined} onValueChange={(v) => setDraft(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {agent?.reasoningModel && (
              <div className="text-[11px] text-muted-foreground">
                Current: <span className="mono">{agent.reasoningModel}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="text-[12px] text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !draft}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
