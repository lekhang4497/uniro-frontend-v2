"use client";

// Agent settings dialog. Spec §9.4:
//   - Reasoning model dropdown (writes /api/agent-settings).
//   - Reset-thread destructive button under an AlertDialog confirm.
//
// Model list comes from the same /v1/models endpoint the basic chat uses.
// Empty / failed list shows a "Configure a provider first." banner.

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
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
  const [modelsLoadFailed, setModelsLoadFailed] = useState(false);
  const [draft, setDraft] = useState(agent?.reasoningModel || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        setModelsLoadFailed(false);
        setDraft(seedDraft);
        return fetch("/v1/models").then((r) => {
          if (!r.ok) {
            // Treat HTTP error like an empty list -- both surface the same
            // "Configure a provider first." guidance to the user.
            throw new Error(`HTTP ${r.status}`);
          }
          return r.json();
        });
      })
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.data) ? data.data : [];
        setModels(list.map((m) => m.id).filter(Boolean));
      })
      .catch(() => {
        if (cancelled) return;
        // Don't surface as a top-level error -- the empty-state banner
        // already explains what to do.
        setModels([]);
        setModelsLoadFailed(true);
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

  const handleResetThread = async () => {
    if (!agent || typeof agent.resetThread !== "function") {
      setConfirmResetOpen(false);
      return;
    }
    setResetting(true);
    try {
      await agent.resetThread();
      setConfirmResetOpen(false);
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setResetting(false);
    }
  };

  const noModels = models.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agent Settings</DialogTitle>
            <DialogDescription>
              Pick which model the router-builder agent uses for reasoning. This
              model is called through your existing Uniro routing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">
                Reasoning model
              </label>
              {noModels ? (
                <div className="text-[12px] text-muted-foreground rounded-md border border-border bg-secondary/40 px-2.5 py-2">
                  {modelsLoadFailed
                    ? "Could not load models. Configure a provider first."
                    : "No models available. Configure a provider first."}
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

            <div className="space-y-1.5 border-t border-border pt-4">
              <label className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">
                Conversation
              </label>
              <p className="text-[12px] text-muted-foreground">
                Reset the agent conversation for this router. The router YAML
                is preserved.
              </p>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmResetOpen(true)}
                  disabled={saving || resetting}
                  className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Reset conversation
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-[12px] text-destructive">{error}</div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || resetting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || resetting || !draft}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the agent message history for this router. The router
              YAML is left untouched. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent Radix from auto-closing before our async work runs.
                e.preventDefault();
                handleResetThread();
              }}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? "Resetting..." : "Reset conversation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
