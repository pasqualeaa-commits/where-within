import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// OpenFlights airports.dat — formato CSV:
// ID, Name, City, Country, IATA, ICAO, Lat, Lon, Alt, Timezone, DST, TzDB, Type, Source
const AIRPORTS_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

interface AirportRow {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

// I nomi paese in OpenFlights non sempre coincidono con quelli di Teleport.
// Questa mappa normalizza i casi più comuni.
const COUNTRY_ALIASES: Record<string, string> = {
  "United States":            "United States",
  "USA":                      "United States",
  "UK":                       "United Kingdom",
  "Korea":                    "South Korea",
  "Republic of Korea":        "South Korea",
  "Taiwan":                   "Taiwan",
  "Czech Republic":           "Czech Republic",
  "Czechia":                  "Czech Republic",
};

function normalizeCountry(c: string): string {
  return COUNTRY_ALIASES[c] ?? c;
}

function normalizeCity(c: string): string {
  return c.toLowerCase().trim()
    .replace(/\s+/g, " ")
    .replace(/-/g, " ");
}

async function main() {
  console.log("Download dataset OpenFlights...");
  const res = await fetch(AIRPORTS_URL);
  if (!res.ok) {
    console.error("Download fallito:", res.status);
    process.exit(1);
  }
  const csv = await res.text();

  // Parse CSV — ogni campo può essere tra virgolette
  const airports: AirportRow[] = [];
  for (const line of csv.split("\n")) {
    if (!line.trim()) continue;

    // Split rispettando le virgolette
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { fields.push(current); current = ""; continue; }
      current += ch;
    }
    fields.push(current);

    const iata    = fields[4]?.trim();
    const name    = fields[1]?.trim();
    const city    = fields[2]?.trim();
    const country = fields[3]?.trim();
    const lat     = parseFloat(fields[6]);
    const lon     = parseFloat(fields[7]);
    const type    = fields[12]?.trim();

    // Teniamo solo aeroporti con codice IATA valido e coordinate
    if (!iata || iata === "\\N" || iata.length !== 3) continue;
    if (isNaN(lat) || isNaN(lon)) continue;
    if (type && type !== "airport") continue;

    airports.push({ iata, name, city, country, lat, lon });
  }

  console.log(`Aeroporti validi trovati: ${airports.length}\n`);

  // Carica tutte le destinazioni per il matching city+country
  const { rows: destinations } = await db.query<{
    id: number;
    name: string;
    country: string;
  }>("SELECT id, name, country FROM destinations");

  // Indice per matching veloce: "city||country" → destination_id
  const destIndex = new Map<string, number>();
  for (const d of destinations) {
    const key = `${normalizeCity(d.name)}||${normalizeCountry(d.country)}`;
    destIndex.set(key, d.id);
  }

  let matched = 0;
  let inserted = 0;

  for (const ap of airports) {
    const key = `${normalizeCity(ap.city)}||${normalizeCountry(ap.country)}`;
    const destinationId = destIndex.get(key) ?? null;
    if (destinationId) matched++;

    await db.query(
      `INSERT INTO airports (iata_code, name, city, country_code, latitude, longitude, destination_id)
       VALUES ($1, $2, $3,
         (SELECT country_code FROM destinations WHERE id = $7 LIMIT 1),
         $4, $5, $6)
       ON CONFLICT (iata_code) DO UPDATE SET
         destination_id = EXCLUDED.destination_id`,
      [ap.iata, ap.name, ap.city, ap.lat, ap.lon, destinationId, destinationId]
    );
    inserted++;
  }

  console.log(`Inseriti: ${inserted} aeroporti`);
  console.log(`Collegati a una destinazione: ${matched}`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
