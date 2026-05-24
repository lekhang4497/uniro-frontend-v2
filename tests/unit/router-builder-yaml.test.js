// Round-trip test for the new-schema yaml.ts.
// Run with NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run

import { describe, it, expect } from "vitest";
import {
  parseRouterYaml,
  buildRouterYaml,
  lintRouter,
} from "../../src/app/(dashboard)/dashboard/router-builder/yaml";
import { migrateLegacyState } from "../../src/app/(dashboard)/dashboard/router-builder/lib/state";

const TEST_ROUTER_YAML = `
name: test-router
description: |
  Vietnamese-aware split.
defaults:
  on_no_match: route_to_default
signals:
  - {name: lang_vi, type: language, config: {language: vi}}
  - {name: any, type: always}
decisions:
  - name: vi_route
    rules: {type: language, name: lang_vi}
    priority: 100
    model: nvidia/openai/gpt-oss-20b
  - name: default
    rules: {type: always, name: any}
    priority: 0
    model: nvidia/meta/llama-3.1-8b-instruct
guardrails:
  daily_cost_cap_usd: 50
`;

describe("new-schema yaml round-trip", () => {
  it("parses test-router without lint errors", () => {
    const state = parseRouterYaml(TEST_ROUTER_YAML);
    expect(state.signals.length).toBe(2);
    expect(state.signals[0].name).toBe("lang_vi");
    expect(state.signals[0].type).toBe("language");
    expect(state.routes.length).toBe(2);
    expect(state.routes[0].name).toBe("vi_route");
    // route.model now references the synthesized Model-node alias (see the
    // "synthesizes Model nodes" test below). The original inline string is
    // preserved on state.models[].model_id.
    expect(state.routes[0].model).not.toContain("/");
    expect(state.models.some((m) => m.model_id === "nvidia/openai/gpt-oss-20b"))
      .toBe(true);
    expect(state.routes[0].rules).toEqual({
      kind: "leaf",
      signalName: "lang_vi",
      signalType: "language",
    });

    const { errors } = lintRouter(state);
    expect(errors).toEqual([]);
  });

  it("re-emits to YAML containing the new-schema fields", () => {
    const state = parseRouterYaml(TEST_ROUTER_YAML);
    const yaml = buildRouterYaml(state);

    // Top-level decisions, not routing.routes
    expect(yaml).toMatch(/^decisions:/m);
    expect(yaml).not.toMatch(/^routing:/m);

    // Rules use {type, name} leaves
    expect(yaml).toMatch(/rules:\s*\n\s*type:\s*language\s*\n\s*name:\s*lang_vi/);

    // Inline model strings, no routing.models block
    expect(yaml).toContain("model: nvidia/openai/gpt-oss-20b");

    // Signals use .name, not .id
    expect(yaml).toMatch(/-\s*name:\s*lang_vi/);
    expect(yaml).not.toMatch(/-\s*id:\s*lang_vi/);
  });

  it("composite AND/OR/NOT round-trips", () => {
    const yaml = `
name: composite-test
signals:
  - {name: a, type: always}
  - {name: b, type: always}
decisions:
  - name: d1
    rules:
      operator: AND
      conditions:
        - {type: always, name: a}
        - operator: NOT
          conditions:
            - {type: always, name: b}
    priority: 0
    model: x
`;
    const state = parseRouterYaml(yaml);
    expect(state.routes[0].rules.kind).toBe("and");
    expect(state.routes[0].rules.children[0]).toEqual({
      kind: "leaf",
      signalName: "a",
      signalType: "always",
    });
    expect(state.routes[0].rules.children[1].kind).toBe("not");
    expect(state.routes[0].rules.children[1].child).toEqual({
      kind: "leaf",
      signalName: "b",
      signalType: "always",
    });

    const yaml2 = buildRouterYaml(state);
    expect(yaml2).toMatch(/operator:\s*AND/);
    expect(yaml2).toMatch(/operator:\s*NOT/);
  });

  it("synthesizes Model nodes from inline decision model strings", () => {
    const state = parseRouterYaml(TEST_ROUTER_YAML);
    // Two unique inline model strings → two synthesized Model nodes.
    expect(state.models.length).toBe(2);
    const byModelId = Object.fromEntries(state.models.map((m) => [m.model_id, m]));
    expect(byModelId["nvidia/openai/gpt-oss-20b"]).toBeDefined();
    expect(byModelId["nvidia/meta/llama-3.1-8b-instruct"]).toBeDefined();
    // Model nodes no longer carry a canvas-only alias `name` — the YAML model
    // string is the source of truth. `route.model` references the Model node
    // by its uid so the canvas can draw a route → model edge.
    expect(byModelId["nvidia/openai/gpt-oss-20b"].name).toBeUndefined();
    expect(state.routes[0].model).toBe(byModelId["nvidia/openai/gpt-oss-20b"].uid);
  });

  it("loads legacy-schema YAML without crashing (best-effort)", () => {
    const legacy = `
name: legacy
signals:
  - {id: lang, type: language_detector}
routing:
  routes:
    - name: vi
      when: {signal: lang, equals: vi}
      priority: 100
      model: claude-haiku-4-5
    - name: default
      when: {always: true}
      priority: 0
      model: gpt-4o-mini
`;
    const state = parseRouterYaml(legacy);
    expect(state.signals[0].name).toBe("lang");           // .id → .name
    expect(state.routes[0].rules.kind).toBe("leaf");       // when → rules
    expect(state.routes[0].rules.signalName).toBe("lang"); // {signal: lang} → leaf
    expect(state.routes[1].rules.signalName).toBe("any");  // {always: true} → leaf("any")
  });
});

