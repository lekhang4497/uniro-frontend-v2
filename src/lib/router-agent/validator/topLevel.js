// Top-level validation: object shape, allowed keys, router `name`.

import { ALLOWED_TOP_KEYS, NAME_RE } from "./registries.js";

function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export function validateTopLevel(router, errors /*, warnings */) {
  if (!isPlainObject(router)) {
    errors.push({
      path: "$",
      code: "not_object",
      message: `Router must be a YAML mapping, got ${
        Array.isArray(router) ? "array" : typeof router
      }.`,
    });
    return false;
  }

  for (const key of Object.keys(router)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      errors.push({
        path: key,
        code: "unknown_top_key",
        message: `Unknown top-level key '${key}'. Allowed: ${[
          ...ALLOWED_TOP_KEYS,
        ]
          .sort()
          .join(", ")}.`,
      });
    }
  }

  if (!("name" in router) || router.name === undefined || router.name === null) {
    errors.push({
      path: "name",
      code: "missing_name",
      message: "Router 'name' is required.",
    });
  } else if (typeof router.name !== "string" || !NAME_RE.test(router.name)) {
    errors.push({
      path: "name",
      code: "invalid_name",
      message: `Router 'name' must match ${NAME_RE.source}.`,
    });
  }

  return true;
}
