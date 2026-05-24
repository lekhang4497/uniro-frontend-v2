// Serialize router-builder state into the router YAML format.
//
// The YAML schema has 5 layers:
//   Layer 1 — Signal Extraction
//   Layer 2 — Projection Coordination
//   Layer 3 — Decision Making
//   Layer 4 — Model Selection
//   Layer 5 — Plugin Chain
//
// The exporter prunes empty / default fields so the output stays close to
// what someone would hand-write. Round-trip parsing (imported YAML →
// builder state) is handled by `fromRouterDict`.

import { parseYAML, stringifyYAML } from "confbox/yaml";
import { SIGNAL_TYPE_BY_KEY, PROJECTION_TYPE_BY_KEY } from "./catalog";
import { normalizeModelRef } from "./lib/state";

// ---------- helpers ----------

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

// Deterministic, identifier-safe slug for synthesizing node uids — last path
// segment of a model id (or any string), non-identifier chars folded to `_`.
function sanitizeIdent(s: string): string {
  const str = String(s || "");
  const tail = str.split("/").pop() || str;
  return tail.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "x";
}

// A decision selects a model via EITHER `model:` (a single inline string) OR
// `modelRefs:` (a weighted list, optionally paired with an `algorithm:`). The
// canvas now models both: a Model node holds the inline string, a Model Group
// node holds the modelRefs form. The two helpers below emit each form back to
// YAML — mirrors `ModelRef` / `AlgorithmConfig` in router_service's schema.py.

// A canvas modelRef → its YAML form. `model` and `weight` are always emitted
// (weight is the whole point of the form); optional fields only when set.
function modelRefToYaml(ref: any): any {
  const out: any = { model: ref?.model || "" };
  out.weight = typeof ref?.weight === "number" ? ref.weight : 1;
  if (ref?.lora_name) out.lora_name = ref.lora_name;
  if (ref?.use_reasoning) out.use_reasoning = true;
  if (ref?.reasoning_description) out.reasoning_description = ref.reasoning_description;
  if (ref?.reasoning_effort) out.reasoning_effort = ref.reasoning_effort;
  return out;
}

// A Model Group's `algorithm` → its YAML form, or undefined when it's the
// plain `static` default carrying no algorithm-specific keys.
function algorithmToYaml(group: any): any | undefined {
  const type = group?.algorithm || "static";
  const raw = group?._rawAlgorithm;
  const hasRawKeys = raw && typeof raw === "object" && Object.keys(raw).length > 0;
  if (type === "static" && !hasRawKeys) return undefined;
  return { ...(hasRawKeys ? raw : {}), type };
}

