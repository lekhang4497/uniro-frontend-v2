// Intentionally a no-op.
//
// Native deps (better-sqlite3) are rebuilt by electron-builder via
// `npmRebuild: true` in electron/builder.json. Running @electron/rebuild
// during a plain `npm install` would break the npm `uniro` CLI install
// for users who don't have Electron installed.
console.log("[uniro] native-rebuild skipped (handled by electron-builder).");
