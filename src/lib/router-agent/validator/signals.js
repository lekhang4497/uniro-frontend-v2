// Validate the `signals` array. Returns the declared signal index:
//   { byName: Map<name, {type, path}>, names: Set<name> }
//
// Per spec §8: only the *shape* is checked here — `config` keys for each
// signal type are out of scope (deferred to a full-parity validator).

import { REGISTERED_SIGNALS, SIGNAL_NAME_RE } from "./registries.js";
import { pathJoin } from "./paths.js";

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function validateSignals(router, errors /*, warnings */) {
  const result = { byName: new Map(), names: new Set() };
  if (!("signals" in router) || router.signals === undefined || router.signals === null) {
    return result;
  }

  const signals = router.signals;
  if (!Array.isArray(signals)) {
    errors.push({
      path: "signals",
      code: "invalid_signals",
      message: "'signals' must be an array.",
    });
    return result;
  }

  for (let i = 0; i < signals.length; i++) {
    const sigPath = pathJoin("signals", i);
    const s = signals[i];
    if (!isPlainObject(s)) {
      errors.push({
        path: sigPath,
        code: "invalid_signal",
        message: `Signal at ${sigPath} must be a mapping.`,
      });
      continue;
    }

    const namePath = pathJoin(sigPath, "name");
    const typePath = pathJoin(sigPath, "type");

    // name
    if (s.name === undefined || s.name === null || s.name === "") {
      errors.push({
        path: namePath,
        code: "missing_signal_name",
        message: `Signal at ${sigPath} is missing 'name'.`,
      });
    } else if (typeof s.name !== "string" || !SIGNAL_NAME_RE.test(s.name)) {
      errors.push({
        path: namePath,
        code: "invalid_signal_name",
        message: `Signal name '${s.name}' must match ${SIGNAL_NAME_RE.source}.`,
      });
    } else {
      if (result.names.has(s.name)) {
        errors.push({
          path: namePath,
          code: "duplicate_signal_name",
          message: `Duplicate signal name '${s.name}'.`,
        });
      }
      result.names.add(s.name);
    }

    // type
    if (s.type === undefined || s.type === null || s.type === "") {
      errors.push({
        path: typePath,
        code: "missing_signal_type",
        message: `Signal '${s.name ?? `at ${sigPath}`}' is missing 'type'.`,
      });
    } else if (typeof s.type !== "string" || !REGISTERED_SIGNALS.has(s.type)) {
      errors.push({
        path: typePath,
        code: "unknown_signal_type",
        message: `Signal '${
          s.name ?? `at ${sigPath}`
        }' has unknown type '${s.type}'. Known: ${[...REGISTERED_SIGNALS]
          .sort()
          .join(", ")}.`,
      });
    }

    // Record by name (first occurrence wins for type lookup).
    if (
      typeof s.name === "string" &&
      typeof s.type === "string" &&
      !result.byName.has(s.name)
    ) {
      result.byName.set(s.name, { type: s.type, path: sigPath });
    }
  }

  return result;
}
