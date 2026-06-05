/**
 * Popola la tabella `routes` con le rotte dirette del dataset OpenFlights.
 * Serve a rilevare se tra due aeroporti esiste un volo diretto o serve uno scalo.
 * Uso: npm run db:seed-routes
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const ROUTES_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat";

async function main() {
  console.log("Download OpenFlights routes.dat...");
  const res = await fetch(ROUTES_URL);
  if (!res.ok) { console.error("Download fallito:", res.status); process.exit(1); }
  const csv = await res.text();

  // Formato: airline, airlineID, src, srcID, dst, dstID, codeshare, stops, equipment
  const pairs = new Set<string>();
  for (const line of csv.split("\n")) {
    const f = line.split(",");
    if (f.length < 8) continue;
    const src   = f[2]?.trim();
    const dst   = f[4]?.trim();
    const stops = f[7]?.trim();
    if (!src || !dst || src.length !== 3 || dst.length !== 3) continue;
    if (stops !== "0") continue;                 // solo voli diretti
    if (src === "\\N" || dst === "\\N") continue;
    pairs.add(`${src}|${dst}`);
  }

  console.log(`Coppie dirette uniche: ${pairs.size}`);

  await db.query("CREATE TABLE IF NOT EXISTS routes (src_iata CHAR(3) NOT NULL, dst_iata CHAR(3) NOT NULL, PRIMARY KEY (src_iata, dst_iata))");
  await db.query("TRUNCATE routes");

  // Inserimento a blocchi
  const arr = [...pairs];
  const BATCH = 1000;
  for (let i = 0; i < arr.length; i += BATCH) {
    const chunk = arr.slice(i, i + BATCH);
    const values: string[] = [];
    const params: string[] = [];
    chunk.forEach((p, j) => {
      const [s, d] = p.split("|");
      values.push(`($${j * 2 + 1}, $${j * 2 + 2})`);
      params.push(s, d);
    });
    await db.query(
      `INSERT INTO routes (src_iata, dst_iata) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`,
      params
    );
  }

  const { rows } = await db.query("SELECT COUNT(*) FROM routes");
  console.log(`Inserite ${rows[0].count} rotte dirette.`);
  await db.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
