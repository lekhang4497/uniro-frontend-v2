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

// ---------- helpers ----------

function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function coerceConfigValue(field, raw) {
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

function buildSignalConfig(signal) {
  const spec = SIGNAL_TYPE_BY_KEY[signal.type];
  if (!spec || spec.fields.length === 0) return undefined;
  const out = {};
  for (const field of spec.fields) {
    const raw = signal.config?.[field.key];
    const value = coerceConfigValue(field, raw);
    if (value === undefined) continue;
    if (value === field.default && field.kind !== "bool") continue;
    out[field.key] = value;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

// Convert a when-clause from the builder's tagged representation into the
// shape the YAML schema expects.
//   { kind: 'always' }                                  -> { always: true }
//   { kind: 'leaf', signalId, op, value }               -> { signal, equals: ... }
//   { kind: 'leaf', projId, ... }                       -> { projection, equals: ... }
//   { kind: 'all'|'any', children }                     -> { all: [...] }
//   { kind: 'not', child }                              -> { not: ... }
export function whenToYaml(when) {
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
        const out = { projection: projId };
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
      const out = { signal: id };
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
        .filter((c) => c !== undefined);
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
export function whenFromYaml(node) {
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

export function buildRouterDict(state) {
  const out = {};
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

  const defaults = {};
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
  const signals = (state.signals || []).map((sig) => {
    const item = { id: sig.id, type: sig.type };
    if (Number.isFinite(sig.version) && sig.version !== 1) item.version = sig.version;
    const cfg = buildSignalConfig(sig);
    if (cfg) item.config = cfg;
    if (Number.isFinite(sig.timeout_ms) && sig.timeout_ms !== 50) {
      item.timeout_ms = sig.timeout_ms;
    }
    return item;
  });
  if (signals.length) out.signals = signals;

  // --- Layer 2: Projection Coordination ---
  const partitions = [];
  const scores = [];
  const mappings = [];

  for (const proj of state.projections || []) {
    const item = { name: proj.name };
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
      mappings.push(item);
    } else if (proj.type === "round_robin") {
      if (proj.config?.items) item.items = proj.config.items;
      scores.push(item);
    }
  }

  const routing = {};
  if (partitions.length) routing.partitions = partitions;
  if (scores.length) routing.scores = scores;
  if (mappings.length) routing.mappings = mappings;

  // --- Layer 3: Routes (Decision Making) ---
  const routes = (state.routes || []).map((route) => {
    const item = { name: route.name };
    const when = whenToYaml(route.when);
    item.when = when || { always: true };
    if (Number.isFinite(route.priority) && route.priority !== 0) {
      item.priority = route.priority;
    } else {
      item.priority = 0;
    }
    if (route.model) item.model = route.model;
    const plugins = (route.plugins || []).filter(Boolean);
    if (plugins.length) item.plugins = plugins;
    return item;
  });
  if (routes.length) routing.routes = routes;

  // --- Layer 4: Models ---
  const models = (state.models || []).map((m) => {
    const item = { name: m.name };
    if (m.model_id) item.model = m.model_id;
    if (Number.isFinite(m.max_tokens)) item.max_tokens = m.max_tokens;
    if (m.temperature !== undefined && m.temperature !== 0.7) {
      item.temperature = m.temperature;
    }
    const overrides = {};
    if (m.parallel_tool_calls !== undefined) overrides.parallel_tool_calls = m.parallel_tool_calls;
    if (m.extra_config) overrides.extra_config = m.extra_config;
    if (!isEmpty(overrides)) item.config = overrides;
    return item;
  });
  if (models.length) routing.models = models;

  // --- Layer 5: Plugins ---
  const plugins = (state.plugins || []).map((p) => {
    const item = { name: p.name, type: p.type };
    if (p.enabled !== undefined && p.enabled !== true) item.enabled = p.enabled;
    if (p.config && !isEmpty(p.config)) item.config = p.config;
    return item;
  });
  if (plugins.length) routing.plugins = plugins;

  if (!isEmpty(routing)) out.routing = routing;

  const g = {};
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

  const obs = {};
  if (state.observability?.log_decisions) obs.log_decisions = true;
  if (state.observability?.shadow) obs.shadow = true;
  if (!isEmpty(obs)) out.observability = obs;

  return out;
}

export function buildRouterYaml(state) {
  const dict = buildRouterDict(state);
  return stringifyYAML(dict, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

// ---------- importer ----------

function configFromYaml(type, raw, fields) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (value === undefined) continue;
    if (field.kind === "string-list") {
      out[field.key] = Array.isArray(value) ? value.join(", ") : String(value);
    } else if (field.kind === "yaml") {
      out[field.key] = stringifyYAML(value, { indent: 2, lineWidth: 120 }).trimEnd();
    } else if (field.kind === "number" || field.kind === "bool") {
      out[field.key] = value;
    } else {
      out[field.key] = String(value);
    }
  }
  return out;
}

export function fromRouterDict(dict) {
  const d = dict || {};
  const r = d.routing || {};

  // Layer 1: signals
  const signals = (d.signals || []).map((s, i) => {
    const spec = SIGNAL_TYPE_BY_KEY[s.type];
    return {
      uid: `sig-${i}-${s.id || ""}`,
      id: s.id || "",
      type: s.type || "language_detector",
      version: s.version ?? 1,
      timeout_ms: s.timeout_ms ?? 50,
      config: configFromYaml(s.type, s.config || {}, spec?.fields || []),
    };
  });

  // Layer 2: projections
  const projections = [];
  const addProj = (type, name, config, uid) =>
    projections.push({ uid, type, name, config });
  let pi = 0;
  for (const p of r.partitions || []) {
    addProj("partition", p.name, {
      members: p.members,
      default: p.default,
      semantics: p.semantics || "exclusive",
    }, `proj-${pi++}-${p.name || ""}`);
  }
  for (const p of r.scores || []) {
    const type = p.inputs ? "weighted_sum" : "round_robin";
    addProj(type, p.name, {
      inputs: p.inputs,
      items: p.items,
    }, `proj-${pi++}-${p.name || ""}`);
  }
  for (const p of r.mappings || []) {
    addProj("threshold_bands", p.name, {
      source: p.source,
      outputs: p.outputs,
    }, `proj-${pi++}-${p.name || ""}`);
  }

  // Layer 3: routes
  const routes = (r.routes || []).map((route, i) => ({
    uid: `route-${i}-${route.name || ""}`,
    name: route.name || "",
    when: whenFromYaml(route.when || { always: true }),
    priority: route.priority ?? 0,
    model: route.model || "",
    plugins: Array.isArray(route.plugins) ? route.plugins : [],
  }));

  // Layer 4: models
  const models = (r.models || []).map((m, i) => ({
    uid: `model-${i}-${m.name || ""}`,
    name: m.name || "",
    model_id: m.model || "",
    max_tokens: m.max_tokens,
    temperature: m.temperature ?? 0.7,
    parallel_tool_calls: m.config?.parallel_tool_calls,
    extra_config: m.config?.extra_config,
  }));

  // Layer 5: plugins
  const plugins = (r.plugins || []).map((p, i) => ({
    uid: `plugin-${i}-${p.name || ""}`,
    name: p.name || "",
    type: p.type || "semantic_cache",
    enabled: p.enabled !== undefined ? p.enabled : true,
    config: p.config || {},
  }));

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

export function parseRouterYaml(text) {
  return fromRouterDict(parseYAML(text));
}

// ---------- validation ----------

export function lintRouter(state) {
  const errors = [];
  const warnings = [];

  if (!state.name) errors.push("`name` is required.");
  else if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(state.name)) {
    errors.push("`name` must match ^[a-zA-Z_][a-zA-Z0-9_-]*$ (URL-safe).");
  }

  // Layer 1: signals
  const sigIds = new Set();
  for (const s of state.signals || []) {
    if (!s.id) errors.push("Signal is missing `id`.");
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.id)) {
      errors.push(`Signal id \`${s.id}\` is not a valid identifier.`);
    } else if (sigIds.has(s.id)) {
      errors.push(`Duplicate signal id \`${s.id}\`.`);
    } else {
      sigIds.add(s.id);
    }
    if (!SIGNAL_TYPE_BY_KEY[s.type]) {
      errors.push(`Signal \`${s.id || "?"}\` has unknown type \`${s.type}\`.`);
    }
  }

  // Layer 2: projections
  const projIds = new Set();
  for (const p of state.projections || []) {
    if (!p.name) errors.push("Projection is missing `name`.");
    else if (projIds.has(p.name)) {
      errors.push(`Duplicate projection name \`${p.name}\`.`);
    } else {
      projIds.add(p.name);
    }
    if (!PROJECTION_TYPE_BY_KEY[p.type]) {
      errors.push(`Projection \`${p.name || "?"}\` has unknown type \`${p.type}\`.`);
    }
  }

  // Layer 3: routes
  if (!state.routes || state.routes.length === 0) {
    errors.push("At least one route (decision) is required.");
  }
  const routeNames = new Set();
  let hasAlways = false;
  for (const rt of state.routes || []) {
    if (!rt.name) errors.push("Route is missing `name`.");
    else if (routeNames.has(rt.name)) errors.push(`Duplicate route name \`${rt.name}\`.`);
    else routeNames.add(rt.name);
    if (!rt.model) errors.push(`Route \`${rt.name || "?"}\` is missing a model.`);
    if (rt.when?.kind === "always") hasAlways = true;
    // signal references in when-clause
    walkWhen(rt.when, (leaf) => {
      if (leaf.signalId && !sigIds.has(leaf.signalId)) {
        errors.push(`Route \`${rt.name || "?"}\` references unknown signal \`${leaf.signalId}\`.`);
      }
      if (leaf.projId && !projIds.has(leaf.projId)) {
        errors.push(`Route \`${rt.name || "?"}\` references unknown projection \`${leaf.projId}\`.`);
      }
    });
  }

  // Layer 4: models
  const modelNames = new Set();
  for (const m of state.models || []) {
    if (!m.name) errors.push("Model is missing `name`.");
    else if (modelNames.has(m.name)) {
      errors.push(`Duplicate model name \`${m.name}\`.`);
    } else {
      modelNames.add(m.name);
    }
  }

  // Layer 5: plugins
  for (const p of state.plugins || []) {
    if (!p.name) errors.push("Plugin is missing `name`.");
  }

  if (
    !hasAlways &&
    (state.defaults?.on_no_match || "route_to_default") === "route_to_default"
  ) {
    warnings.push(
      "No `always: true` route found — requests that match nothing will fall through."
    );
  }

  return { errors, warnings };
}

function walkWhen(when, onLeaf) {
  if (!when) return;
  if (when.kind === "leaf") onLeaf(when);
  else if (when.kind === "all" || when.kind === "any") {
    (when.children || []).forEach((c) => walkWhen(c, onLeaf));
  } else if (when.kind === "not") {
    walkWhen(when.child, onLeaf);
  }
}