function coerceConfigValue(field: any, raw: any): any {
  if (raw === undefined || raw === null) return undefined;
  switch (field.kind) {
    case "number": {
      if (raw === "") return undefined;
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case "bool":
      return Boolean(raw);
    case "string-list": {
      if (Array.isArray(raw)) return raw.filter((s) => String(s).trim() !== "");
      return String(raw)
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    case "yaml": {
      const text = String(raw).trim();
      if (text === "") return undefined;
      try {
        return parseYAML(text);
      } catch {
        return text;
      }
    }
    case "select":
    case "string":
    default: {
      const s = String(raw);
      return s === "" ? undefined : s;
    }
  }
}

function buildSignalConfig(signal: any): any {
  const spec: any = (SIGNAL_TYPE_BY_KEY as any)[signal.type];
  if (!spec || spec.fields.length === 0) return undefined;
  const out: any = {};
  for (const field of spec.fields) {
    const raw = signal.config?.[field.key];
    const value = coerceConfigValue(field, raw);
    if (value === undefined) continue;
    if (value === field.default && field.kind !== "bool") continue;
    out[field.key] = value;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

// ---------- new-schema rules: builder ↔ YAML ----------
//
// Builder representation (kept simple, schema-aligned):
//   { kind: 'leaf', signalName: <signal_name> }
//   { kind: 'and' | 'or', children: RuleNode[] }
//   { kind: 'not', child: RuleNode }
//
// YAML form (matches uniro_router.schema.RuleNode):
//   leaf      : { type: <signal_type>, name: <signal_name> }
//   composite : { operator: 'AND' | 'OR' | 'NOT', conditions: [RuleNode...] }
//
// The leaf form needs the signal's *type* (e.g. "keyword", "language") so
// the engine can validate the reference; we look it up via the signal's name.

export function rulesToYaml(rules: any, signalTypeByName: Record<string, string>): any {
  if (!rules || !rules.kind) return undefined;
  if (rules.kind === "leaf") {
    const name = (rules.signalName || "").trim();
    if (!name) return undefined;
    // A leaf's `type` is normally its signal's type. Fall back to the type
    // captured at import (`signalType`) so leaves referencing a projection
    // output (type "projection") — which has no entry in the signal table —
    // round-trip instead of being dropped as a dangling reference.
    const type = signalTypeByName[name] || rules.signalType;
    if (!type) return undefined;  // dangling reference — drop the leaf
    return { type, name };
  }
  if (rules.kind === "and" || rules.kind === "or") {
    const conds = (rules.children || [])
      .map((c: any) => rulesToYaml(c, signalTypeByName))
      .filter((c: any) => c !== undefined);
    if (conds.length === 0) return undefined;
    return { operator: rules.kind.toUpperCase(), conditions: conds };
  }
  if (rules.kind === "not") {
    const inner = rulesToYaml(rules.child, signalTypeByName);
    if (!inner) return undefined;
    return { operator: "NOT", conditions: [inner] };
  }
  return undefined;
}

export function rulesFromYaml(node: any): any {
  if (!node || typeof node !== "object") return { kind: "leaf", signalName: "" };
  // composite
  if (typeof node.operator === "string" && Array.isArray(node.conditions)) {
    const op = String(node.operator).toUpperCase();
    if (op === "AND" || op === "OR") {
      return {
        kind: op.toLowerCase(),
        children: node.conditions.map(rulesFromYaml),
      };
    }
    if (op === "NOT") {
      const inner = node.conditions[0];
      return { kind: "not", child: rulesFromYaml(inner) };
    }
  }
  // leaf
  if (typeof node.name === "string") {
    // Keep `type` so the exporter can re-emit leaves whose type isn't
    // discoverable from the signal table (e.g. projection-output refs).
    return { kind: "leaf", signalName: node.name, signalType: node.type };
  }
  // OLD-schema fallbacks — turn legacy {signal,equals} / {projection,equals}
  // into a leaf pointing at the signal name, so loading an old YAML doesn't
  // explode (operators/value are dropped — they don't exist in the new schema).
  if (typeof node.signal === "string") {
    return { kind: "leaf", signalName: node.signal };
  }
  if (node.always === true) {
    // Old "always" maps to a leaf at "any" — assumed default catch-all signal.
    return { kind: "leaf", signalName: "any" };
  }
  return { kind: "leaf", signalName: "" };
}

// Convert a when-clause from the builder's tagged representation into the
// shape the OLD YAML schema expects. Retained only because the LEGACY
// templates/inspector tests still reference it; new code uses rulesToYaml.
//   { kind: 'always' }                                  -> { always: true }
//   { kind: 'leaf', signalId, op, value }               -> { signal, equals: ... }
//   { kind: 'leaf', projId, ... }                       -> { projection, equals: ... }
//   { kind: 'all'|'any', children }                     -> { all: [...] }
//   { kind: 'not', child }                              -> { not: ... }
export function whenToYaml(when: any): any {
  if (!when || !when.kind) return undefined;
  switch (when.kind) {
    case "always":
      return { always: true };
    case "leaf": {
      const id = (when.signalId || "").trim();
      const projId = (when.projId || "").trim();
      const op = when.op;

      if (!op) return undefined;

      // projection reference
      if (projId) {
        const out: any = { projection: projId };
        if (op === "equals" || op === "in" || op === "gte" || op === "lte" || op === "matches") {
          if (op === "in") {
            const arr = Array.isArray(when.value)
              ? when.value
              : String(when.value || "")
                  .split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean);
            if (arr.length === 0) return undefined;
            out.in = arr;
          } else if (op === "gte" || op === "lte") {
            const n = Number(when.value);
            if (!Number.isFinite(n)) return undefined;
            out[op] = n;
          } else {
            if (when.value === undefined || when.value === "") return undefined;
            out[op] = when.value;
          }
        }
        return out;
      }

      // signal reference
      if (!id) return undefined;
      const out: any = { signal: id };
      if (op === "exists") {
        out.exists = when.value !== false;
      } else if (op === "in") {
        const arr = Array.isArray(when.value)
          ? when.value
          : String(when.value || "")
              .split(/[,\n]/)
              .map((s) => s.trim())
              .filter(Boolean);
        out.in = arr;
      } else if (op === "gte" || op === "lte") {
        const n = Number(when.value);
        if (!Number.isFinite(n)) return undefined;
        out[op] = n;
      } else {
        if (when.value === undefined || when.value === "") return undefined;
        out[op] = when.value;
      }
      return out;
    }
    case "all":
    case "any": {
      const children = (when.children || [])
        .map(whenToYaml)
        .filter((c: any) => c !== undefined);
      if (children.length === 0) return undefined;
      return { [when.kind]: children };
    }
    case "not": {
      const inner = whenToYaml(when.child);
      if (!inner) return undefined;
      return { not: inner };
    }
    default:
      return undefined;
  }
}

// Inverse of whenToYaml — re-tag YAML when-clauses for the UI.
export function whenFromYaml(node: any): any {
  if (!node || typeof node !== "object") return { kind: "always" };
  if (node.always === true) return { kind: "always" };
  if (Array.isArray(node.all)) {
    return { kind: "all", children: node.all.map(whenFromYaml) };
  }
  if (Array.isArray(node.any)) {
    return { kind: "any", children: node.any.map(whenFromYaml) };
  }
  if (node.not !== undefined) {
    return { kind: "not", child: whenFromYaml(node.not) };
  }
  if (typeof node.projection === "string") {
    const ops = ["equals", "in", "gte", "lte", "matches", "exists"];
    for (const op of ops) {
      if (op in node) {
        return { kind: "leaf", projId: node.projection, op, value: node[op] };
      }
    }
  }
  if (typeof node.signal === "string") {
    const ops = ["equals", "in", "gte", "lte", "matches", "exists"];
    for (const op of ops) {
      if (op in node) {
        return { kind: "leaf", signalId: node.signal, op, value: node[op] };
      }
    }
  }
  return { kind: "always" };
}

// ---------- exporter ----------

export function buildRouterDict(state: any): any {
  const out: any = {};
  if (state.name) out.name = state.name;
  if (state.description) out.description = state.description;
  if (Number.isFinite(state.version) && state.version !== 1) out.version = state.version;
  if (Number.isFinite(state.schema_version) && state.schema_version !== 1) {
    out.schema_version = state.schema_version;
  }
  if (state.created_at) out.created_at = state.created_at;
  if (state.created_by) out.created_by = state.created_by;
  if (state.created_by_method && state.created_by_method !== "direct") {
    out.created_by_method = state.created_by_method;
  }

  const defaults: any = {};
  if (Number.isFinite(state.defaults?.alpha) && state.defaults.alpha !== 0.5) {
    defaults.alpha = state.defaults.alpha;
  }
  const fallback = (state.defaults?.fallback_chain || []).filter(Boolean);
  if (fallback.length) defaults.fallback_chain = fallback;
  if (state.defaults?.on_no_match && state.defaults.on_no_match !== "route_to_default") {
    defaults.on_no_match = state.defaults.on_no_match;
  } else if (state.defaults?.on_no_match === "route_to_default" && fallback.length === 0) {
    defaults.on_no_match = "route_to_default";
  }
  if (!isEmpty(defaults)) out.defaults = defaults;

  // --- Layer 1: Signal Extraction ---
  // Only signals wired to the User Query entry node make it into the YAML.
  // userQueryConnected !== false treats undefined as connected (back-compat
  // with state created before the User Query node existed).
  const activeSignalsSource = (state.signals || []).filter(
    (sig: any) => sig.userQueryConnected !== false
  );
  const signalTypeByName: Record<string, string> = {};
  const signals = activeSignalsSource.map((sig: any) => {
    if (sig.name) signalTypeByName[sig.name] = sig.type;
    const item: any = { name: sig.name, type: sig.type };
    if (Number.isFinite(sig.version) && sig.version !== 1) item.version = sig.version;
    // Signal config round-trips catalog-independently: the raw imported
    // config is the base (preserves fields the builder catalog doesn't model,
    // and fields the catalog would otherwise drop as equal-to-default), and
    // catalog-built values overlay it so inspector edits to known fields win.
    const rawCfg =
      sig._rawConfig && typeof sig._rawConfig === "object" ? sig._rawConfig : {};
    const cfg = { ...rawCfg, ...(buildSignalConfig(sig) || {}) };
    if (Object.keys(cfg).length) item.config = cfg;
    if (Number.isFinite(sig.timeout_ms) && sig.timeout_ms !== 50) {
      item.timeout_ms = sig.timeout_ms;
    }
    return item;
  });
  if (signals.length) out.signals = signals;

  // --- Layer 2: Projection Coordination (top-level `projections:` block) ---
  const partitions: any[] = [];
  const scores: any[] = [];
  const mappings: any[] = [];

  for (const proj of state.projections || []) {
    const item: any = { name: proj.name };
    if (proj.type === "partition") {
      if (proj.config?.members) item.members = proj.config.members;
      if (proj.config?.default) item.default = proj.config.default;
      if (proj.config?.semantics && proj.config.semantics !== "exclusive") {
        item.semantics = proj.config.semantics;
      }
      partitions.push(item);
    } else if (proj.type === "weighted_sum") {
      if (proj.config?.inputs) item.inputs = proj.config.inputs;
      scores.push(item);
    } else if (proj.type === "threshold_bands") {
      if (proj.config?.source) item.source = proj.config.source;
      if (proj.config?.outputs) item.outputs = proj.config.outputs;
      if (proj.config?.calibration) item.calibration = proj.config.calibration;
      mappings.push(item);
    } else if (proj.type === "round_robin") {
      if (proj.config?.items) item.items = proj.config.items;
      scores.push(item);
    }
  }

  const projections: any = {};
  if (partitions.length) projections.partitions = partitions;
  if (scores.length) projections.scores = scores;
  if (mappings.length) projections.mappings = mappings;
  if (!isEmpty(projections)) out.projections = projections;

  // --- Layer 3: Decisions (top-level `decisions:` block) ---
  // `route.model` holds the uid of the connected Layer-4 node — either a
  // Model node (→ inline `model:` string) or a Model Group node (→ the
  // `modelRefs:` form). Index both by uid so decisions can resolve them.
  const modelNodeByUid: Record<string, any> = {};
  for (const m of state.models || []) {
    if (m?.uid) modelNodeByUid[m.uid] = { kind: "model", node: m };
  }
  for (const g of state.modelGroups || []) {
    if (g?.uid) modelNodeByUid[g.uid] = { kind: "group", node: g };
  }

  const decisions = (state.routes || []).map((route: any) => {
    const item: any = { name: route.name };
    if (route.description) item.description = route.description;
    const rules = rulesToYaml(route.rules, signalTypeByName);
    // If the rule didn't resolve (no signals, dangling refs) emit a sentinel
    // that the engine will accept (catch-all via an `any` signal — only works
    // if the user has one; otherwise this decision will be skipped at runtime
    // and lintRouter warns).
    item.rules = rules || { type: "always", name: "any" };
    if (Number.isFinite(route.priority)) {
      item.priority = route.priority;
    }
    if (Number.isFinite(route.tier) && route.tier !== 0) {
      item.tier = route.tier;
    }
    // Model selection: a decision carries EITHER `model` OR `modelRefs`,
    // never both. A Model node emits the inline `model:` string; a Model
    // Group node emits the `modelRefs:` list (+ `algorithm:` when non-default).
    // An unresolved/empty `route.model` emits nothing — lintRouter flags it.
    const sel = modelNodeByUid[route.model];
    if (sel?.kind === "model") {
      if (sel.node.model_id) item.model = sel.node.model_id;
    } else if (sel?.kind === "group") {
      const refs = (sel.node.refs || [])
        .filter((r: any) => r && r.model && String(r.model).trim())
        .map(modelRefToYaml);
      if (refs.length) {
        item.modelRefs = refs;
        const algo = algorithmToYaml(sel.node);
        if (algo) item.algorithm = algo;
      }
    }
    // Plugins: the same plugin type can appear on different decisions with
    // different `configuration`, which the shared Layer-5 plugin nodes can't
    // represent — so re-emit the raw per-decision plugin list verbatim when
    // the decision was imported with one; otherwise build from Layer 5.
    if (Array.isArray(route._rawPlugins) && route._rawPlugins.length) {
      item.plugins = route._rawPlugins;
    } else {
      const plugins = (route.plugins || []).filter(Boolean);
      if (plugins.length) {
        // Match a state-side plugin record by name so we can emit its config.
        const pluginByName: Record<string, any> = {};
        for (const p of state.plugins || []) {
          if (p?.name) pluginByName[p.name] = p;
        }
        item.plugins = plugins.map((nameOrSpec: any) => {
          if (typeof nameOrSpec !== "string") return nameOrSpec;
          const p = pluginByName[nameOrSpec];
          if (!p) return nameOrSpec;  // bare reference; engine treats as {type: name, configuration: {}}
          const out: any = { type: p.type };
          if (p.config && !isEmpty(p.config)) out.configuration = p.config;
          return out;
        });
      }
    }
    return item;
  });
  if (decisions.length) out.decisions = decisions;

  const g: any = {};
  if (Number.isFinite(state.guardrails?.daily_cost_cap_usd)) {
    g.daily_cost_cap_usd = state.guardrails.daily_cost_cap_usd;
  }
  const forbidden = (state.guardrails?.forbidden_models || []).filter(Boolean);
  if (forbidden.length) g.forbidden_models = forbidden;
  if (state.guardrails?.pii_block_outbound) g.pii_block_outbound = true;
  if (Number.isFinite(state.guardrails?.max_model_cost_usd_per_m)) {
    g.max_model_cost_usd_per_m = state.guardrails.max_model_cost_usd_per_m;
  }
  if (!isEmpty(g)) out.guardrails = g;

  const obs: any = {};
  if (state.observability?.log_decisions) obs.log_decisions = true;
  if (state.observability?.shadow) obs.shadow = true;
  if (!isEmpty(obs)) out.observability = obs;

  return out;
}

export function buildRouterYaml(state: any): string {
  const dict = buildRouterDict(state);
  return stringifyYAML(dict, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  } as any);
}

// ---------- importer ----------

function configFromYaml(_type: string, raw: any, fields: any[]): any {
  if (!raw || typeof raw !== "object") return {};
  const out: any = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (value === undefined) continue;
    if (field.kind === "string-list") {
      out[field.key] = Array.isArray(value) ? value.join(", ") : String(value);
    } else if (field.kind === "yaml") {
      out[field.key] = stringifyYAML(value, { indent: 2, lineWidth: 120 } as any).trimEnd();
    } else if (field.kind === "number" || field.kind === "bool") {
      out[field.key] = value;
    } else {
      out[field.key] = String(value);
    }
  }
  return out;
}

export function fromRouterDict(dict: any): any {
  const d = dict || {};
  // New schema is top-level (`signals`, `decisions`, `projections`). The OLD
  // schema nested everything under `routing`. We fall back to `routing.*` when
  // top-level is missing so loading legacy YAMLs doesn't lose data.
  const legacy = d.routing || {};

  // Layer 1: signals.  New shape uses `.name`; old YAMLs used `.id`.
  const signals = (d.signals || []).map((s: any, i: number) => {
    const spec: any = (SIGNAL_TYPE_BY_KEY as any)[s.type];
    const name = s.name || s.id || "";
    return {
      uid: `sig-${i}-${name}`,
      name,
      type: s.type || "always",
      version: s.version ?? 1,
      timeout_ms: s.timeout_ms ?? 50,
      config: configFromYaml(s.type, s.config || {}, spec?.fields || []),
      // Full raw config kept verbatim so export can round-trip every field,
      // including ones the builder catalog doesn't model. See buildRouterDict.
      _rawConfig: s.config && typeof s.config === "object" ? s.config : {},
      userQueryConnected: true,
    };
  });

  // Layer 2: projections — top-level `projections:` in new schema, was
  // `routing.{partitions,scores,mappings}` in old.
  const projSrc = d.projections || legacy;
  const projections: any[] = [];
  const addProj = (type: string, name: string, config: any, uid: string) =>
    projections.push({ uid, type, name, config });
  let pi = 0;
  for (const p of projSrc.partitions || []) {
    addProj("partition", p.name, {
      members: p.members,
      default: p.default,
      semantics: p.semantics || "exclusive",
    }, `proj-${pi++}-${p.name || ""}`);
  }
  for (const p of projSrc.scores || []) {
    const type = p.inputs ? "weighted_sum" : "round_robin";
    addProj(type, p.name, {
      inputs: p.inputs,
      items: p.items,
    }, `proj-${pi++}-${p.name || ""}`);
  }
  for (const p of projSrc.mappings || []) {
    addProj("threshold_bands", p.name, {
      source: p.source,
      outputs: p.outputs,
      calibration: p.calibration,
    }, `proj-${pi++}-${p.name || ""}`);
  }

  // Layer 3: decisions (new) / routing.routes (old). Stored in canvas state
  // under `routes` (component-internal naming — emitted as `decisions:`).
  const decisionsSrc = Array.isArray(d.decisions) ? d.decisions : (legacy.routes || []);

  // Layer 4: model nodes. The new schema gives each decision EITHER an inline
  // `model:` string OR a `modelRefs:` list. We materialize a Model node per
  // unique inline string (deduped by model id) and a Model Group node per
  // distinct `modelRefs` set, and point `route.model` at the node's uid.
  const models: any[] = [];
  const modelGroups: any[] = [];
  const modelUidByModelId: Record<string, string> = {};
  const groupUidByKey: Record<string, string> = {};

  // Legacy `routing.models` carried name→model aliases — map them so a legacy
  // decision's `model:` alias resolves to the real model string.
  const legacyModelIdByAlias: Record<string, string> = {};
  for (const m of legacy.models || []) {
    if (m?.name && m?.model) legacyModelIdByAlias[m.name] = m.model;
  }

  function ensureModelNode(modelId: string): string {
    if (modelUidByModelId[modelId]) return modelUidByModelId[modelId];
    const uid = `model-${models.length}-${sanitizeIdent(modelId)}`;
    models.push({ uid, model_id: modelId });
    modelUidByModelId[modelId] = uid;
    return uid;
  }

  function ensureModelGroup(refsRaw: any[], algorithm: any, decName: string): string {
    const refs = refsRaw.map(normalizeModelRef);
    // Dedup by content so identical modelRefs sets share one canvas node.
    const key = JSON.stringify([refs, algorithm ?? null]);
    if (groupUidByKey[key]) return groupUidByKey[key];
    const uid = `mgroup-${modelGroups.length}-${sanitizeIdent(decName || "group")}`;
    const group: any = { uid, refs, algorithm: (algorithm && algorithm.type) || "static" };
    // Keep the raw algorithm so export can round-trip algorithm-specific keys.
    if (algorithm) group._rawAlgorithm = algorithm;
    modelGroups.push(group);
    groupUidByKey[key] = uid;
    return uid;
  }

  const routes = decisionsSrc.map((dec: any, i: number) => {
    // A decision selects EITHER `modelRefs` (→ Model Group node) or a single
    // inline `model:` string (→ Model node). `route.model` holds the uid.
    let routeModel = "";
    if (Array.isArray(dec.modelRefs) && dec.modelRefs.length > 0) {
      routeModel = ensureModelGroup(dec.modelRefs, dec.algorithm, dec.name);
    } else {
      let rawModel = dec.model || "";
      if (rawModel && legacyModelIdByAlias[rawModel]) {
        rawModel = legacyModelIdByAlias[rawModel];
      }
      if (rawModel) routeModel = ensureModelNode(rawModel);
    }

    const route: any = {
      uid: `route-${i}-${dec.name || ""}`,
      name: dec.name || "",
      description: dec.description || "",
      // Prefer new-schema `rules`; fall back to old `when`.
      rules: rulesFromYaml(dec.rules ?? dec.when ?? { type: "always", name: "any" }),
      priority: dec.priority ?? 0,
      tier: dec.tier ?? 0,
      model: routeModel,
      // plugins entries can be bare strings ("system_prompt") OR objects with
      // {type, configuration}. We flatten to strings for the route's plugin
      // list and (if any object form is present) materialize them into Layer 5.
      plugins: (dec.plugins || []).map((p: any) =>
        typeof p === "string" ? p : (p?.type || "")
      ).filter(Boolean),
    };
    // Carry the raw plugin list too: the same plugin type can appear on two
    // decisions with different `configuration`, which the shared Layer-5
    // plugin nodes can't represent. Export re-emits this verbatim.
    if (Array.isArray(dec.plugins) && dec.plugins.length) {
      route._rawPlugins = dec.plugins;
    }
    return route;
  });

  // Layer 5 plugins: materialize from BOTH the legacy routing.plugins list
  // AND the new-schema per-decision plugin objects (so the Plugin layer
  // shows real config the user can edit).
  const pluginsByKey = new Map<string, any>();
  for (const p of legacy.plugins || []) {
    const key = `${p.type || ""}:${p.name || ""}`;
    if (pluginsByKey.has(key)) continue;
    pluginsByKey.set(key, {
      uid: `plugin-${pluginsByKey.size}-${p.name || ""}`,
      name: p.name || p.type || "",
      type: p.type || "semantic_cache",
      enabled: p.enabled !== undefined ? p.enabled : true,
      config: p.config || {},
    });
  }
  for (const dec of decisionsSrc) {
    for (const p of dec.plugins || []) {
      if (typeof p === "string" || !p?.type) continue;
      // Use plugin `type` as the canvas-side `name` so route references match.
      const key = `${p.type}:${p.type}`;
      if (pluginsByKey.has(key)) continue;
      pluginsByKey.set(key, {
        uid: `plugin-${pluginsByKey.size}-${p.type}`,
        name: p.type,
        type: p.type,
        enabled: true,
        config: p.configuration || {},
      });
    }
  }
  const plugins = Array.from(pluginsByKey.values());

  return {
    name: d.name || "",
    description: d.description || "",
    version: d.version ?? 1,
    schema_version: d.schema_version ?? 1,
    created_at: d.created_at || "",
    created_by: d.created_by || "",
    created_by_method: d.created_by_method || "direct",
    defaults: {
      alpha: d.defaults?.alpha ?? 0.5,
      fallback_chain: Array.isArray(d.defaults?.fallback_chain) ? d.defaults.fallback_chain : [],
      on_no_match: d.defaults?.on_no_match || "route_to_default",
    },
    signals,
    projections,
    routes,
    models,
    modelGroups,
    plugins,
    guardrails: {
      daily_cost_cap_usd: d.guardrails?.daily_cost_cap_usd ?? null,
      forbidden_models: Array.isArray(d.guardrails?.forbidden_models)
        ? d.guardrails.forbidden_models
        : [],
      pii_block_outbound: !!d.guardrails?.pii_block_outbound,
      max_model_cost_usd_per_m: d.guardrails?.max_model_cost_usd_per_m ?? null,
    },
    observability: {
      log_decisions: !!d.observability?.log_decisions,
      shadow: !!d.observability?.shadow,
    },
  };
}

export function parseRouterYaml(text: string): any {
  return fromRouterDict(parseYAML(text));
}

// ---------- validation ----------

export function lintRouter(state: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state.name) errors.push("`name` is required.");
  else if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(state.name)) {
    errors.push("`name` must match ^[a-zA-Z_][a-zA-Z0-9_-]*$ (URL-safe).");
  }

  // Layer 1: signals (new schema uses `.name`)
  const sigNames = new Set<string>();
  for (const s of state.signals || []) {
    if (!s.name) errors.push("Signal is missing `name`.");
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.name)) {
      errors.push(`Signal name \`${s.name}\` is not a valid identifier.`);
    } else if (sigNames.has(s.name)) {
      errors.push(`Duplicate signal name \`${s.name}\`.`);
    } else {
      sigNames.add(s.name);
    }
    if (!(SIGNAL_TYPE_BY_KEY as any)[s.type]) {
      errors.push(`Signal \`${s.name || "?"}\` has unknown type \`${s.type}\`.`);
    }
  }

  // Layer 2: projections
  const projNames = new Set<string>();
  for (const p of state.projections || []) {
    if (!p.name) errors.push("Projection is missing `name`.");
    else if (projNames.has(p.name)) {
      errors.push(`Duplicate projection name \`${p.name}\`.`);
    } else {
      projNames.add(p.name);
    }
    if (!(PROJECTION_TYPE_BY_KEY as any)[p.type]) {
      errors.push(`Projection \`${p.name || "?"}\` has unknown type \`${p.type}\`.`);
    }
  }

  // A rule leaf may reference a projection output as well as a signal: a
  // partition's name, or any threshold-bands mapping output name. Mirrors the
  // `declared_with_projections` set in router_service's validator.py.
  const projLeafNames = new Set<string>();
  for (const p of state.projections || []) {
    if (p.type === "partition" && p.name) projLeafNames.add(p.name);
    if (p.type === "threshold_bands") {
      for (const o of p.config?.outputs || []) {
        if (o?.name) projLeafNames.add(o.name);
      }
    }
  }

  // Layer 3: decisions
  if (!state.routes || state.routes.length === 0) {
    errors.push("At least one decision is required.");
  }
  // `route.model` references a Layer-4 node (Model or Model Group) by uid.
  const modelNodeUids = new Set<string>();
  for (const m of state.models || []) if (m?.uid) modelNodeUids.add(m.uid);
  for (const g of state.modelGroups || []) if (g?.uid) modelNodeUids.add(g.uid);

  const routeNames = new Set<string>();
  let hasCatchAll = false;  // any decision referencing an `always`-type signal
  for (const rt of state.routes || []) {
    if (!rt.name) errors.push("Decision is missing `name`.");
    else if (routeNames.has(rt.name)) errors.push(`Duplicate decision name \`${rt.name}\`.`);
    else routeNames.add(rt.name);
    if (!rt.model) {
      errors.push(`Decision \`${rt.name || "?"}\` is missing a model.`);
    } else if (!modelNodeUids.has(rt.model)) {
      errors.push(`Decision \`${rt.name || "?"}\` references a missing model node.`);
    }
    walkRules(rt.rules, (leaf: any) => {
      const name = leaf.signalName;
      if (name && !sigNames.has(name) && !projLeafNames.has(name)) {
        errors.push(`Decision \`${rt.name || "?"}\` references unknown signal \`${name}\`.`);
      }
      if (name) {
        const sig = (state.signals || []).find((s: any) => s.name === name);
        if (sig?.type === "always") hasCatchAll = true;
      }
    });
  }

  // Layer 4: models. A Model node must carry a model string; a Model Group
  // node must hold at least one model. (No canvas-only `name` exists anymore —
  // the YAML model string is the source of truth.)
  for (const m of state.models || []) {
    if (!m?.model_id || !String(m.model_id).trim()) {
      errors.push("A Model node has no model selected.");
    }
  }
  for (const g of state.modelGroups || []) {
    const refs = (g?.refs || []).filter(
      (r: any) => r && r.model && String(r.model).trim()
    );
    if (refs.length === 0) {
      errors.push("A Model Group node has no models.");
    }
  }

  // Layer 5: plugins
  for (const p of state.plugins || []) {
    if (!p.name) errors.push("Plugin is missing `name`.");
  }

  if (
    !hasCatchAll &&
    (state.defaults?.on_no_match || "route_to_default") === "route_to_default"
  ) {
    warnings.push(
      "No decision references an `always`-type signal — requests that match nothing will fall through. Add an `always` signal and reference it from your fallback decision."
    );
  }

  // User Query reachability — signals not wired from the User Query entry
  // node are dropped from the exported YAML. Surface them so the user can
  // decide to connect or delete.
  const disconnected = (state.signals || []).filter(
    (sig: any) => sig.userQueryConnected === false
  );
  for (const sig of disconnected) {
    warnings.push(
      `Signal \`${sig.name || sig.uid}\` is not connected to User Query — it will be excluded from the exported YAML. Connect it on the canvas or delete it.`
    );
  }

  return { errors, warnings };
}

function walkRules(rules: any, onLeaf: (leaf: any) => void): void {
  if (!rules) return;
  if (rules.kind === "leaf") onLeaf(rules);
  else if (rules.kind === "and" || rules.kind === "or") {
    (rules.children || []).forEach((c: any) => walkRules(c, onLeaf));
  } else if (rules.kind === "not") {
    walkRules(rules.child, onLeaf);
  }
}
