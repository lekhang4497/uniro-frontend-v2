// Fixture-driven validator tests.
//
// We treat the four example YAMLs under
// UniRo/UniRo_backend/exp/custom_routers/custom_routers/explain/ as ground
// truth — they validate against the canonical Python validator. If the JS
// shape validator surfaces an error for any of them, the JS validator is
// wrong (or the registries have drifted).
//
// Warnings are tolerated (the Python validator emits the same advisory
// "unreferenced signal" warnings on some of these too).

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateYaml } from "@/lib/router-agent/validator/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the YAML examples relative to the workspace root (UniRo_shared/).
// frontend/tests/unit/router-agent/validator/ → up 6 → UniRo_shared
const WORKSPACE_ROOT = path.resolve(__dirname, "../../../../../..");
const EXAMPLES_DIR = path.join(
  WORKSPACE_ROOT,
  "UniRo",
  "UniRo_backend",
  "exp",
  "custom_routers",
  "custom_routers",
  "explain"
);

const FIXTURES = [
  "minimal_example.yaml",
  "banking_vn_example.yaml",
  "coding_agent_example.yaml",
  "education_vn_example.yaml",
];

describe("validator fixture suite", () => {
  for (const filename of FIXTURES) {
    it(`accepts ${filename} (no errors)`, () => {
      const filepath = path.join(EXAMPLES_DIR, filename);
      // Defensive: skip-with-diagnostic if the source tree isn't checked out
      // here. We don't want a missing fixture to silently pass.
      expect(fs.existsSync(filepath), `fixture missing: ${filepath}`).toBe(true);

      const text = fs.readFileSync(filepath, "utf8");
      const result = validateYaml(text);
      if (!result.ok) {
        // Surface the first few errors so a regression is debuggable.
        const sample = result.errors
          .slice(0, 5)
          .map((e) => `  [${e.code}] ${e.path}: ${e.message}`)
          .join("\n");
        throw new Error(
          `validator rejected ${filename} with ${result.errors.length} error(s):\n${sample}`
        );
      }
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });
  }
});

describe("validateYaml return shape", () => {
  it("returns the canonical {ok, errors, warnings} shape", () => {
    const result = validateYaml("name: tiny\nsignals: []\ndecisions: []\n");
    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    for (const issue of [...result.errors, ...result.warnings]) {
      expect(typeof issue.path).toBe("string");
      expect(typeof issue.code).toBe("string");
      expect(typeof issue.message).toBe("string");
    }
  });
});
