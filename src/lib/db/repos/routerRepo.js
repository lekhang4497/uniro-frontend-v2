// Router CRUD for the Router Builder agent.
//
// Router shape: { id, name, yaml, createdAt, updatedAt }
//   - id: uuid string
//   - name: display name (default 'Untitled router')
//   - yaml: full YAML document text
//   - createdAt / updatedAt: epoch millis (number)
//
// API:
//   - listRouters(): Promise<Router[]>                          // ordered by updatedAt DESC
//   - getRouter(id): Promise<Router | null>
//   - createRouter({id?, name?, yaml?}): Promise<Router>        // generates uuid if no id
//   - updateRouter(id, {name?, yaml?}): Promise<Router | null>  // touches updatedAt
//   - deleteRouter(id): Promise<boolean>
//   - ensureDefaultRouter(): Promise<Router>                    // returns first router; creates one if none
import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

const DEFAULT_NAME = "Untitled router";

function rowToRouter(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    yaml: row.yaml,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listRouters() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM routers ORDER BY updatedAt DESC`);
  return rows.map(rowToRouter);
}

export async function getRouter(id) {
  if (!id) return null;
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM routers WHERE id = ?`, [id]);
  return rowToRouter(row);
}

export async function createRouter({ id, name, yaml } = {}) {
  const db = await getAdapter();
  const now = Date.now();
  const router = {
    id: id || uuidv4(),
    name: typeof name === "string" && name.trim() ? name : DEFAULT_NAME,
    yaml: typeof yaml === "string" ? yaml : "",
    createdAt: now,
    updatedAt: now,
  };
  db.run(
    `INSERT INTO routers(id, name, yaml, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`,
    [router.id, router.name, router.yaml, router.createdAt, router.updatedAt]
  );
  return router;
}

export async function updateRouter(id, patch = {}) {
  if (!id) return null;
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM routers WHERE id = ?`, [id]);
    if (!row) return;
    const current = rowToRouter(row);
    const next = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.yaml !== undefined ? { yaml: patch.yaml } : {}),
      updatedAt: Date.now(),
    };
    db.run(
      `UPDATE routers SET name = ?, yaml = ?, updatedAt = ? WHERE id = ?`,
      [next.name, next.yaml, next.updatedAt, id]
    );
    result = next;
  });
  return result;
}

export async function deleteRouter(id) {
  if (!id) return false;
  const db = await getAdapter();
  const res = db.run(`DELETE FROM routers WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

// Atomic check-then-insert: returns the first router (most-recently-updated),
// creating a fresh default row if the table is empty.
export async function ensureDefaultRouter() {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM routers ORDER BY updatedAt DESC LIMIT 1`);
    if (row) {
      result = rowToRouter(row);
      return;
    }
    const now = Date.now();
    const router = {
      id: uuidv4(),
      name: DEFAULT_NAME,
      yaml: "",
      createdAt: now,
      updatedAt: now,
    };
    db.run(
      `INSERT INTO routers(id, name, yaml, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?)`,
      [router.id, router.name, router.yaml, router.createdAt, router.updatedAt]
    );
    result = router;
  });
  return result;
}
