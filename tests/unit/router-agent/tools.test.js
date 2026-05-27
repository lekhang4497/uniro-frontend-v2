// Unit tests for the 8 router-agent tools.
//
// Each tool is exercised against an in-memory mock context so the test
// double mirrors what useRouterAgent wires up at runtime (parseYaml,
// stringifyYaml, validate, summarize, loadSkill, getYaml, setYaml).
//
// At least one success path and one failure path per tool. Tools that
// mutate state assert both the new YAML content and that setYaml was
// invoked with the expected actor/description meta.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseYaml, stringifyYaml, summarizeYaml } from "@/lib/router-agent/yaml.js";
import { validateYaml } from "@/lib/router-agent/validator/index.js";
import { createTools, findTool } from "@/lib/router-agent/tools/index.js";

function makeCtx(initialYaml = "") {
  const store = { yaml: initialYaml };
  const setYaml = vi.fn((next, meta) => {
    store.yaml = next;
    store.lastMeta = meta;
  });
  const loadSkill = vi.fn(async (name) => ({ body: `stub body for ${name}` }));
  const ctx = {
    getYaml: () => store.yaml,
    setYaml,
    validate: (text) => {
      if (typeof text !== "string" || text.trim() === "") {
        return { ok: true, errors: [], warnings: [] };
      }
      return validateYaml(text);
    },
    summarize: summarizeYaml,
    parseYaml,
    stringifyYaml,
    loadSkill,
  };
  return { ctx, store, setYaml, loadSkill };
}

function tool(name, ctx) {
  const t = findTool(createTools(ctx), name);
  if (!t) throw new Error(`Tool '${name}' not registered`);
  return t.execute;
}

