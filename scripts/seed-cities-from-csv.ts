/**
 * Aggiunge nuove destinazioni a partire dal CSV Kaggle "livable_cities.csv".
 * Le coordinate e i codici paese degli aeroporti vengono da OpenFlights.
 * Le città già presenti nel DB (match per nome) vengono saltate: mantengono i loro dati.
 *
 * Dopo questo script esegui:
 *   npm run db:seed-airports   (collega gli aeroporti alle nuove destinazioni)
 *   npm run db:seed-climate    (scarica il clima per le nuove destinazioni)
 *
 * Uso: npm run db:seed-cities
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import { Pool } from "pg";
import fs from "fs";
import path from "path";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const AIRPORTS_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";

// CSV no-space country name → { iso2, continente, nome OpenFlights (= country salvato) }
const COUNTRY_MAP: Record<string, { iso: string; continent: string; of: string }> = {
  Armenia:               { iso: "AM", continent: "Asia",          of: "Armenia" },
  Australia:             { iso: "AU", continent: "Oceania",       of: "Australia" },
  Austria:               { iso: "AT", continent: "Europe",        of: "Austria" },
  Azerbaijan:            { iso: "AZ", continent: "Asia",          of: "Azerbaijan" },
  Belarus:               { iso: "BY", continent: "Europe",        of: "Belarus" },
  Belgium:               { iso: "BE", continent: "Europe",        of: "Belgium" },
  BosniaAndHerzegovina:  { iso: "BA", continent: "Europe",        of: "Bosnia and Herzegovina" },
  Brazil:                { iso: "BR", continent: "South America", of: "Brazil" },
  Bulgaria:              { iso: "BG", continent: "Europe",        of: "Bulgaria" },
  Canada:                { iso: "CA", continent: "North America", of: "Canada" },
  China:                 { iso: "CN", continent: "Asia",          of: "China" },
  Colombia:              { iso: "CO", continent: "South America", of: "Colombia" },
  Croatia:               { iso: "HR", continent: "Europe",        of: "Croatia" },
  Cyprus:                { iso: "CY", continent: "Europe",        of: "Cyprus" },
  CzechRepublic:         { iso: "CZ", continent: "Europe",        of: "Czech Republic" },
  Denmark:               { iso: "DK", continent: "Europe",        of: "Denmark" },
  Ecuador:               { iso: "EC", continent: "South America", of: "Ecuador" },
  Estonia:               { iso: "EE", continent: "Europe",        of: "Estonia" },
  Finland:               { iso: "FI", continent: "Europe",        of: "Finland" },
  France:                { iso: "FR", continent: "Europe",        of: "France" },
  Georgia:               { iso: "GE", continent: "Asia",          of: "Georgia" },
  Germany:               { iso: "DE", continent: "Europe",        of: "Germany" },
  Greece:                { iso: "GR", continent: "Europe",        of: "Greece" },
  "HongKong(China)":     { iso: "HK", continent: "Asia",          of: "Hong Kong" },
  Hungary:               { iso: "HU", continent: "Europe",        of: "Hungary" },
  Iceland:               { iso: "IS", continent: "Europe",        of: "Iceland" },
  India:                 { iso: "IN", continent: "Asia",          of: "India" },
  Ireland:               { iso: "IE", continent: "Europe",        of: "Ireland" },
  Israel:                { iso: "IL", continent: "Asia",          of: "Israel" },
  Italy:                 { iso: "IT", continent: "Europe",        of: "Italy" },
  Japan:                 { iso: "JP", continent: "Asia",          of: "Japan" },
  Jordan:                { iso: "JO", continent: "Asia",          of: "Jordan" },
  Kuwait:                { iso: "KW", continent: "Asia",          of: "Kuwait" },
  Latvia:                { iso: "LV", continent: "Europe",        of: "Latvia" },
  Lithuania:             { iso: "LT", continent: "Europe",        of: "Lithuania" },
  Luxembourg:            { iso: "LU", continent: "Europe",        of: "Luxembourg" },
  Malaysia:              { iso: "MY", continent: "Asia",          of: "Malaysia" },
  Mexico:                { iso: "MX", continent: "North America", of: "Mexico" },
  Netherlands:           { iso: "NL", continent: "Europe",        of: "Netherlands" },
  NewZealand:            { iso: "NZ", continent: "Oceania",       of: "New Zealand" },
  NorthMacedonia:        { iso: "MK", continent: "Europe",        of: "Macedonia" },
  Norway:                { iso: "NO", continent: "Europe",        of: "Norway" },
  Oman:                  { iso: "OM", continent: "Asia",          of: "Oman" },
  Pakistan:              { iso: "PK", continent: "Asia",          of: "Pakistan" },
  Panama:                { iso: "PA", continent: "North America", of: "Panama" },
  Poland:                { iso: "PL", continent: "Europe",        of: "Poland" },
  Portugal:              { iso: "PT", continent: "Europe",        of: "Portugal" },
  Qatar:                 { iso: "QA", continent: "Asia",          of: "Qatar" },
  Romania:               { iso: "RO", continent: "Europe",        of: "Romania" },
  Russia:                { iso: "RU", continent: "Europe",        of: "Russia" },
  SaudiArabia:           { iso: "SA", continent: "Asia",          of: "Saudi Arabia" },
  Serbia:                { iso: "RS", continent: "Europe",        of: "Serbia" },
  Singapore:             { iso: "SG", continent: "Asia",          of: "Singapore" },
  Slovakia:              { iso: "SK", continent: "Europe",        of: "Slovakia" },
  Slovenia:              { iso: "SI", continent: "Europe",        of: "Slovenia" },
  SouthAfrica:           { iso: "ZA", continent: "Africa",        of: "South Africa" },
  SouthKorea:            { iso: "KR", continent: "Asia",          of: "South Korea" },
  Spain:                 { iso: "ES", continent: "Europe",        of: "Spain" },
  Sweden:                { iso: "SE", continent: "Europe",        of: "Sweden" },
  Switzerland:           { iso: "CH", continent: "Europe",        of: "Switzerland" },
  Taiwan:                { iso: "TW", continent: "Asia",          of: "Taiwan" },
  Turkey:                { iso: "TR", continent: "Asia",          of: "Turkey" },
  Ukraine:               { iso: "UA", continent: "Europe",        of: "Ukraine" },
  UnitedArabEmirates:    { iso: "AE", continent: "Asia",          of: "United Arab Emirates" },
  UnitedKingdom:         { iso: "GB", continent: "Europe",        of: "United Kingdom" },
  UnitedStates:          { iso: "US", continent: "North America", of: "United States" },
  Uruguay:               { iso: "UY", continent: "South America", of: "Uruguay" },
};

// Nome città CSV (pulito) → nome città OpenFlights, dove differiscono
const CITY_ALIASES: Record<string, string> = {
  "saint petersburg": "st. petersburg",
  "tel aviv yafo":    "tel aviv",
  "nizhny novgorod":  "nizhniy novgorod",
  "turin":            "torino",
  "kuwait city":      "kuwait",
  "lviv":             "lvov",
  "chennai":          "madras",
  "luxembourg":       "luxemburg",
  "gothenburg":       "gothenborg",
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normCity(c: string): string {
  return stripDiacritics(c).toLowerCase().trim()
    .replace(/\(.*?\)/g, "")    // rimuove "(Cracow)" ecc.
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(c: string): string {
  return c.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function slugify(s: string): string {
  return stripDiacritics(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Airport { iata: string; city: string; country: string; lat: number; lon: number; }

function parseAirports(csv: string): Airport[] {
  const out: Airport[] = [];
  for (const line of csv.split("\n")) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { fields.push(cur); cur = ""; continue; }
      cur += ch;
    }
    fields.push(cur);

    const iata = fields[4]?.trim();
    const city = fields[2]?.trim();
    const country = fields[3]?.trim();
    const lat = parseFloat(fields[6]);
    const lon = parseFloat(fields[7]);
    const type = fields[12]?.trim();

    if (!iata || iata === "\\N" || iata.length !== 3) continue;
    if (isNaN(lat) || isNaN(lon)) continue;
    if (type && type !== "airport") continue;

    out.push({ iata, city, country, lat, lon });
  }
  return out;
}

async function main() {
  console.log("Download OpenFlights...");
  const res = await fetch(AIRPORTS_URL);
  if (!res.ok) { console.error("Download fallito:", res.status); process.exit(1); }
  const airports = parseAirports(await res.text());
  console.log(`Aeroporti: ${airports.length}`);

  // Indice aeroporti: "normCity||normCountry" → lista
  const apIndex = new Map<string, Airport[]>();
  for (const ap of airports) {
    const key = `${normCity(ap.city)}||${ap.country.toLowerCase()}`;
    if (!apIndex.has(key)) apIndex.set(key, []);
    apIndex.get(key)!.push(ap);
  }

  // Destinazioni già presenti → set di nomi normalizzati (per saltarle)
  const { rows: existing } = await db.query<{ name: string; slug: string }>(
    "SELECT name, slug FROM destinations"
  );
  const existingNames = new Set(existing.map((d) => normCity(d.name)));
  const existingSlugs = new Set(existing.map((d) => d.slug));

  // Leggi CSV
  const csvPath = path.join(__dirname, "numbeo-data", "livable_cities.csv");
  const lines = fs.readFileSync(csvPath, "utf-8").split("\n").filter(Boolean);

  let added = 0, skippedExisting = 0, noCountry = 0, noAirport = 0;

  for (const line of lines.slice(1)) {
    const f = line.slice(1, -1).split('","');
    const cityRaw = f[1]?.trim();
    const countryRaw = f[2]?.trim();
    if (!cityRaw || !countryRaw) continue;

    const cm = COUNTRY_MAP[countryRaw];
    if (!cm) { console.log(`  ? paese sconosciuto: ${countryRaw} (${cityRaw})`); noCountry++; continue; }

    const name = cleanName(cityRaw);
    const nName = normCity(cityRaw);

    if (existingNames.has(nName)) { skippedExisting++; continue; }

    // Trova aeroporto: prova alias città, poi nome normalizzato
    const cityKey = CITY_ALIASES[nName] ?? nName;
    const matches = apIndex.get(`${cityKey}||${cm.of.toLowerCase()}`) ?? [];

    if (matches.length === 0) {
      console.log(`  ✗ nessun aeroporto: ${name} (${cm.of})`);
      noAirport++;
      continue;
    }

    // Coordinate: media degli aeroporti della città (≈ centro città)
    const lat = matches.reduce((s, a) => s + a.lat, 0) / matches.length;
    const lon = matches.reduce((s, a) => s + a.lon, 0) / matches.length;

    // Punteggi dal CSV
    const qol  = parseFloat(f[3] ?? "0");
    const safe = parseFloat(f[5] ?? "0");
    const heal = parseFloat(f[6] ?? "0");
    const col  = parseFloat(f[7] ?? "0");

    const score_overall        = r10(Math.min(10, qol / 20));
    const score_cost_of_living = r10(Math.max(0, Math.min(10, (150 - col) / 15)));
    const score_safety         = r10(Math.min(10, safe / 10));
    const score_healthcare     = r10(Math.min(10, heal / 10));

    // Slug univoco
    let slug = slugify(name);
    if (existingSlugs.has(slug)) slug = `${slug}-${cm.iso.toLowerCase()}`;
    existingSlugs.add(slug);
    existingNames.add(nName);

    await db.query(
      `INSERT INTO destinations
         (name, slug, country, country_code, continent, latitude, longitude,
          score_overall, score_cost_of_living, score_safety, score_healthcare)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO NOTHING`,
      [name, slug, cm.of, cm.iso, cm.continent, lat.toFixed(6), lon.toFixed(6),
       score_overall, score_cost_of_living, score_safety, score_healthcare]
    );

    console.log(`  ✓ ${name.padEnd(22)} ${cm.of.padEnd(20)} [${cm.iso}] QoL=${score_overall}`);
    added++;
  }

  console.log(`\nAggiunte: ${added}  |  Già presenti: ${skippedExisting}  |  ` +
              `Senza aeroporto: ${noAirport}  |  Paese ignoto: ${noCountry}`);
  console.log("\nOra esegui:  npm run db:seed-airports  &&  npm run db:seed-climate");
  await db.end();
}

function r10(v: number) { return Math.round(v * 10) / 10; }

main().catch((err) => { console.error(err); process.exit(1); });
