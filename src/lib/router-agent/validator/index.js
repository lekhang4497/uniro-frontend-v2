// Public API for the JS shape validator.
//
// Spec: docs/superpowers/specs/2026-05-27-router-builder-agent-design.md §8
// The validator catches the agent's most common mistakes (missing required
// fields, bad references, model xor, unknown signal/plugin types) without
// porting the full Python validator (cost cap, calibration, PII safety, etc.).
//
// Output shape (matches §8.2):
//   {
//     ok: boolean,
//     errors:   Array<{path: string, message: string, code: string}>,
//     warnings: Array<{path: string, message: string, code: string}>,
//   }

import { parse } from "./parse.js";
import { validateTopLevel } from "./topLevel.js";
import { validateSignals } from "./signals.js";
import { validateProjections } from "./projections.js";
import { validateDecisions } from "./decisions.js";
import { pathJoin } from "./paths.js";

export { parse } from "./parse.js";

export function validate(router) {
  const errors = [];
  const warnings = [];

  const ok = validateTopLevel(router, errors, warnings);
  if (!ok) {
    return { ok: false, errors, warnings };
  }

  const signalIndex = validateSignals(router, errors, warnings);
  const projectionIndex = validateProjections(
    router,
    signalIndex.names,
    errors,
    warnings
  );
  const { referencedLeaves } = validateDecisions(
    router,
    signalIndex.byName,
    projectionIndex.names,
    errors,
    warnings
  );

  // Advisory: declared signals never referenced by any rule tree.
  // A signal referenced through a projection input/member still counts as
  // referenced — those are upstream inputs, not consumers, so we still warn
  // if the signal isn't pulled into a rule somewhere. (Matches the Python
  // validator's rule 5.5.)
  for (const [name, info] of signalIndex.byName.entries()) {
    if (!referencedLeaves.has(name)) {
      warnings.push({
        path: pathJoin(info.path, "name"),
        code: "declared_signal_unreferenced",
        message: `Signal '${name}' is declared but never referenced in any decision's rules.`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateYaml(text) {
  const parsed = parse(text);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: [{ path: "$", code: "yaml_parse_error", message: parsed.error }],
      warnings: [],
    };
  }
  return validate(parsed.data);
}
