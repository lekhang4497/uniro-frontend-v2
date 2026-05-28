// Validate the `decisions` array. Walks each decision's rule tree (delegated
// to rules.js) and verifies the model xor and plugin types.

import { NAME_RE, REGISTERED_PLUGINS, RESERVED_PLUGIN_NAMES } from "./registries.js";
import { pathJoin } from "./paths.js";
import { walkRule } from "./rules.js";

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function validateDecisions(router, declaredSignals, projectionNames, errors, warnings) {
  const referencedLeaves = new Set();
  const decisions = router.decisions;
  if (decisions === undefined || decisions === null) {
    return { referencedLeaves };
  }

  if (!Array.isArray(decisions)) {
    errors.push({
      path: "decisions",
      code: "invalid_decisions",
      message: "'decisions' must be an array.",
    });
    return { referencedLeaves };
  }

  const seenNames = new Set();
  const priorityIndex = new Map(); // priority → first index seen

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    const dPath = pathJoin("decisions", i);
    if (!isPlainObject(d)) {
      errors.push({
        path: dPath,
        code: "invalid_decision",
        message: `Decision at ${dPath} must be a mapping.`,
      });
      continue;
    }

    // name
    if (d.name === undefined || d.name === null || d.name === "") {
      errors.push({
        path: pathJoin(dPath, "name"),
        code: "missing_decision_name",
        message: `Decision at ${dPath} is missing 'name'.`,
      });
    } else if (typeof d.name !== "string" || !NAME_RE.test(d.name)) {
      errors.push({
        path: pathJoin(dPath, "name"),
        code: "invalid_decision_name",
        message: `Decision name '${d.name}' must match ${NAME_RE.source}.`,
      });
    } else if (seenNames.has(d.name)) {
      errors.push({
        path: pathJoin(dPath, "name"),
        code: "duplicate_decision_name",
        message: `Duplicate decision name '${d.name}'.`,
      });
    } else {
      seenNames.add(d.name);
    }

    // rules
    if (d.rules === undefined || d.rules === null) {
      errors.push({
        path: pathJoin(dPath, "rules"),
        code: "missing_rules",
        message: `Decision '${d.name ?? `at ${dPath}`}' is missing 'rules'.`,
      });
    } else {
      walkRule(
        d.rules,
        pathJoin(dPath, "rules"),
        declaredSignals,
        projectionNames,
        errors,
        referencedLeaves
      );
    }

    // model xor
    validateModelXor(d, dPath, errors);

    // plugins
    validatePlugins(d.plugins, pathJoin(dPath, "plugins"), errors);

    // Priority warning (advisory).
    if (typeof d.priority === "number") {
      if (priorityIndex.has(d.priority)) {
        // Only warn for the lower-indexed one (the first occurrence) per spec.
        const firstIdx = priorityIndex.get(d.priority);
        const firstPath = pathJoin("decisions", firstIdx);
        warnings.push({
          path: pathJoin(firstPath, "priority"),
          code: "duplicate_decision_priority",
          message: `Decisions at ${firstPath} and ${dPath} share priority ${d.priority}; tier-based selection is off.`,
        });
      } else {
        priorityIndex.set(d.priority, i);
      }
    }
  }

  return { referencedLeaves };
}

function validateModelXor(d, dPath, errors) {
  const hasModel = typeof d.model === "string" && d.model !== "";
  const hasModelRefs = Array.isArray(d.modelRefs) && d.modelRefs.length > 0;

  if (hasModel === hasModelRefs) {
    // Both or neither.
    errors.push({
      path: dPath,
      code: "model_xor",
      message: hasModel
        ? `Decision '${d.name ?? ""}' must specify either 'model' or 'modelRefs', not both.`
        : `Decision '${d.name ?? ""}' must specify either 'model' (non-empty string) or 'modelRefs' (non-empty array).`,
    });
    return;
  }

  if (hasModelRefs) {
    for (let i = 0; i < d.modelRefs.length; i++) {
      const ref = d.modelRefs[i];
      const refPath = pathJoin(pathJoin(dPath, "modelRefs"), i);
      if (
        ref === null ||
        typeof ref !== "object" ||
        Array.isArray(ref) ||
        typeof ref.model !== "string" ||
        ref.model === ""
      ) {
        errors.push({
          path: pathJoin(refPath, "model"),
          code: "model_xor",
          message: `Decision '${d.name ?? ""}' modelRefs[${i}] must have a 'model' string.`,
        });
      }
    }
  }
}

function validatePlugins(plugins, pluginsPath, errors) {
  if (plugins === undefined || plugins === null) return;
  if (!Array.isArray(plugins)) {
    errors.push({
      path: pluginsPath,
      code: "malformed_plugin",
      message: `${pluginsPath} must be an array.`,
    });
    return;
  }

  for (let i = 0; i < plugins.length; i++) {
    const p = plugins[i];
    const pPath = pathJoin(pluginsPath, i);
    let typeName;

    if (typeof p === "string") {
      typeName = p;
    } else if (p !== null && typeof p === "object" && !Array.isArray(p)) {
      if (typeof p.type !== "string" || p.type === "") {
        errors.push({
          path: pathJoin(pPath, "type"),
          code: "malformed_plugin",
          message: `Plugin at ${pPath} must have a string 'type'.`,
        });
        continue;
      }
      typeName = p.type;
    } else {
      errors.push({
        path: pPath,
        code: "malformed_plugin",
        message: `Plugin at ${pPath} must be a string or a mapping with a 'type' field.`,
      });
      continue;
    }

    if (!REGISTERED_PLUGINS.has(typeName) && !RESERVED_PLUGIN_NAMES.has(typeName)) {
      errors.push({
        path: pPath,
        code: "unknown_plugin_type",
        message: `Plugin type '${typeName}' is not registered. Known: ${[
          ...REGISTERED_PLUGINS,
        ]
          .sort()
          .join(", ")}.`,
      });
    }
  }
}