describe("router-agent tools", () => {
  describe("get_router", () => {
    it("returns yaml, summary, and validation", async () => {
      const { ctx } = makeCtx("name: r\nsignals: []\ndecisions: []\n");
      const exec = tool("get_router", ctx);
      const res = await exec();
      expect(res.yaml).toContain("name: r");
      expect(res.summary).toBe("0 signals, 0 decisions, 0 plugins, 0 projections");
      expect(res.validation).toHaveProperty("ok");
      expect(res.validation).toHaveProperty("errors");
    });

    it("handles empty state", async () => {
      const { ctx } = makeCtx("");
      const res = await tool("get_router", ctx)();
      expect(res.yaml).toBe("");
      expect(res.summary).toBe("Empty router");
      expect(res.validation.ok).toBe(true);
    });
  });

  describe("set_router_yaml", () => {
    it("replaces YAML and reports validation success", async () => {
      const { ctx, setYaml } = makeCtx("");
      const yaml = `name: demo\nsignals:\n  - name: lang\n    type: language\ndecisions:\n  - name: d\n    rules:\n      name: lang\n      type: language\n    model: gpt-4o-mini\n`;
      const res = await tool("set_router_yaml", ctx)({ yaml });
      expect(res.ok).toBe(true);
      expect(setYaml).toHaveBeenCalledTimes(1);
      const [arg, meta] = setYaml.mock.calls[0];
      expect(arg).toBe(yaml);
      expect(meta).toMatchObject({ actor: "agent", description: "set_router_yaml" });
    });

    it("commits failing YAML and surfaces ok:false", async () => {
      const { ctx, setYaml } = makeCtx("");
      const yaml = "name: bad\nsignals: not-an-array\n";
      const res = await tool("set_router_yaml", ctx)({ yaml });
      expect(res.ok).toBe(false);
      expect(res.validation.errors.length).toBeGreaterThan(0);
      expect(setYaml).toHaveBeenCalled();
    });

    it("rejects missing yaml argument", async () => {
      const { ctx, setYaml } = makeCtx("");
      const res = await tool("set_router_yaml", ctx)({});
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("bad_args");
      expect(setYaml).not.toHaveBeenCalled();
    });
  });

  describe("add_signal", () => {
    it("seeds a minimal doc and appends a signal when empty", async () => {
      const { ctx, store, setYaml } = makeCtx("");
      const res = await tool("add_signal", ctx)({ name: "lang", type: "language" });
      expect(setYaml).toHaveBeenCalled();
      const parsed = parseYaml(store.yaml);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.name).toBe("untitled_router");
      expect(parsed.data.signals).toEqual([{ name: "lang", type: "language" }]);
      expect(res.validation).toHaveProperty("ok");
    });

    it("appends to an existing signals array", async () => {
      const { ctx, store } = makeCtx("name: r\nsignals:\n  - name: a\n    type: keyword\n");
      await tool("add_signal", ctx)({ name: "b", type: "language", config: { codes: ["vi"] } });
      const parsed = parseYaml(store.yaml);
      expect(parsed.data.signals).toHaveLength(2);
      expect(parsed.data.signals[1]).toEqual({
        name: "b",
        type: "language",
        config: { codes: ["vi"] },
      });
    });

    it("rejects when name is missing", async () => {
      const { ctx } = makeCtx("");
      const res = await tool("add_signal", ctx)({ type: "language" });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("bad_args");
    });
  });

  describe("add_decision", () => {
    it("appends a decision with rules and model", async () => {
      const { ctx, store } = makeCtx(
        "name: r\nsignals:\n  - name: lang\n    type: language\n"
      );
      const res = await tool("add_decision", ctx)({
        name: "vi_route",
        rules: { name: "lang", type: "language" },
        model: "gemini-1.5-flash",
        priority: 10,
      });
      const parsed = parseYaml(store.yaml);
      expect(parsed.data.decisions).toHaveLength(1);
      expect(parsed.data.decisions[0]).toMatchObject({
        name: "vi_route",
        model: "gemini-1.5-flash",
        priority: 10,
      });
      expect(res).toHaveProperty("validation");
    });

    it("rejects when rules missing", async () => {
      const { ctx } = makeCtx("");
      const res = await tool("add_decision", ctx)({ name: "x" });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("bad_args");
    });
  });

  describe("update_decision", () => {
    it("shallow-merges patch and replaces rules wholesale", async () => {
      const start = `name: r
signals:
  - name: lang
    type: language
decisions:
  - name: d1
    rules:
      name: lang
      type: language
    model: m1
    priority: 1
`;
      const { ctx, store } = makeCtx(start);
      await tool("update_decision", ctx)({
        name: "d1",
        patch: {
          model: "m2",
          priority: 5,
          rules: { operator: "AND", conditions: [{ name: "lang", type: "language" }] },
        },
      });
      const parsed = parseYaml(store.yaml);
      const d = parsed.data.decisions[0];
      expect(d.model).toBe("m2");
      expect(d.priority).toBe(5);
      expect(d.rules.operator).toBe("AND");
      expect(d.rules.conditions).toHaveLength(1);
    });

    it("returns decision_not_found when name does not exist", async () => {
      const { ctx } = makeCtx("name: r\ndecisions: []\n");
      const res = await tool("update_decision", ctx)({ name: "missing", patch: { model: "m" } });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("decision_not_found");
    });

    it("returns decision_not_found on unparseable YAML", async () => {
      const { ctx } = makeCtx("::: not yaml :::");
      const res = await tool("update_decision", ctx)({ name: "anything", patch: {} });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("decision_not_found");
    });
  });

  describe("delete_node", () => {
    const docWithRef = `name: r
signals:
  - name: lang
    type: language
  - name: kw
    type: keyword
decisions:
  - name: d
    rules:
      name: lang
      type: language
    model: m
`;

    it("removes an unreferenced signal", async () => {
      const { ctx, store } = makeCtx(docWithRef);
      const res = await tool("delete_node", ctx)({ kind: "signal", name: "kw" });
      expect(res.ok).toBe(true);
      const parsed = parseYaml(store.yaml);
      const names = parsed.data.signals.map((s) => s.name);
      expect(names).toEqual(["lang"]);
    });

    it("refuses to remove a referenced signal (would_orphan)", async () => {
      const { ctx, store } = makeCtx(docWithRef);
      const res = await tool("delete_node", ctx)({ kind: "signal", name: "lang" });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("would_orphan");
      expect(res.error.message).toContain("decision 'd'");
      // YAML unchanged
      const parsed = parseYaml(store.yaml);
      expect(parsed.data.signals).toHaveLength(2);
    });

    it("removes a decision by name", async () => {
      const { ctx, store } = makeCtx(docWithRef);
      const res = await tool("delete_node", ctx)({ kind: "decision", name: "d" });
      expect(res.ok).toBe(true);
      const parsed = parseYaml(store.yaml);
      expect(parsed.data.decisions).toEqual([]);
    });

    it("returns not_found for unknown name", async () => {
      const { ctx } = makeCtx(docWithRef);
      const res = await tool("delete_node", ctx)({ kind: "signal", name: "nope" });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("not_found");
    });

    it("rejects invalid kind", async () => {
      const { ctx } = makeCtx(docWithRef);
      const res = await tool("delete_node", ctx)({ kind: "bogus", name: "x" });
      expect(res.ok).toBe(false);
      // Either bad_args (from JSON schema enum) or the explicit fallback.
      expect(["bad_args"]).toContain(res.error.code);
    });
  });

  describe("validate_router", () => {
    it("validates the current state when yaml omitted", async () => {
      const { ctx } = makeCtx("name: ok\nsignals: []\ndecisions: []\n");
      const res = await tool("validate_router", ctx)({});
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.errors)).toBe(true);
      expect(Array.isArray(res.warnings)).toBe(true);
    });

    it("validates a candidate yaml argument", async () => {
      const { ctx } = makeCtx("name: ok\n");
      const res = await tool("validate_router", ctx)({
        yaml: "name: bad\nsignals:\n  - name: x\n    type: nope_unknown_type\n",
      });
      expect(res.ok).toBe(false);
      // First error should point at the unknown signal type.
      const codes = res.errors.map((e) => e.code);
      expect(codes).toContain("unknown_signal_type");
    });
  });

  describe("load_skill", () => {
    it("returns {body} on success", async () => {
      const { ctx, loadSkill } = makeCtx("");
      const res = await tool("load_skill", ctx)({ name: "signal-reference" });
      expect(res).toEqual({ body: "stub body for signal-reference" });
      expect(loadSkill).toHaveBeenCalledWith("signal-reference");
    });

    it("returns {error} when loader reports failure", async () => {
      const ctxBundle = makeCtx("");
      ctxBundle.ctx.loadSkill = vi.fn(async () => ({ error: "Skill 'x' not found" }));
      const exec = tool("load_skill", ctxBundle.ctx);
      const res = await exec({ name: "x" });
      expect(res.error).toBe("Skill 'x' not found");
    });

    it("rejects missing name", async () => {
      const { ctx } = makeCtx("");
      const res = await tool("load_skill", ctx)({});
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("bad_args");
    });
  });
});
