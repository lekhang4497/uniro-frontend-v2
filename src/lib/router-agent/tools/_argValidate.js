// Lightweight JSON-Schema-ish argument validation for tool calls.
//
// The OpenAI tool-call protocol passes function `arguments` as a string the
// caller parsed into an object before dispatch. We do a final defensive
// check here so a malformed payload becomes a structured `bad_args` error
// the agent can recover from — never an exception.
//
// This is intentionally tiny: it covers the few shapes tool definitions in
// this directory declare. It is not a full JSON Schema implementation.

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * @param {object} args   The payload to check
 * @param {object} schema An OpenAI tool-call `parameters` JSON Schema fragment
 * @returns {{ok: boolean, error?: {code: string, message: string}}}
 */
export function validateArgs(args, schema) {
  if (!schema || typeof schema !== "object") return { ok: true };

  if (args == null || typeof args !== "object" || Array.isArray(args)) {
    return {
      ok: false,
      error: {
        code: "bad_args",
        message: `Expected arguments object, got ${typeOf(args)}.`,
      },
    };
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (!(key in args)) {
      return {
        ok: false,
        error: { code: "bad_args", message: `Missing required argument '${key}'.` },
      };
    }
  }

  const properties = schema.properties || {};
  for (const [key, def] of Object.entries(properties)) {
    if (!(key in args)) continue;
    const v = args[key];
    const expectedType = def && def.type;
    if (!expectedType) continue;
    const actual = typeOf(v);
    const expectedList = Array.isArray(expectedType) ? expectedType : [expectedType];
    // 'integer' is a JSON Schema subtype of number.
    const ok = expectedList.some((t) => {
      if (t === "integer") return actual === "number" && Number.isInteger(v);
      if (t === "number") return actual === "number";
      return actual === t;
    });
    if (!ok) {
      return {
        ok: false,
        error: {
          code: "bad_args",
          message: `Argument '${key}' must be ${expectedList.join("|")}, got ${actual}.`,
        },
      };
    }
  }
  return { ok: true };
}

// Convenience wrapper. Tools call this at the top of execute() and early-
// return the error object if invalid.
export function checkArgsOrError(args, schema) {
  const r = validateArgs(args, schema);
  if (!r.ok) return { ok: false, error: r.error };
  return null;
}
