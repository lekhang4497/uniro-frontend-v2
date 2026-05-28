// Bad-YAML corpus: each test asserts the validator surfaces an error with
// the expected `code`. We build the bad YAMLs inline so the table is the
// test, not split across fixture files.

import { describe, it, expect } from "vitest";
import { validateYaml, validate } from "@/lib/router-agent/validator/index.js";

function hasCode(result, code) {
  return result.errors.some((e) => e.code === code);
}

function codes(result) {
  return result.errors.map((e) => e.code).join(", ") || "(none)";
}

describe("bad YAML cases — top level", () => {
  it("missing name → missing_name", () => {
    const yaml = `
signals: []
decisions: []
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "missing_name"), `expected missing_name, got: ${codes(r)}`).toBe(true);
  });

  it("invalid name '9badname' → invalid_name", () => {
    const yaml = `
name: "9badname"
signals: []
decisions: []
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "invalid_name"), `expected invalid_name, got: ${codes(r)}`).toBe(true);
  });

  it("unknown top-level key → unknown_top_key", () => {
    const yaml = `
name: ok_name
top_level_random_key: foo
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "unknown_top_key")).toBe(true);
  });
});

describe("bad YAML cases — signals", () => {
  it("signal with unknown type → unknown_signal_type", () => {
    const yaml = `
name: ok
signals:
  - name: weird
    type: notreal
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "unknown_signal_type"), `got: ${codes(r)}`).toBe(true);
  });

  it("two signals with same name → duplicate_signal_name", () => {
    const yaml = `
name: ok
signals:
  - name: same
    type: always
  - name: same
    type: always
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "duplicate_signal_name"), `got: ${codes(r)}`).toBe(true);
  });
});

describe("bad YAML cases — decisions and model xor", () => {
  it("decision missing rules → missing_rules", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    model: gpt-4o
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "missing_rules"), `got: ${codes(r)}`).toBe(true);
  });

  it("decision with both model and modelRefs → model_xor", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: always, name: any }
    model: gpt-4o
    modelRefs:
      - { model: gpt-4o }
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "model_xor"), `got: ${codes(r)}`).toBe(true);
  });

  it("decision with neither model nor modelRefs → model_xor", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: always, name: any }
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "model_xor"), `got: ${codes(r)}`).toBe(true);
  });
});

describe("bad YAML cases — plugins", () => {
  it("plugin with unknown type → unknown_plugin_type", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: always, name: any }
    model: gpt-4o
    plugins:
      - { type: notreal }
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "unknown_plugin_type"), `got: ${codes(r)}`).toBe(true);
  });

  it("reserved plugin name 'pii_redact' as string → no error", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: always, name: any }
    model: gpt-4o
    plugins:
      - pii_redact
`;
    const r = validateYaml(yaml);
    expect(r.ok, `expected ok, got errors: ${JSON.stringify(r.errors)}`).toBe(true);
  });
});

describe("bad YAML cases — rules", () => {
  it("rule leaf with undeclared name → unresolved_leaf", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: keyword, name: not_declared }
    model: gpt-4o
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "unresolved_leaf"), `got: ${codes(r)}`).toBe(true);
  });

  it("rule leaf with mismatched type → leaf_type_mismatch", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules: { type: keyword, name: any }
    model: gpt-4o
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "leaf_type_mismatch"), `got: ${codes(r)}`).toBe(true);
  });

  it("NOT operator with 2 conditions → not_arity", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
  - name: lang
    type: language
decisions:
  - name: d
    rules:
      operator: NOT
      conditions:
        - { type: always, name: any }
        - { type: language, name: lang }
    model: gpt-4o
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "not_arity"), `got: ${codes(r)}`).toBe(true);
  });

  it("AND operator with no conditions → invalid_operator", () => {
    const yaml = `
name: ok
signals:
  - name: any
    type: always
decisions:
  - name: d
    rules:
      operator: AND
      conditions: []
    model: gpt-4o
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "invalid_operator"), `got: ${codes(r)}`).toBe(true);
  });
});

describe("bad YAML cases — projections", () => {
  it("mapping output missing lt/lte/gt/gte → missing_mapping_output_bounds", () => {
    const yaml = `
name: ok
signals:
  - name: pii_hit
    type: pii
projections:
  scores:
    - name: risk
      method: weighted_sum
      inputs:
        - { type: pii, name: pii_hit, weight: 1.0 }
  mappings:
    - name: risk_band
      source: risk
      outputs:
        - { name: high }
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "missing_mapping_output_bounds"), `got: ${codes(r)}`).toBe(true);
  });

  it("mapping source nonexistent → invalid_mapping_source", () => {
    const yaml = `
name: ok
signals:
  - name: pii_hit
    type: pii
projections:
  scores:
    - name: risk
      method: weighted_sum
      inputs:
        - { type: pii, name: pii_hit, weight: 1.0 }
  mappings:
    - name: bogus_band
      source: not_a_score
      outputs:
        - { name: high, gte: 0.5 }
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "invalid_mapping_source"), `got: ${codes(r)}`).toBe(true);
  });
});

describe("bad YAML cases — parser", () => {
  it("YAML parse error → yaml_parse_error", () => {
    const yaml = `
signals: [
name:
`;
    const r = validateYaml(yaml);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "yaml_parse_error"), `got: ${codes(r)}`).toBe(true);
  });

  it("non-string input → yaml_parse_error", () => {
    const r = validateYaml(null);
    expect(r.ok).toBe(false);
    expect(hasCode(r, "yaml_parse_error")).toBe(true);
  });
});

describe("validate() direct object input", () => {
  it("non-object input → not_object", () => {
    const r = validate("just a string");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "not_object")).toBe(true);
  });

  it("simplest valid router passes (no decisions block is OK)", () => {
    const r = validate({ name: "tiny" });
    expect(r.ok, `unexpected errors: ${JSON.stringify(r.errors)}`).toBe(true);
  });
});