const MODELREFS_ROUTER_YAML = `
name: modelrefs-router
defaults:
  on_no_match: route_to_default
signals:
  - {name: lang_vi, type: language, config: {language: vi}}
  - {name: any, type: always}
decisions:
  - name: premium
    rules: {type: language, name: lang_vi}
    priority: 100
    modelRefs:
      - {model: cx/gpt-5.5, weight: 0.8, use_reasoning: true, reasoning_effort: medium}
      - {model: cx/gpt-5.6, weight: 1.0, use_reasoning: true, reasoning_effort: high}
    algorithm:
      type: confidence
  - name: default
    rules: {type: always, name: any}
    priority: 0
    model: cx/gpt-5
`;

describe("decision modelRefs round-trip", () => {
  it("imports a modelRefs decision into a Model Group node", () => {
    const state = parseRouterYaml(MODELREFS_ROUTER_YAML);
    const premium = state.routes.find((r) => r.name === "premium");
    // The modelRefs form becomes a Model Group node; route.model is its uid.
    const group = state.modelGroups.find((g) => g.uid === premium.model);
    expect(group).toBeDefined();
    expect(group.refs).toHaveLength(2);
    expect(group.refs.map((r) => r.model)).toEqual(["cx/gpt-5.5", "cx/gpt-5.6"]);
    expect(group.refs[1].reasoning_effort).toBe("high");
    expect(group.algorithm).toBe("confidence");
    // The single-model decision still gets a plain Model node.
    const def = state.routes.find((r) => r.name === "default");
    const defModel = state.models.find((m) => m.uid === def.model);
    expect(defModel.model_id).toBe("cx/gpt-5");
    // No "missing a model" error despite `model:` being absent on premium.
    const { errors } = lintRouter(state);
    expect(errors).toEqual([]);
  });

  it("re-emits modelRefs + algorithm, not an inline model", () => {
    const yaml = buildRouterYaml(parseRouterYaml(MODELREFS_ROUTER_YAML));
    expect(yaml).toContain("modelRefs:");
    expect(yaml).toMatch(/model:\s*cx\/gpt-5\.5/);
    expect(yaml).toMatch(/model:\s*cx\/gpt-5\.6/);
    expect(yaml).toMatch(/reasoning_effort:\s*high/);
    expect(yaml).toMatch(/algorithm:/);
    // The single-model decision still emits a plain `model:`.
    expect(yaml).toMatch(/model:\s*cx\/gpt-5\b/);
  });

  it("preserves modelRefs across a full parse → build → parse cycle", () => {
    const once = buildRouterYaml(parseRouterYaml(MODELREFS_ROUTER_YAML));
    const twice = buildRouterYaml(parseRouterYaml(once));
    expect(twice).toBe(once);
  });
});

describe("v3 → v4 state migration", () => {
  it("rewrites model alias references to node uids and drops `name`", () => {
    const v3 = {
      models: [
        { uid: "m1", name: "haiku", model_id: "claude-haiku-4-5", temperature: 0.7 },
      ],
      routes: [{ uid: "r1", name: "d", model: "haiku" }],
    };
    const v4 = migrateLegacyState(v3);
    expect(v4.models[0]).toEqual({
      uid: "m1",
      model_id: "claude-haiku-4-5",
      position: undefined,
    });
    expect(v4.routes[0].model).toBe("m1");
    expect(v4.modelGroups).toEqual([]);
  });

  it("converts a hidden _modelRefs route into a Model Group node", () => {
    const v3 = {
      models: [],
      routes: [
        {
          uid: "r1",
          name: "premium",
          model: "x",
          _modelRefs: [
            { model: "cx/gpt-5.5", weight: 1, use_reasoning: true, reasoning_effort: "high" },
          ],
          _algorithm: { type: "confidence" },
        },
      ],
    };
    const v4 = migrateLegacyState(v3);
    expect(v4.modelGroups).toHaveLength(1);
    const g = v4.modelGroups[0];
    expect(g.algorithm).toBe("confidence");
    expect(g.refs[0].model).toBe("cx/gpt-5.5");
    expect(v4.routes[0].model).toBe(g.uid);
    expect(v4.routes[0]._modelRefs).toBeUndefined();
    expect(v4.routes[0]._algorithm).toBeUndefined();
  });
});
