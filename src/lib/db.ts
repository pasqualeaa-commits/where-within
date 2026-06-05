import { Pool } from "pg";

// Pool singleton: riutilizzato tra le richieste Next.js (importante in dev con hot reload)
const globalForPg = globalThis as unknown as { pgPool: Pool };

export const db =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = db;
}
