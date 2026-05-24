// Translator registries — extracted into a side-effect-free module so the
// individual request/response translators don't need to import the heavy
// `index.js`. That circular import was the reason index.js used lazy
// `require("./request/...")` calls, which only worked when webpack bundled
// everything; native Node ESM (`"type": "module"`) doesn't expose `require`.
//
// With this split:
//   - `index.js` statically imports every translator file at the top
//   - each translator file imports `register` from `./registry.js`
//   - no circular imports, no `require()` shims, works in both webpack and
//     native ESM (including when Next.js externalizes open-sse)

export const requestRegistry = new Map();
export const responseRegistry = new Map();

export function register(from, to, requestFn, responseFn) {
  const key = `${from}:${to}`;
  if (requestFn) requestRegistry.set(key, requestFn);
  if (responseFn) responseRegistry.set(key, responseFn);
}
