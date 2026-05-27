// Unit tests for routerRepo — create / get / update / delete / ensureDefault round-trip.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "uniro-routerRepo-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("routerRepo", () => {
  it("createRouter → assigns uuid, defaults, timestamps", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const r = await repo.createRouter();
    expect(r.id).toMatch(/[0-9a-f-]{36}/);
    expect(r.name).toBe("Untitled router");
    expect(r.yaml).toBe("");
    expect(typeof r.createdAt).toBe("number");
    expect(r.updatedAt).toBe(r.createdAt);
  });

  it("createRouter → accepts explicit id/name/yaml", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const r = await repo.createRouter({ id: "fixed-id", name: "My router", yaml: "name: hello\n" });
    expect(r.id).toBe("fixed-id");
    expect(r.name).toBe("My router");
    expect(r.yaml).toBe("name: hello\n");
  });

  it("getRouter → returns row by id, null on miss", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const r = await repo.createRouter({ name: "A" });
    const fetched = await repo.getRouter(r.id);
    expect(fetched).toEqual(r);
    expect(await repo.getRouter("nope")).toBeNull();
  });

  it("listRouters → ordered by updatedAt DESC", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const a = await repo.createRouter({ name: "A" });
    // Ensure distinct updatedAt
    await new Promise((r) => setTimeout(r, 2));
    const b = await repo.createRouter({ name: "B" });
    await new Promise((r) => setTimeout(r, 2));
    await repo.updateRouter(a.id, { name: "A2" });
    const list = await repo.listRouters();
    expect(list.map((r) => r.id)).toEqual([a.id, b.id]);
  });

  it("updateRouter → patches name/yaml, touches updatedAt, returns null on miss", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const r = await repo.createRouter({ name: "Old", yaml: "old: 1\n" });
    await new Promise((res) => setTimeout(res, 2));
    const updated = await repo.updateRouter(r.id, { name: "New" });
    expect(updated.name).toBe("New");
    expect(updated.yaml).toBe("old: 1\n");
    expect(updated.updatedAt).toBeGreaterThan(r.updatedAt);

    const yamlOnly = await repo.updateRouter(r.id, { yaml: "new: 2\n" });
    expect(yamlOnly.name).toBe("New");
    expect(yamlOnly.yaml).toBe("new: 2\n");

    expect(await repo.updateRouter("nope", { name: "x" })).toBeNull();
  });

  it("deleteRouter → removes row, returns false on miss", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const r = await repo.createRouter();
    expect(await repo.deleteRouter(r.id)).toBe(true);
    expect(await repo.getRouter(r.id)).toBeNull();
    expect(await repo.deleteRouter(r.id)).toBe(false);
  });

  it("deleteRouter → cascades to routerAgentThreads (no orphan thread)", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const threadRepo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    const r = await repo.createRouter();
    await threadRepo.saveThread(r.id, [{ role: "user", content: "hi" }]);
    expect(await threadRepo.getThread(r.id)).not.toBeNull();
    expect(await repo.deleteRouter(r.id)).toBe(true);
    expect(await threadRepo.getThread(r.id)).toBeNull();
  });

  it("ensureDefaultRouter → creates one on empty, returns existing otherwise", async () => {
    const repo = await import("@/lib/db/repos/routerRepo.js");
    const first = await repo.ensureDefaultRouter();
    expect(first.id).toMatch(/[0-9a-f-]{36}/);
    expect(first.name).toBe("Untitled router");
    const second = await repo.ensureDefaultRouter();
    expect(second.id).toBe(first.id);
    const list = await repo.listRouters();
    expect(list).toHaveLength(1);
  });
});
