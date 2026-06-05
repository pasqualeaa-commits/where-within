import "dotenv/config";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Tipi Teleport API ---

interface TeleportUAListItem {
  href: string;
  name: string;
}

interface TeleportScoreCategory {
  name: string;
  score_out_of_10: number;
}

interface TeleportScores {
  categories: TeleportScoreCategory[];
  teleport_city_score: number;
}

interface TeleportUADetail {
  full_name: string;   // es. "Barcelona, Spain"
  name: string;
  continent: string;
  bounding_box: {
    latlon: {
      east: number;
      north: number;
      south: number;
      west: number;
    };
  };
}

// --- Helpers ---

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function centerFromBbox(bbox: TeleportUADetail["bounding_box"]) {
  const lat = (bbox.latlon.north + bbox.latlon.south) / 2;
  const lon = (bbox.latlon.east + bbox.latlon.west) / 2;
  return { lat, lon };
}

function parseCountry(fullName: string): { country: string; countryCode: string } {
  // full_name è sempre "City, Country" — es. "Amsterdam, Netherlands"
  const parts = fullName.split(", ");
  const country = parts.length > 1 ? parts[parts.length - 1] : "Unknown";
  // Mappa manuale per i codici ISO più comuni (estendibile)
  const codeMap: Record<string, string> = {
    "Netherlands": "NL", "Spain": "ES", "France": "FR", "Germany": "DE",
    "Italy": "IT", "Portugal": "PT", "United Kingdom": "GB", "Austria": "AT",
    "Belgium": "BE", "Switzerland": "CH", "Sweden": "SE", "Denmark": "DK",
    "Norway": "NO", "Finland": "FI", "Poland": "PL", "Czech Republic": "CZ",
    "Hungary": "HU", "Greece": "GR", "Croatia": "HR", "Romania": "RO",
    "United States": "US", "Canada": "CA", "Australia": "AU", "Japan": "JP",
    "Brazil": "BR", "Mexico": "MX", "Argentina": "AR", "Colombia": "CO",
    "Singapore": "SG", "Thailand": "TH", "Indonesia": "ID", "India": "IN",
    "South Africa": "ZA", "UAE": "AE", "Turkey": "TR", "Israel": "IL",
    "New Zealand": "NZ", "South Korea": "KR", "China": "CN",
  };
  return { country, countryCode: codeMap[country] ?? "??" };
}

function extractScores(categories: TeleportScoreCategory[]) {
  const get = (name: string) =>
    categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))
      ?.score_out_of_10 ?? null;

  return {
    cost_of_living: get("Cost of Living"),
    safety:         get("Safety"),
    healthcare:     get("Healthcare"),
    culture:        get("Culture"),
    outdoor:        get("Outdoors"),
  };
}

// --- Fetch con retry ---

async function fetchJSON<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      if (i < retries - 1) await sleep(1000);
    }
  }
  return null;
}

// --- Elabora una singola città ---

async function processCity(slug: string, name: string): Promise<void> {
  const [detail, scoresData] = await Promise.all([
    fetchJSON<TeleportUADetail>(`https://api.teleport.org/api/urban_areas/slug:${slug}/`),
    fetchJSON<TeleportScores>(`https://api.teleport.org/api/urban_areas/slug:${slug}/scores/`),
  ]);

  if (!detail || !scoresData) {
    console.warn(`  [skip] ${name} — dati non disponibili`);
    return;
  }

  const { lat, lon } = centerFromBbox(detail.bounding_box);
  const { country, countryCode } = parseCountry(detail.full_name);
  const scores = extractScores(scoresData.categories);

  await db.query(
    `INSERT INTO destinations
       (name, slug, country, country_code, continent,
        latitude, longitude,
        score_overall, score_cost_of_living, score_safety,
        score_healthcare, score_culture, score_outdoor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (slug) DO UPDATE SET
       score_overall        = EXCLUDED.score_overall,
       score_cost_of_living = EXCLUDED.score_cost_of_living,
       score_safety         = EXCLUDED.score_safety,
       score_healthcare     = EXCLUDED.score_healthcare,
       score_culture        = EXCLUDED.score_culture,
       score_outdoor        = EXCLUDED.score_outdoor`,
    [
      name, slug, country, countryCode, detail.continent,
      lat, lon,
      scoresData.teleport_city_score / 10, // normalizza 0-100 → 0-10
      scores.cost_of_living, scores.safety,
      scores.healthcare, scores.culture, scores.outdoor,
    ]
  );

  console.log(`  [ok] ${name} (${country})`);
}

// --- Main ---

async function main() {
  // 1. Crea le tabelle
  console.log("Creazione tabelle...");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await db.query(schema);
  console.log("Tabelle pronte.\n");

  // 2. Recupera lista città da Teleport
  console.log("Fetch lista urban areas da Teleport...");
  const list = await fetchJSON<{ _links: { "ua:item": TeleportUAListItem[] } }>(
    "https://api.teleport.org/api/urban_areas/"
  );

  if (!list) {
    console.error("Impossibile raggiungere Teleport API.");
    process.exit(1);
  }

  const cities = list._links["ua:item"].map((item) => ({
    name: item.name,
    slug: item.href.match(/slug:([^/]+)/)?.[1] ?? "",
  })).filter((c) => c.slug !== "");

  console.log(`Trovate ${cities.length} città. Inizio seed...\n`);

  // 3. Elabora in batch da 5 per rispettare il rate limit
  const BATCH = 5;
  for (let i = 0; i < cities.length; i += BATCH) {
    const batch = cities.slice(i, i + BATCH);
    await Promise.all(batch.map((c) => processCity(c.slug, c.name)));
    if (i + BATCH < cities.length) await sleep(500);
  }

  console.log("\nSeed completato.");
  await db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
