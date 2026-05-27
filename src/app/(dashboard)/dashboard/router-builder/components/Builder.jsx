"use client";

// Main router-builder layout. Composes Header / Palette / Canvas /
// BottomToolbar / RightDock / AgentEditToast and threads the YAML store +
// agent state through them. Spec §9.1 layout.
//
// State owned here:
//   - Active right-dock tab (chat / yaml / properties)
//   - Selected canvas node id
//   - Pan/select tool mode
//   - Agent-edit toast key (a per-edit token that resets the 5s timer)
//   - Settings dialog open/close
//   - Publish in-flight flag
//
// Everything else flows from useRouterState (router id, yaml, validation,
// undo stacks, agent).

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouterState } from "../hooks/useRouterState.js";
import { Header } from "./Header.jsx";
import { Palette } from "./Palette.jsx";
import { Canvas } from "./Canvas.jsx";
import { BottomToolbar } from "./BottomToolbar.jsx";
import { RightDock } from "./RightDock.jsx";
import { AgentEditToast } from "./AgentEditToast.jsx";
import { SettingsDialog } from "./SettingsDialog.jsx";

export function Builder() {
  const state = useRouterState();
  const {
    routerId,
    routerName,
    setRouterName,
    renameRouter,
    loadingRouter,
    bootError,
    saveState,

    yaml,
    validation,
    undoStack,
    redoStack,
    setYaml,
    undo,
    redo,

    agent,
  } = state;

  const [activeTab, setActiveTab] = useState("chat");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [tool, setTool] = useState("select");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ---- Watch undoStack for agent-authored entries to fire the toast ----
  // We derive {agentEditId, agentEditDescription} from the undoStack at
  // render time instead of mirroring it into state inside a useEffect.
  // That avoids the React 19 setState-in-effect lint warning AND a wasted
  // re-render after each agent edit.
  //
  // ID intentionally omits the stack depth and only uses {timestamp, actor}.
  // Timestamps are unique per setYaml call, so the same agent edit
  // surfacing at different stack depths (undo / redo / branches) keeps the
  // same id and respects a prior dismissal. AgentEditToast tracks dismissed
  // ids in a Set so revisiting a previously-dismissed edit stays hidden.
  const agentEdit = useMemo(() => {
    if (undoStack.length === 0) return { id: null, description: "" };
    const newest = undoStack[undoStack.length - 1];
    if (!newest || newest.actor !== "agent") return { id: null, description: "" };
    return {
      id: `${newest.timestamp}-${newest.actor}`,
      description: newest.description || "agent edit",
    };
  }, [undoStack]);

  // ---- Switch to Properties tab when a node gets selected ----
  const handleSelect = useCallback((id) => {
    setSelectedNodeId(id);
    if (id) setActiveTab("properties");
  }, []);

  // ---- Keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo ----
  useEffect(() => {
    function onKey(e) {
      // Skip if focus is in a text input / textarea / contenteditable. The
      // browser / Monaco / textarea handle their own undo and we shouldn't
      // hijack it.
      const t = e.target;
      if (t && t.matches) {
        if (t.matches("input, textarea")) return;
        if (t.matches('[contenteditable="true"], [contenteditable=""]')) return;
        // Monaco's editor sits inside a div with role=textbox.
        if (t.matches('[role="textbox"]')) return;
      }
      const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ---- Header handlers ----
  const handleRename = useCallback(
    (next, opts) => {
      setRouterName(next);
      if (opts && opts.commit) {
        renameRouter(next);
      }
    },
    [renameRouter, setRouterName]
  );

  const handlePublish = useCallback(async () => {
    if (!routerId) return;
    setPublishing(true);
    try {
      await fetch(`/api/routers/${encodeURIComponent(routerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yaml, name: routerName }),
      });
    } catch (e) {
      console.log("[Builder] publish failed:", e?.message || e);
    } finally {
      setPublishing(false);
    }
  }, [routerId, routerName, yaml]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const headerEl = useMemo(
    () => (
      <Header
        routerName={routerName}
        onRename={handleRename}
        onOpenSettings={() => setSettingsOpen(true)}
        onPublish={handlePublish}
        publishing={publishing}
        saveState={saveState}
        onOpenYaml={() => setActiveTab("yaml")}
      />
    ),
    [routerName, handleRename, handlePublish, publishing, saveState]
  );

  if (bootError) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {headerEl}
        <div className="flex-1 grid place-items-center p-6 text-center text-[13px] text-muted-foreground">
          <div>
            <div className="font-medium text-foreground mb-1">
              Could not load router
            </div>
            <div>{String(bootError.message || bootError)}</div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingRouter) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {headerEl}
        <div className="flex-1 grid place-items-center text-[12.5px] text-muted-foreground">
          Loading router...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {headerEl}

      <div className="flex flex-1 min-h-0">
        <Palette />

        <div className="relative flex-1 flex min-w-0">
          <Canvas
            yaml={yaml}
            tool={tool}
            selectedId={selectedNodeId}
            onSelect={handleSelect}
          />
          <BottomToolbar
            tool={tool}
            onToolChange={setTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
          <AgentEditToast
            editId={agentEdit.id}
            description={agentEdit.description}
            onUndo={undo}
          />
        </div>

        <RightDock
          activeTab={activeTab}
          onTabChange={setActiveTab}
          agent={agent}
          yaml={yaml}
          setYaml={setYaml}
          validation={validation}
          selectedNodeId={selectedNodeId}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        agent={agent}
      />
    </div>
  );
}
