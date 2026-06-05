/**
 * Aggiorna i punteggi delle destinazioni usando il CSV Kaggle:
 * "Top Cities Worldwide: Quality of Life Index 2024"
 * https://www.kaggle.com/datasets/bilalabdulmalik/top-cities-worldwide-quality-of-life-index-2024
 *
 * Metti il file in scripts/numbeo-data/livable_cities.csv
 * Poi esegui: npm run db:seed-numbeo
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import { Pool } from "pg";
import fs from "fs";
import path from "path";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// Mapping: nome città nel nostro DB → nome nel CSV (dove differiscono)
const ALIASES: Record<string, string> = {
  "Krakow":        "Krakow (Cracow)",
  "San Francisco": "San Francisco",
  "New York":      "New York",
};

// Colonne CSV (indice 0-based dopo split)
// "Rank","City","Country","Quality of Life Index","Purchasing Power Index",
// "Safety Index","Health Care Index","Cost of Living Index",...
const COL = { city: 1, country: 2, qol: 3, safety: 5, healthcare: 6, col: 7 };

function parseCsv(filePath: string): Map<string, Record<string, number>> {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
  const map   = new Map<string, Record<string, number>>();

  for (const line of lines.slice(1)) {            // salta intestazione
    const fields = line.slice(1, -1).split('","'); // rimuove virgolette esterne
    const city   = fields[COL.city]?.trim();
    if (!city) continue;

    map.set(city.toLowerCase(), {
      qol:        parseFloat(fields[COL.qol]      ?? "0"),
      safety:     parseFloat(fields[COL.safety]   ?? "0"),
      healthcare: parseFloat(fields[COL.healthcare] ?? "0"),
      col:        parseFloat(fields[COL.col]      ?? "0"),
    });
  }

  return map;
}

function toScores(d: Record<string, number>) {
  return {
    // Quality of Life Index: ~80-225 → 0-10 (normalizzato su 200)
    score_overall:        r10(Math.min(10, d.qol / 20)),
    // Cost of Living Index: più alto = più cara → invertiamo
    score_cost_of_living: r10(Math.max(0, Math.min(10, (150 - d.col) / 15))),
    // Safety / Healthcare: 0-100 → 0-10
    score_safety:         r10(Math.min(10, d.safety / 10)),
    score_healthcare:     r10(Math.min(10, d.healthcare / 10)),
  };
}

function r10(v: number) { return Math.round(v * 10) / 10; }

async function main() {
  const csvPath = path.join(__dirname, "numbeo-data", "livable_cities.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`File non trovato: ${csvPath}`);
    console.error("Scarica il CSV da Kaggle e mettilo in scripts/numbeo-data/livable_cities.csv");
    process.exit(1);
  }

  const csvData = parseCsv(csvPath);
  console.log(`CSV caricato: ${csvData.size} città\n`);

  const { rows } = await db.query<{ id: number; name: string }>(
    "SELECT id, name FROM destinations ORDER BY name"
  );

  let updated = 0;
  let skipped = 0;

  for (const dest of rows) {
    const lookupName = ALIASES[dest.name] ?? dest.name;
    const data       = csvData.get(lookupName.toLowerCase());

    if (!data) {
      console.log(`  ✗ ${dest.name.padEnd(24)} non trovata nel CSV`);
      skipped++;
      continue;
    }

    const s = toScores(data);

    await db.query(
      `UPDATE destinations
       SET score_overall        = $1,
           score_cost_of_living = $2,
           score_safety         = $3,
           score_healthcare     = $4
       WHERE id = $5`,
      [s.score_overall, s.score_cost_of_living, s.score_safety, s.score_healthcare, dest.id]
    );

    console.log(
      `  ✓ ${dest.name.padEnd(24)} QoL=${s.score_overall} · costo=${s.score_cost_of_living} · ` +
      `sicurezza=${s.score_safety} · sanità=${s.score_healthcare}`
    );
    updated++;
  }

  console.log(`\nAggiornate: ${updated}  |  Non trovate (mantengono valori statici): ${skipped}`);
  await db.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
