// Adds routers + routerAgentThreads tables for the Router Builder agent.
// Idempotent — uses CREATE TABLE IF NOT EXISTS so existing installs (which already
// got the tables via syncSchemaFromTables) are unaffected.
import { TABLES, buildCreateTableSql } from "../schema.js";

export default {
  version: 2,
  name: "router-agent-tables",
  up(db) {
    for (const name of ["routers", "routerAgentThreads"]) {
      db.exec(buildCreateTableSql(name, TABLES[name]));
      for (const idx of TABLES[name].indexes || []) db.exec(idx);
    }
  },
};
