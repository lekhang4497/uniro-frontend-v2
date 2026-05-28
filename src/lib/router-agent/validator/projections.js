// Validate `projections.{partitions,scores,mappings}`.
//
// Returns the projection-output index used by the rule walker:
//   {
//     names:  Set<string>,     // all referenceable leaf names contributed by projections
//     scores: Set<string>,     // declared score names (for mappings.source resolution)
//   }
//
// Per ROUTER_YAML.md §5 and spec §8:
//   * partitions[].name AND each entry in partitions[].members are
//     referenceable leaves of type "projection".
//   * scores[].name is *not* itself a leaf — it's only a mapping source.
//   * mappings[].outputs[].name is a referenceable leaf of type "projection".
//
// Only shape rules are enforced; we don't validate calibration math or score
// input weights.

import { NAME_RE, SIGNAL_NAME_RE } from "./registries.js";
import { pathJoin } from "./paths.js";

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function validateProjections(router, declaredSignals, errors /*, warnings */) {
  const out = { names: new Set(), scores: new Set() };
  const projections = router.projections;
  if (projections === undefined || projections === null) return out;
  if (!isPlainObject(projections)) {
    errors.push({
      path: "projections",
      code: "invalid_projections",
      message: "'projections' must be a mapping.",
    });
    return out;
  }

  validatePartitions(projections.partitions, declaredSignals, out, errors);
  validateScores(projections.scores, declaredSignals, out, errors);
  validateMappings(projections.mappings, out, errors);

  return out;
}

function validatePartitions(partitions, declaredSignals, out, errors) {
  if (partitions === undefined || partitions === null) return;
  if (!Array.isArray(partitions)) {
    errors.push({
      path: "projections.partitions",
      code: "invalid_partitions",
      message: "'projections.partitions' must be an array.",
    });
    return;
  }

  const seen = new Set();
  for (let i = 0; i < partitions.length; i++) {
    const p = partitions[i];
    const pPath = pathJoin("projections.partitions", i);
    if (!isPlainObject(p)) {
      errors.push({
        path: pPath,
        code: "invalid_partition",
        message: `Partition at ${pPath} must be a mapping.`,
      });
      continue;
    }

    if (typeof p.name !== "string" || p.name === "" || !NAME_RE.test(p.name)) {
      errors.push({
        path: pathJoin(pPath, "name"),
        code: "missing_projection_name",
        message: `Partition at ${pPath} must have a valid 'name'.`,
      });
    } else {
      if (seen.has(p.name)) {
        errors.push({
          path: pathJoin(pPath, "name"),
          code: "duplicate_partition_name",
          message: `Duplicate partition name '${p.name}'.`,
        });
      } else {
        seen.add(p.name);
      }
      out.names.add(p.name);
    }

    if (!Array.isArray(p.members) || p.members.length < 1) {
      errors.push({
        path: pathJoin(pPath, "members"),
        code: "invalid_partition_members",
        message: `Partition '${p.name ?? ""}' must have at least one member.`,
      });
    } else {
      for (let j = 0; j < p.members.length; j++) {
        const m = p.members[j];
        const mPath = pathJoin(pathJoin(pPath, "members"), j);
        if (typeof m !== "string" || !SIGNAL_NAME_RE.test(m)) {
          errors.push({
            path: mPath,
            code: "unresolved_member",
            message: `Partition member at ${mPath} must be a signal name string.`,
          });
          continue;
        }
        if (!declaredSignals.has(m)) {
          errors.push({
            path: mPath,
            code: "unresolved_member",
            message: `Partition '${p.name ?? ""}' member '${m}' is not a declared signal.`,
          });
        }
        // Each member becomes a referenceable leaf of type "projection".
        out.names.add(m);
      }
    }
  }
}

