// Aggregated nodeTypes registry for the xyflow canvas.
// Extracted from page.js with no behavior change. The map MUST be defined
// outside the render component (React Flow requirement).

import { SignalNodeRenderer } from "./SignalNode";
import { ProjectionNodeRenderer } from "./ProjectionNode";
import { RouteNodeRenderer } from "./RouteNode";
import { ModelNodeRenderer } from "./ModelNode";
import { PluginNodeRenderer } from "./PluginNode";

export const nodeTypes = {
  signal: SignalNodeRenderer,
  projection: ProjectionNodeRenderer,
  route: RouteNodeRenderer,
  model: ModelNodeRenderer,
  plugin: PluginNodeRenderer,
} as const;

export {
  SignalNodeRenderer,
  ProjectionNodeRenderer,
  RouteNodeRenderer,
  ModelNodeRenderer,
  PluginNodeRenderer,
};
