// Lossless round-trip regression test for the 3 demo routers.
//
// These routers are composer-authored YAML with the full feature surface
// (modelRefs + algorithm, per-decision plugin configs, projection scores/
// mappings with calibration, signal configs the builder catalog doesn't
// model, projection-output rule leaves). Importing into the builder and
// re-exporting must NOT lose or mangle any of it — see yaml.ts.
//
// Run with: NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseYAML } from "confbox/yaml";
import {
  parseRouterYaml,
  buildRouterYaml,
  lintRouter,
} from "../../src/app/(dashboard)/dashboard/router-builder/yaml";

const DIR =
  "/SSD_data2/shared/UniRo_shared/UniRo/UniRo_backend/exp/custom_routers/custom_routers/explain";
const FILES = [
  "banking_vn_example.yaml",
  "coding_agent_example.yaml",
  "education_vn_example.yaml",
];

describe("demo router lossless round-trip", () => {
  for (const f of FILES) {
    const text = readFileSync(`${DIR}/${f}`, "utf-8");

    it(`${f}: canvas state survives an import → export → import round-trip`, () => {
      // The builder import normalizes the YAML into canvas state; re-exporting
      // and re-importing must yield identical state. If anything is dropped or
      // mangled on save, this state would diverge.
      const state1 = parseRouterYaml(text);
      const state2 = parseRouterYaml(buildRouterYaml(state1));
      expect(state2).toEqual(state1);
    });

    it(`${f}: round-trip is byte-stable on a second pass`, () => {
      const once = buildRouterYaml(parseRouterYaml(text));
      const twice = buildRouterYaml(parseRouterYaml(once));
      expect(twice).toBe(once);
    });

    it(`${f}: import raises no lint errors`, () => {
      const { errors } = lintRouter(parseRouterYaml(text));
      expect(errors).toEqual([]);
    });
  }

  it("preserves per-decision plugin config divergence (banking)", () => {
    const text = readFileSync(`${DIR}/banking_vn_example.yaml`, "utf-8");
    const out = parseYAML(buildRouterYaml(parseRouterYaml(text)));
    // system_prompt is used on two decisions with different prompts.
    const prompts = new Set();
    for (const d of out.decisions) {
      for (const p of d.plugins || []) {
        if (p && p.type === "system_prompt") {
          prompts.add(JSON.stringify(p.configuration));
        }
      }
    }
    expect(prompts.size).toBeGreaterThan(1);
  });

  it("preserves catalog-unmodelled signal config (domain.match_categories)", () => {
    const text = readFileSync(`${DIR}/education_vn_example.yaml`, "utf-8");
    const out = parseYAML(buildRouterYaml(parseRouterYaml(text)));
    const domain = out.signals.find((s) => s.type === "domain");
    expect(domain?.config?.match_categories?.length).toBeGreaterThan(0);
  });

  it("preserves projection-output rule leaves (banking risk_high)", () => {
    const text = readFileSync(`${DIR}/banking_vn_example.yaml`, "utf-8");
    const out = parseYAML(buildRouterYaml(parseRouterYaml(text)));
    const json = JSON.stringify(out.decisions);
    expect(json).toContain('"type":"projection"');
    expect(json).toContain("risk_high");
  });
});
