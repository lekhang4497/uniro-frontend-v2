"use client";

// Page-level orchestration hook for /dashboard/router-builder.
//
// Responsibilities:
//   - Fetch the default router on mount (provisions one if none exists,
//     spec §5 single implicit router for MVP).
//   - Bootstrap the YAML store with the fetched yaml + routerId.
//   - Compose `useRouterAgent` for the chat side.
//   - Debounced auto-save: any change to YAML is PATCHed to
//     /api/routers/[id] after a quiet period. Debounce avoids hammering the
//     DB during agent streams that produce many tool-driven setYaml calls
//     in quick succession.
//   - Inline name rename (PATCH name).
//
// Returns a flat object the Builder component can spread into children.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouterYamlStore } from "@/hooks/useRouterYamlStore.js";
import { useRouterAgent } from "@/hooks/useRouterAgent.js";

const SAVE_DEBOUNCE_MS = 1500;

export function useRouterState() {
  const [routerId, setRouterId] = useState(null);
  const [routerName, setRouterName] = useState("Untitled router");
  const [loadingRouter, setLoadingRouter] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [saveState, setSaveState] = useState({ saving: false, lastSavedAt: null });

  const yaml = useRouterYamlStore((s) => s.yaml);
  const validation = useRouterYamlStore((s) => s.validation);
  const undoStack = useRouterYamlStore((s) => s.undoStack);
  const redoStack = useRouterYamlStore((s) => s.redoStack);
  const setYaml = useRouterYamlStore((s) => s.setYaml);
  const loadInitial = useRouterYamlStore((s) => s.loadInitial);
  const undo = useRouterYamlStore((s) => s.undo);
  const redo = useRouterYamlStore((s) => s.redo);

  const agent = useRouterAgent({ routerId });

  // ---- Fetch default router on mount ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingRouter(true);
      setBootError(null);
      try {
        const res = await fetch("/api/routers/default");
        if (!res.ok) {
          throw new Error(`Failed to load router (HTTP ${res.status}).`);
        }
        const data = await res.json();
        if (cancelled) return;
        setRouterId(data.id);
        setRouterName(data.name || "Untitled router");
        loadInitial(typeof data.yaml === "string" ? data.yaml : "");
      } catch (e) {
        if (!cancelled) setBootError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoadingRouter(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadInitial]);

  // ---- Debounced YAML auto-save ----
  // Triggered any time yaml changes after the initial load. We use a ref
  // to track whether this is the post-load sync (which we DON'T want to
  // persist because nothing has changed) vs a real user/agent edit.
  const lastSavedYamlRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Remember the bootstrap yaml so the first effect run doesn't re-PATCH it.
  useEffect(() => {
    if (loadingRouter) return;
    if (lastSavedYamlRef.current === null) {
      lastSavedYamlRef.current = yaml;
    }
  }, [loadingRouter, yaml]);

  useEffect(() => {
    if (loadingRouter || !routerId) return;
    if (lastSavedYamlRef.current === null) return;
    if (yaml === lastSavedYamlRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const snapshot = yaml;
      setSaveState((s) => ({ ...s, saving: true }));
      try {
        const res = await fetch(
          `/api/routers/${encodeURIComponent(routerId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ yaml: snapshot }),
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lastSavedYamlRef.current = snapshot;
        setSaveState({ saving: false, lastSavedAt: Date.now() });
      } catch (e) {
        // Non-fatal; keep the in-memory YAML and try again on next change.
        console.log("[useRouterState] YAML autosave failed:", e?.message || e);
        setSaveState((s) => ({ ...s, saving: false }));
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [yaml, routerId, loadingRouter]);

  // ---- Rename router ----
  const renameRouter = useCallback(
    async (nextName) => {
      const trimmed = (nextName || "").trim();
      if (!trimmed || !routerId || trimmed === routerName) return;
      setRouterName(trimmed);
      try {
        await fetch(`/api/routers/${encodeURIComponent(routerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
      } catch (e) {
        console.log("[useRouterState] rename failed:", e?.message || e);
      }
    },
    [routerId, routerName]
  );

  return {
    // router
    routerId,
    routerName,
    setRouterName,
    renameRouter,
    loadingRouter,
    bootError,
    saveState,

    // yaml store
    yaml,
    validation,
    undoStack,
    redoStack,
    setYaml,
    undo,
    redo,

    // agent
    agent,
  };
}
