// Tests for yamlToCanvas — the pure router-builder YAML -> React Flow
// converter. We don't import React Flow itself; we only check the shape of
// the {nodes, edges} returned so the canvas can render it.
//
// Cases covered:
//   - empty input -> empty graph
//   - signals only -> signal nodes, no edges
//   - one signal + one decision referencing it -> 2 nodes + 1 edge
//   - projection acting as a leaf -> edge wired to projection node
//   - guardrails / observability render as placeholder nodes
//   - malformed YAML returns an empty graph (does NOT throw)

import { describe, it, expect } from "vitest";
import { yamlToCanvas } from "@/app/(dashboard)/dashboard/router-builder/components/yamlToCanvas.js";

describe("yamlToCanvas", () => {
  it("returns empty arrays for empty input", () => {
    const out = yamlToCanvas("");
    expect(out.nodes).toEqual([]);
    expect(out.edges).toEqual([]);
  });

  it("returns empty arrays for whitespace input", () => {
    const out = yamlToCanvas("   \n\n  ");
    expect(out.nodes).toEqual([]);
    expect(out.edges).toEqual([]);
  });

  it("never throws on malformed YAML — returns an empty graph", () => {
    const out = yamlToCanvas("name: r\n  : :\n  - :: :: :: ::");
    expect(out.nodes).toEqual([]);
    expect(out.edges).toEqual([]);
  });

  it("renders signals as signal nodes", () => {
    const yaml = `
name: r
signals:
  - name: lang
    type: language
  - name: pii
    type: pii
`;
    const out = yamlToCanvas(yaml);
    expect(out.edges).toEqual([]);
    expect(out.nodes).toHaveLength(2);
    const lang = out.nodes.find((n) => n.id === "signal:lang");
    expect(lang).toBeTruthy();
    expect(lang.type).toBe("uniroSignal");
    expect(lang.data).toMatchObject({ kind: "signal", name: "lang", signalType: "language" });
    expect(typeof lang.position.x).toBe("number");
    expect(typeof lang.position.y).toBe("number");
  });

  it("wires an edge from a referenced signal to a decision", () => {
    const yaml = `
name: r
signals:
  - name: lang
    type: language
decisions:
  - name: route
    rules:
      name: lang
      type: language
    model: gpt-4o-mini
`;
    const out = yamlToCanvas(yaml);
    expect(out.nodes).toHaveLength(2);
    const dec = out.nodes.find((n) => n.id === "decision:route");
    expect(dec).toBeTruthy();
    expect(dec.type).toBe("uniroDecision");
    expect(dec.data.modelLabel).toBe("gpt-4o-mini");

    expect(out.edges).toHaveLength(1);
    expect(out.edges[0]).toMatchObject({
      source: "signal:lang",
      target: "decision:route",
    });
  });

  it("traverses AND/OR composite rule trees and emits one edge per unique leaf", () => {
    const yaml = `
name: r
signals:
  - name: lang
    type: language
  - name: keyword
    type: keyword
decisions:
  - name: route
    rules:
      operator: AND
      conditions:
        - { name: lang, type: language }
        - operator: OR
          conditions:
            - { name: keyword, type: keyword }
            - { name: lang, type: language }
    model: m
`;
    const out = yamlToCanvas(yaml);
    const edgeTargets = out.edges
      .filter((e) => e.target === "decision:route")
      .map((e) => e.source)
      .sort();
    expect(edgeTargets).toEqual(["signal:keyword", "signal:lang"]);
  });

  it("renders projection blocks as projection nodes and accepts them as rule leaves", () => {
    const yaml = `
name: r
signals:
  - name: comp
    type: complexity
projections:
  scores:
    - name: cscore
      method: weighted_sum
      inputs: [{ name: comp, weight: 1 }]
  mappings:
    - name: cband
      source: cscore
      outputs:
        - { name: low, lt: 0.3 }
decisions:
  - name: route
    rules:
      name: low
      type: projection
    model: m
`;
    const out = yamlToCanvas(yaml);
    const projNodes = out.nodes.filter((n) => n.type === "uniroProjection");
    expect(projNodes.length).toBeGreaterThanOrEqual(2);
    // The mapping member name "low" is the leaf the decision refers to.
    const edge = out.edges.find((e) => e.target === "decision:route");
    expect(edge).toBeTruthy();
    expect(edge.source).toMatch(/^projection:/);
  });

  it("represents decisions with no model and modelRefs as a count label", () => {
    const yaml = `
name: r
signals:
  - name: always
    type: always
decisions:
  - name: chain
    rules: { name: always, type: always }
    modelRefs:
      - { name: m1, weight: 1 }
      - { name: m2, weight: 1 }
`;
    const out = yamlToCanvas(yaml);
    const dec = out.nodes.find((n) => n.id === "decision:chain");
    expect(dec.data.modelLabel).toBe("(2 modelRefs)");
  });

  it("represents guardrails / observability / defaults as placeholder nodes", () => {
    const yaml = `
name: r
defaults: { foo: 1 }
guardrails:
  cost_caps: []
observability:
  trace: true
`;
    const out = yamlToCanvas(yaml);
    const kinds = out.nodes
      .filter((n) => n.type === "uniroPlaceholder")
      .map((n) => n.data.kind)
      .sort();
    expect(kinds).toEqual(["defaults", "guardrails", "observability"]);
  });

  it("does not produce an edge if a rule leaf references an unknown name", () => {
    const yaml = `
name: r
signals: []
decisions:
  - name: route
    rules:
      name: missing
      type: language
    model: m
`;
    const out = yamlToCanvas(yaml);
    expect(out.edges).toEqual([]);
  });
});
