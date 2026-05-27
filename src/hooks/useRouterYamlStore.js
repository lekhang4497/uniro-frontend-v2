"use client";

// Zustand store holding the active router's YAML and undo/redo history.
//
// Spec §4 (Source of truth) and §9.3 (Undo/redo): the YAML document is the
// single source of truth, mutated by the agent's tools, the YAML editor,
// and (later) the property panel. Each mutation pushes a snapshot on the
// undo stack with `{actor, description, timestamp}`. Snapshots cap at 50.
//
// MVP scope (spec §5: single implicit router per browser session): this is
// a module-level singleton. When multi-router workspace ships we can
// promote it to a per-page provider.
//
// Validation runs synchronously on every setYaml; the validator is pure JS
// and small enough that debouncing buys nothing.

import { create } from "zustand";
import { validateYaml } from "@/lib/router-agent/validator/index.js";

const UNDO_LIMIT = 50;

function runValidation(yaml) {
  if (typeof yaml !== "string" || yaml.trim() === "") {
    return { ok: true, errors: [], warnings: [] };
  }
  try {
    return validateYaml(yaml);
  } catch (e) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "validator_threw",
          message: e && e.message ? e.message : String(e),
        },
      ],
      warnings: [],
    };
  }
}

function pushBounded(stack, entry) {
  const next = stack.concat(entry);
  if (next.length > UNDO_LIMIT) {
    return next.slice(next.length - UNDO_LIMIT);
  }
  return next;
}

export const useRouterYamlStore = create((set, get) => ({
  routerId: null,
  yaml: "",
  validation: { ok: true, errors: [], warnings: [] },
  undoStack: [],
  redoStack: [],

  /**
   * Replace YAML and push the *previous* value on the undo stack.
   * meta: {actor: "user"|"agent"|string, description: string}
   */
  setYaml: (yaml, meta = {}) => {
    if (typeof yaml !== "string") {
      throw new Error("yaml must be a string");
    }
    const state = get();
    if (state.yaml === yaml) {
      // Idempotent — no undo entry for a no-op write.
      return;
    }
    const entry = {
      yaml: state.yaml,
      actor: meta.actor || "user",
      description: meta.description || "",
      timestamp: Date.now(),
    };
    set({
      yaml,
      validation: runValidation(yaml),
      undoStack: pushBounded(state.undoStack, entry),
      redoStack: [],
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const top = state.undoStack[state.undoStack.length - 1];
    const nextUndo = state.undoStack.slice(0, -1);
    const redoEntry = {
      yaml: state.yaml,
      actor: top.actor,
      description: top.description,
      timestamp: Date.now(),
    };
    set({
      yaml: top.yaml,
      validation: runValidation(top.yaml),
      undoStack: nextUndo,
      redoStack: pushBounded(state.redoStack, redoEntry),
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const top = state.redoStack[state.redoStack.length - 1];
    const nextRedo = state.redoStack.slice(0, -1);
    const undoEntry = {
      yaml: state.yaml,
      actor: top.actor,
      description: top.description,
      timestamp: Date.now(),
    };
    set({
      yaml: top.yaml,
      validation: runValidation(top.yaml),
      undoStack: pushBounded(state.undoStack, undoEntry),
      redoStack: nextRedo,
    });
  },

  /**
   * Bootstrap state from persisted YAML. Clears history. No undo entry.
   */
  loadInitial: (yaml) => {
    const next = typeof yaml === "string" ? yaml : "";
    set({
      yaml: next,
      validation: runValidation(next),
      undoStack: [],
      redoStack: [],
    });
  },

  setRouterId: (id) => {
    set({ routerId: id == null ? null : String(id) });
  },
}));