function validateScores(scores, declaredSignals, out, errors) {
  if (scores === undefined || scores === null) return;
  if (!Array.isArray(scores)) {
    errors.push({
      path: "projections.scores",
      code: "invalid_scores",
      message: "'projections.scores' must be an array.",
    });
    return;
  }

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const sPath = pathJoin("projections.scores", i);
    if (!isPlainObject(s)) {
      errors.push({
        path: sPath,
        code: "invalid_score",
        message: `Score at ${sPath} must be a mapping.`,
      });
      continue;
    }
    if (typeof s.name !== "string" || s.name === "" || !NAME_RE.test(s.name)) {
      errors.push({
        path: pathJoin(sPath, "name"),
        code: "missing_projection_name",
        message: `Score at ${sPath} must have a valid 'name'.`,
      });
    } else {
      out.scores.add(s.name);
    }

    if (s.method !== undefined && s.method !== "weighted_sum") {
      errors.push({
        path: pathJoin(sPath, "method"),
        code: "invalid_score_method",
        message: `Score '${s.name ?? ""}' method must be 'weighted_sum', got '${s.method}'.`,
      });
    }

    if (!Array.isArray(s.inputs) || s.inputs.length < 1) {
      errors.push({
        path: pathJoin(sPath, "inputs"),
        code: "invalid_score_inputs",
        message: `Score '${s.name ?? ""}' must have at least one input.`,
      });
      continue;
    }
    for (let j = 0; j < s.inputs.length; j++) {
      const inp = s.inputs[j];
      const inPath = pathJoin(pathJoin(sPath, "inputs"), j);
      if (!isPlainObject(inp)) {
        errors.push({
          path: inPath,
          code: "unresolved_score_input",
          message: `Score input at ${inPath} must be a mapping.`,
        });
        continue;
      }
      if (typeof inp.name !== "string" || !declaredSignals.has(inp.name)) {
        errors.push({
          path: pathJoin(inPath, "name"),
          code: "unresolved_score_input",
          message: `Score input '${inp.name ?? ""}' is not a declared signal.`,
        });
      }
    }
  }
}

function validateMappings(mappings, out, errors) {
  if (mappings === undefined || mappings === null) return;
  if (!Array.isArray(mappings)) {
    errors.push({
      path: "projections.mappings",
      code: "invalid_mappings",
      message: "'projections.mappings' must be an array.",
    });
    return;
  }

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const mPath = pathJoin("projections.mappings", i);
    if (!isPlainObject(m)) {
      errors.push({
        path: mPath,
        code: "invalid_mapping",
        message: `Mapping at ${mPath} must be a mapping.`,
      });
      continue;
    }
    if (typeof m.name !== "string" || m.name === "" || !NAME_RE.test(m.name)) {
      errors.push({
        path: pathJoin(mPath, "name"),
        code: "missing_projection_name",
        message: `Mapping at ${mPath} must have a valid 'name'.`,
      });
    }

    if (typeof m.source !== "string" || !out.scores.has(m.source)) {
      errors.push({
        path: pathJoin(mPath, "source"),
        code: "invalid_mapping_source",
        message: `Mapping '${m.name ?? ""}' source '${
          m.source ?? ""
        }' is not a declared score.`,
      });
    }

    if (!Array.isArray(m.outputs) || m.outputs.length < 1) {
      errors.push({
        path: pathJoin(mPath, "outputs"),
        code: "invalid_mapping_outputs",
        message: `Mapping '${m.name ?? ""}' must have at least one output.`,
      });
      continue;
    }
    for (let j = 0; j < m.outputs.length; j++) {
      const o = m.outputs[j];
      const oPath = pathJoin(pathJoin(mPath, "outputs"), j);
      if (!isPlainObject(o)) {
        errors.push({
          path: oPath,
          code: "missing_mapping_output_name",
          message: `Mapping output at ${oPath} must be a mapping.`,
        });
        continue;
      }
      if (typeof o.name !== "string" || o.name === "") {
        errors.push({
          path: pathJoin(oPath, "name"),
          code: "missing_mapping_output_name",
          message: `Mapping output at ${oPath} must have a 'name'.`,
        });
      } else {
        out.names.add(o.name);
      }
      const hasBound =
        o.lt !== undefined || o.lte !== undefined || o.gt !== undefined || o.gte !== undefined;
      if (!hasBound) {
        errors.push({
          path: oPath,
          code: "missing_mapping_output_bounds",
          message: `Mapping output '${
            o.name ?? ""
          }' must have at least one of 'lt', 'lte', 'gt', 'gte'.`,
        });
      }
    }
  }
}
