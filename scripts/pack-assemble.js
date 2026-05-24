#!/usr/bin/env node
"use strict";

// Assemble `dist/` from a finished `npm run build`. Mirrors what the
// Dockerfile runner stage does: drop the Next standalone server at the top of
// dist/, then graft .next/static and public alongside it where the standalone
// server expects them.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error(
    `pack-assemble: ${standalone} does not exist. Run \`npm run build\` first.`,
  );
  process.exit(1);
}

console.log("pack-assemble: clearing", dist);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copy(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`pack-assemble: missing ${src}`);
    process.exit(1);
  }
  console.log(`pack-assemble: ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
  fs.cpSync(src, dest, { recursive: true, dereference: false });
}

copy(standalone, dist);
copy(path.join(root, ".next", "static"), path.join(dist, ".next", "static"));
copy(path.join(root, "public"), path.join(dist, "public"));
copy(path.join(root, "open-sse"), path.join(dist, "open-sse"));
copy(path.join(root, "src", "mitm"), path.join(dist, "src", "mitm"));

const nodeForge = path.join(root, "node_modules", "node-forge");
if (fs.existsSync(nodeForge)) {
  copy(nodeForge, path.join(dist, "node_modules", "node-forge"));
}

const bytes = Number(
  execSync(`du -sb "${dist}" | cut -f1`, { encoding: "utf8" }).trim(),
);
console.log(`pack-assemble: dist/ ready (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
