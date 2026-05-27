// Tests for the router-agent skill manifest + body endpoints.
//
// We call the route handlers' exported GET function directly, because Next
// route handlers are plain ESM modules. The harness mocks `next/server` so
// `NextResponse.json` and the `new NextResponse(body, init)` constructor
// return a simple shape we can assert on.
//
// We do NOT mock the filesystem — these tests exercise the real
// src/lib/router-agent/skills/ directory and assert that every .md file
// shows up in the manifest and is fetchable by name.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the frontend root the same way vitest.config.js does.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "../../..");
const SKILLS_DIR = path.join(FRONTEND_ROOT, "src", "lib", "router-agent", "skills");

// The route handlers read SKILLS_DIR off process.cwd(). Vitest's cwd is
// frontend/tests by default; pin it to the frontend root for these tests.
const originalCwd = process.cwd();
beforeAll(() => {
  process.chdir(FRONTEND_ROOT);
});

// Mock next/server so the route handlers can import { NextResponse }.
// json(body, init) and `new NextResponse(body, init)` both return a
// `{status, body, headers, text, json}` shape we can inspect.
vi.mock("next/server", () => {
  class FakeResponse {
    constructor(body, init = {}) {
      this.status = init.status ?? 200;
      this.headers = init.headers ?? {};
      this._body = body;
    }
    async text() {
      return typeof this._body === "string" ? this._body : JSON.stringify(this._body);
    }
    async json() {
      return typeof this._body === "string" ? JSON.parse(this._body) : this._body;
    }
    get body() {
      // Manifest tests want body.skills directly.
      return this._body;
    }
  }
  FakeResponse.json = (body, init = {}) =>
    new FakeResponse(body, { ...init, status: init.status ?? 200 });
  return { NextResponse: FakeResponse };
});

async function loadManifestRoute() {
  const mod = await import("@/app/api/router-agent/manifest/route.js");
  return mod.GET;
}

async function loadBodyRoute() {
  const mod = await import("@/app/api/router-agent/skills/[name]/route.js");
  return mod.GET;
}

function readSkillFilenames() {
  return fs
    .readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => /^[a-z0-9-]+\.md$/.test(f))
    .sort();
}

describe("router-agent skills directory shape", () => {
  it("contains only .md files plus the _frontmatter.js helper", () => {
    const entries = fs.readdirSync(SKILLS_DIR).sort();
    const mds = entries.filter((f) => f.endsWith(".md"));
    const others = entries.filter((f) => !f.endsWith(".md"));
    expect(others).toEqual(["_frontmatter.js"]);
    // Nine skill files were defined by the spec; if that count drifts we
    // want a deliberate update.
    expect(mds.length).toBe(9);
  });
});

describe("GET /api/router-agent/manifest", () => {
  it("lists every .md file present in the skills directory", async () => {
    const GET = await loadManifestRoute();
    const res = await GET();
    expect(res.status).toBe(200);
    const onDisk = readSkillFilenames().map((f) => f.replace(/\.md$/, ""));
    const inManifest = res.body.skills.map((s) => s.name).sort();
    expect(inManifest).toEqual(onDisk);
    expect(res.body.skills.length).toBe(onDisk.length);
  });

  it("every manifest entry has name, description, and version (truthy)", async () => {
    const GET = await loadManifestRoute();
    const res = await GET();
    for (const entry of res.body.skills) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      expect(Number.isInteger(entry.version)).toBe(true);
      expect(entry.version).toBeGreaterThanOrEqual(1);
    }
  });

  it("top-level version field is present and stable across two identical calls", async () => {
    const GET = await loadManifestRoute();
    const a = await GET();
    const b = await GET();
    expect(typeof a.body.version).toBe("string");
    expect(a.body.version.length).toBeGreaterThan(0);
    expect(a.body.version).toBe(b.body.version);
  });
});

describe("GET /api/router-agent/skills/[name]", () => {
  it("returns the markdown body for every skill listed in the manifest", async () => {
    const manifestGET = await loadManifestRoute();
    const bodyGET = await loadBodyRoute();
    const manifest = await manifestGET();
    for (const entry of manifest.body.skills) {
      const res = await bodyGET({}, { params: Promise.resolve({ name: entry.name }) });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
      // Sanity: the body contains the frontmatter `name:` field.
      expect(text).toMatch(/^---/);
      expect(text).toContain(`name: ${entry.name}`);
    }
  });

  it("rejects path-traversal names with 400", async () => {
    const GET = await loadBodyRoute();
    const bads = ["../foo", "foo/bar", "foo.md", "FOO", "foo bar", "../../etc/passwd"];
    for (const name of bads) {
      const res = await GET({}, { params: Promise.resolve({ name }) });
      expect(res.status).toBe(400);
    }
  });

  it("returns 404 for a valid-looking but nonexistent name", async () => {
    const GET = await loadBodyRoute();
    const res = await GET(
      {},
      { params: Promise.resolve({ name: "does-not-exist-xyz" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("parseFrontmatter helper", () => {
  it("extracts meta and body from a typical skill file", async () => {
    const { parseFrontmatter } = await import(
      "@/lib/router-agent/skills/_frontmatter.js"
    );
    const sample = [
      "---",
      "name: my-skill",
      "description: A test skill",
      "version: 2",
      "---",
      "",
      "# Body",
      "Hello.",
      "",
    ].join("\n");
    const { meta, body } = parseFrontmatter(sample);
    expect(meta).toEqual({ name: "my-skill", description: "A test skill", version: 2 });
    expect(body).toContain("# Body");
    expect(body).toContain("Hello.");
    expect(body).not.toContain("---");
  });

  it("returns empty meta when no frontmatter present", async () => {
    const { parseFrontmatter } = await import(
      "@/lib/router-agent/skills/_frontmatter.js"
    );
    const sample = "# Just a body\nNo frontmatter here.\n";
    const { meta, body } = parseFrontmatter(sample);
    expect(meta).toEqual({});
    expect(body).toBe(sample);
  });

  it("handles empty input gracefully", async () => {
    const { parseFrontmatter } = await import(
      "@/lib/router-agent/skills/_frontmatter.js"
    );
    expect(parseFrontmatter("")).toEqual({ meta: {}, body: "" });
    expect(parseFrontmatter(null)).toEqual({ meta: {}, body: "" });
  });
});

// Restore cwd to avoid leaking to other tests.
afterAll(() => {
  process.chdir(originalCwd);
});
