"use client";

// Router-builder page shell. Phase 5 (spec §13) decomposes the original
// monolithic page into Builder + sub-components. This file is now just the
// ReactFlowProvider wrapper so React Flow hooks work inside Builder.

import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Builder } from "./components/Builder.jsx";

export default function RouterBuilderPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}
