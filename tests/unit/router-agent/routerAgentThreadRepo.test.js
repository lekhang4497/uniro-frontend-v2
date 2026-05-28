// Unit tests for routerAgentThreadRepo — save / get / delete; JSON round-trip.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "uniro-routerThread-"));
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

describe("routerAgentThreadRepo", () => {
  it("getThread → null when no row", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    expect(await repo.getThread("r1")).toBeNull();
  });

  it("saveThread → round-trips messages JSON", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello", tool_calls: [{ id: "t1", type: "function", function: { name: "f", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "t1", content: '{"ok":true}' },
    ];
    await repo.saveThread("r1", messages);
    const got = await repo.getThread("r1");
    expect(got).not.toBeNull();
    expect(got.routerId).toBe("r1");
    expect(got.messages).toEqual(messages);
    expect(typeof got.updatedAt).toBe("number");
  });

  it("saveThread → overwrites existing thread", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    await repo.saveThread("r1", [{ role: "user", content: "first" }]);
    await new Promise((res) => setTimeout(res, 2));
    await repo.saveThread("r1", [{ role: "user", content: "second" }]);
    const got = await repo.getThread("r1");
    expect(got.messages).toEqual([{ role: "user", content: "second" }]);
  });

  it("saveThread → rejects non-array messages", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    await expect(repo.saveThread("r1", "not-array")).rejects.toThrow();
    await expect(repo.saveThread("", [])).rejects.toThrow();
  });

  it("deleteThread → removes row, idempotent", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    await repo.saveThread("r1", [{ role: "user", content: "x" }]);
    await repo.deleteThread("r1");
    expect(await repo.getThread("r1")).toBeNull();
    // idempotent — does not throw
    await repo.deleteThread("r1");
    await repo.deleteThread("never-existed");
  });

  it("saveThread → preserves empty array", async () => {
    const repo = await import("@/lib/db/repos/routerAgentThreadRepo.js");
    await repo.saveThread("r1", []);
    const got = await repo.getThread("r1");
    expect(got.messages).toEqual([]);
  });
});
