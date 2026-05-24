#!/usr/bin/env node
"use strict";

// Brackets `npm pack` / `npm publish` to keep dependency fields out of the
// PUBLISHED package.json.
//
// The published package is a pure runtime artifact: bin/uniro.js uses only
// Node builtins and boots the self-contained dist/ Next standalone bundle
// (the same bundle Docker production runs). None of the repo-level
// dependencies are needed at install time.
//
// Critically, the repo declares `open-sse` as a `file:` dependency whose
// directory is NOT shipped. A registry install of a package carrying an
// unresolvable `file:` dep crashes npm/npx with:
//   "Cannot destructure property 'package' of 'node.target' as it is null."
// (npx installs from the registry, which is strict; a local-tarball install
// is lenient and hides the bug.) Stripping the dependency fields removes the
// crash and makes `npx uniro-router` install instantly.
//
//   prepack  -> trim     back up package.json, strip dependency fields
//   postpack -> restore  put the original package.json back
//
// If a publish is interrupted between the two, recover with:
//   node scripts/publish-pkg.js restore

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const bakPath = path.join(root, "package.json.bak");

const mode = process.argv[2];

if (mode === "trim") {
  if (fs.existsSync(bakPath)) {
    console.error(
      "publish-pkg: package.json.bak already exists — a previous publish " +
        "did not clean up.\n  Restore it first: node scripts/publish-pkg.js restore",
    );
    process.exit(1);
  }
  const raw = fs.readFileSync(pkgPath, "utf8");
  fs.writeFileSync(bakPath, raw);

  const pkg = JSON.parse(raw);
  delete pkg.dependencies;
  delete pkg.optionalDependencies;
  delete pkg.devDependencies;
  delete pkg.comment_better_sqlite3;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log("publish-pkg: stripped dependency fields from published package.json");
} else if (mode === "restore") {
  if (!fs.existsSync(bakPath)) {
    console.warn("publish-pkg: no package.json.bak to restore — skipping");
    process.exit(0);
  }
  fs.copyFileSync(bakPath, pkgPath);
  fs.rmSync(bakPath);
  console.log("publish-pkg: restored original package.json");
} else {
  console.error("publish-pkg: usage: publish-pkg.js <trim|restore>");
  process.exit(1);
}
