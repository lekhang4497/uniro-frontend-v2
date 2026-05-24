// 5-layer definitions for the router-builder canvas.
// Extracted from page.js with no behavior change.

export interface LayerDef {
  key: string;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  headerDot: string;
  xPos: number;
  nodeType: string;
}

export const LAYERS: LayerDef[] = [
  {
    key: "signal",
    label: "Signal Extraction",
    description: "Extract facts from the request",
    color: "bg-blue-500/5",
    borderColor: "border-blue-300/40 dark:border-blue-700/40",
    headerBg: "bg-blue-50 dark:bg-blue-950/40",
    headerText: "text-blue-700 dark:text-blue-300",
    headerDot: "bg-blue-500",
    xPos: 60,
    nodeType: "signal",
  },
  {
    key: "projection",
    label: "Projection Coordination",
    description: "Coordinate signals into routing facts",
    color: "bg-violet-500/5",
    borderColor: "border-violet-300/40 dark:border-violet-700/40",
    headerBg: "bg-violet-50 dark:bg-violet-950/40",
    headerText: "text-violet-700 dark:text-violet-300",
    headerDot: "bg-violet-500",
    xPos: 400,
    nodeType: "projection",
  },
  {
    key: "route",
    label: "Decision Making",
    description: "Rules that decide which model to use",
    color: "bg-amber-500/5",
    borderColor: "border-amber-300/40 dark:border-amber-700/40",
    headerBg: "bg-amber-50 dark:bg-amber-950/40",
    headerText: "text-amber-700 dark:text-amber-300",
    headerDot: "bg-amber-500",
    xPos: 740,
    nodeType: "route",
  },
  {
    key: "model",
    label: "Model Selection",
    description: "Models available for dispatch",
    color: "bg-emerald-500/5",
    borderColor: "border-emerald-300/40 dark:border-emerald-700/40",
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40",
    headerText: "text-emerald-700 dark:text-emerald-300",
    headerDot: "bg-emerald-500",
    xPos: 1080,
    nodeType: "model",
  },
  {
    key: "plugin",
    label: "Plugin Chain",
    description: "Pre/post processing for a route",
    color: "bg-rose-500/5",
    borderColor: "border-rose-300/40 dark:border-rose-700/40",
    headerBg: "bg-rose-50 dark:bg-rose-950/40",
    headerText: "text-rose-700 dark:text-rose-300",
    headerDot: "bg-rose-500",
    xPos: 1420,
    nodeType: "plugin",
  },
];

// Width fraction of each column (must sum to 1)
export const LAYER_WIDTHS = [0.2, 0.2, 0.22, 0.18, 0.2];

// Canvas column width and spacing for layer zones
export const LAYER_COLUMN_WIDTH = 300;
export const LAYER_PADDING_TOP = 100; // Space for the header

// Helper to get layer info by key
export function getLayerByKey(key: string): LayerDef | undefined {
  return LAYERS.find((l) => l.key === key);
}

// `model` and `modelGroup` are two node types that share the Model Selection
// layer/column — normalize the group type onto the layer's `model` nodeType.
export function layerNodeType(nodeType: string): string {
  return nodeType === "modelGroup" ? "model" : nodeType;
}

// Helper to get layer by node type
export function getLayerByNodeType(nodeType: string): LayerDef | undefined {
  return LAYERS.find((l) => l.nodeType === layerNodeType(nodeType));
}

// Get the order index of a layer (0-4)
export function getLayerIndex(nodeType: string): number {
  const index = LAYERS.findIndex((l) => l.nodeType === layerNodeType(nodeType));
  return index;
}

// Check if two node types are adjacent in the layer order
export function areAdjacentLayers(sourceType: string, targetType: string): boolean {
  const sourceIndex = getLayerIndex(sourceType);
  const targetIndex = getLayerIndex(targetType);
  // Source should be before target (left to right flow)
  return sourceIndex >= 0 && targetIndex >= 0 && targetIndex === sourceIndex + 1;
}

// Snap a node's x position to its layer's column center
export function snapNodeToLayer(
  nodeType: string,
  yPosition: number,
  existingNodesInLayer: any[] = []
): { x: number; y: number } {
  const layer = getLayerByNodeType(nodeType);
  if (!layer) return { x: 100, y: yPosition };

  const nodeHeight = 100;
  const spacing = 20;
  const index = existingNodesInLayer.length;
  const newY = LAYER_PADDING_TOP + index * (nodeHeight + spacing);

  return {
    x: layer.xPos + (LAYER_COLUMN_WIDTH - 180) / 2, // Center node in column (node is ~180px wide)
    y: newY,
  };
}

// Realign all nodes to neat columns based on their layer
export function getRealignedNodes(nodes: any[]): any[] {
  // Group nodes by type
  const byType: Record<string, any[]> = {
    signal: [],
    projection: [],
    route: [],
    model: [],
    plugin: [],
  };
  nodes.forEach((node) => {
    // modelGroup nodes share the model column — bucket them together.
    const nodeType = layerNodeType(node.type);
    if (byType[nodeType]) {
      byType[nodeType].push(node);
    }
  });

  // Reassign positions for each group
  const updatedNodes: any[] = [];
  const nodeHeight = 100;
  const spacing = 20;

  LAYERS.forEach((layer) => {
    const nodesOfType = byType[layer.nodeType] || [];
    nodesOfType.forEach((node, index) => {
      const newY = LAYER_PADDING_TOP + index * (nodeHeight + spacing);
      const newX = layer.xPos + (LAYER_COLUMN_WIDTH - 180) / 2;
      updatedNodes.push({
        ...node,
        position: { x: newX, y: newY },
      });
    });
  });

  return updatedNodes;
}
