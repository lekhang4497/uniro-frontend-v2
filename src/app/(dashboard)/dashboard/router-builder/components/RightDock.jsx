"use client";

// Right-side dock with three tabs: Chat / YAML / Properties. Spec §9.2.
// Clicking inside the canvas auto-switches to Properties; clicking inside
// the chat composer auto-switches to Chat. The parent (`Builder`) drives
// `activeTab` based on those events.

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import { AgentChat } from "./AgentChat.jsx";
import { YamlView } from "./YamlView.jsx";
import { PropertiesPanel } from "./PropertiesPanel.jsx";

export function RightDock({
  activeTab,
  onTabChange,
  agent,
  yaml,
  setYaml,
  validation,
  selectedNodeId,
  onOpenSettings,
}) {
  return (
    <aside className="hidden lg:flex w-[380px] shrink-0 flex-col border-l border-border bg-card">
      <Tabs
        value={activeTab}
        onValueChange={onTabChange}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <TabsList className="grid grid-cols-3 w-full h-8">
            <TabsTrigger value="chat" className="text-[12px]">
              Chat
            </TabsTrigger>
            <TabsTrigger value="yaml" className="text-[12px]">
              YAML
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-[12px]">
              Properties
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 min-h-0 mt-0 outline-none flex flex-col">
          <AgentChat
            agent={agent}
            onFocusComposer={() => onTabChange("chat")}
            onOpenSettings={onOpenSettings}
          />
        </TabsContent>

        <TabsContent value="yaml" className="flex-1 min-h-0 mt-0 outline-none flex flex-col">
          <YamlView
            yaml={yaml}
            setYaml={setYaml}
            validation={validation}
            streaming={agent.streaming.active}
          />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 min-h-0 mt-0 outline-none flex flex-col">
          <PropertiesPanel
            yaml={yaml}
            setYaml={setYaml}
            selectedNodeId={selectedNodeId}
            onOpenYaml={() => onTabChange("yaml")}
            streaming={agent.streaming.active}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
