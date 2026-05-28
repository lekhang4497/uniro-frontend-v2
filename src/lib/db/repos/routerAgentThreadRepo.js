// Persistence for the Router Builder agent's per-router conversation thread.
//
// Thread shape: { routerId, messages: Array, updatedAt }
//   - routerId: foreign key to routers.id (string)
//   - messages: OpenAI-shaped array — [{role, content, tool_calls?, tool_call_id?, ...}, ...]
//   - updatedAt: epoch millis (number)
//
// API:
//   - getThread(routerId): Promise<{routerId, messages, updatedAt} | null>
//   - saveThread(routerId, messages): Promise<void>      // replaces messages, touches updatedAt
//   - deleteThread(routerId): Promise<void>
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

function rowToThread(row) {
  if (!row) return null;
  return {
    routerId: row.routerId,
    messages: parseJson(row.messagesJson, []),
    updatedAt: row.updatedAt,
  };
}

export async function getThread(routerId) {
  if (!routerId) return null;
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM routerAgentThreads WHERE routerId = ?`, [routerId]);
  return rowToThread(row);
}

export async function saveThread(routerId, messages) {
  if (!routerId) throw new Error("routerId required");
  if (!Array.isArray(messages)) throw new Error("messages must be an array");
  const db = await getAdapter();
  const json = stringifyJson(messages);
  const updatedAt = Date.now();
  db.run(
    `INSERT INTO routerAgentThreads(routerId, messagesJson, updatedAt) VALUES(?, ?, ?)
     ON CONFLICT(routerId) DO UPDATE SET messagesJson = excluded.messagesJson, updatedAt = excluded.updatedAt`,
    [routerId, json, updatedAt]
  );
}

export async function deleteThread(routerId) {
  if (!routerId) return;
  const db = await getAdapter();
  db.run(`DELETE FROM routerAgentThreads WHERE routerId = ?`, [routerId]);
}
