import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Fallback statico ---
// Usato quando Teleport API non è raggiungibile.
// Dati basati su medie storiche pubbliche (Teleport/Numbeo).

interface StaticDestination {
  name: string; slug: string; country: string; country_code: string;
  continent: string; lat: number; lon: number;
  score_overall: number; score_cost_of_living: number; score_safety: number;
  score_healthcare: number; score_culture: number; score_outdoor: number;
}

const STATIC_DESTINATIONS: StaticDestination[] = [
  { name:"Lisbon",      slug:"lisbon",            country:"Portugal",      country_code:"PT", continent:"Europe",        lat:38.7223, lon:-9.1393,   score_overall:7.2, score_cost_of_living:6.5, score_safety:7.8, score_healthcare:7.0, score_culture:7.5, score_outdoor:6.8 },
  { name:"Barcelona",   slug:"barcelona",          country:"Spain",         country_code:"ES", continent:"Europe",        lat:41.3851, lon:2.1734,    score_overall:7.5, score_cost_of_living:5.8, score_safety:5.5, score_healthcare:7.2, score_culture:8.5, score_outdoor:7.0 },
  { name:"Amsterdam",   slug:"amsterdam",          country:"Netherlands",   country_code:"NL", continent:"Europe",        lat:52.3676, lon:4.9041,    score_overall:7.8, score_cost_of_living:4.0, score_safety:7.0, score_healthcare:8.0, score_culture:8.2, score_outdoor:6.5 },
  { name:"Prague",      slug:"prague",             country:"Czech Republic",country_code:"CZ", continent:"Europe",        lat:50.0755, lon:14.4378,   score_overall:7.3, score_cost_of_living:7.0, score_safety:7.5, score_healthcare:7.0, score_culture:8.0, score_outdoor:6.0 },
  { name:"Budapest",    slug:"budapest",           country:"Hungary",       country_code:"HU", continent:"Europe",        lat:47.4979, lon:19.0402,   score_overall:7.0, score_cost_of_living:7.5, score_safety:7.2, score_healthcare:6.5, score_culture:7.8, score_outdoor:6.0 },
  { name:"Vienna",      slug:"vienna",             country:"Austria",       country_code:"AT", continent:"Europe",        lat:48.2082, lon:16.3738,   score_overall:8.0, score_cost_of_living:4.5, score_safety:8.5, score_healthcare:8.5, score_culture:8.8, score_outdoor:7.0 },
  { name:"Berlin",      slug:"berlin",             country:"Germany",       country_code:"DE", continent:"Europe",        lat:52.5200, lon:13.4050,   score_overall:7.6, score_cost_of_living:5.5, score_safety:6.8, score_healthcare:8.0, score_culture:8.5, score_outdoor:6.5 },
  { name:"Rome",        slug:"rome",               country:"Italy",         country_code:"IT", continent:"Europe",        lat:41.9028, lon:12.4964,   score_overall:7.0, score_cost_of_living:5.5, score_safety:5.8, score_healthcare:7.5, score_culture:9.5, score_outdoor:6.5 },
  { name:"Athens",      slug:"athens",             country:"Greece",        country_code:"GR", continent:"Europe",        lat:37.9838, lon:23.7275,   score_overall:6.5, score_cost_of_living:7.0, score_safety:6.5, score_healthcare:6.5, score_culture:8.5, score_outdoor:7.0 },
  { name:"Madrid",      slug:"madrid",             country:"Spain",         country_code:"ES", continent:"Europe",        lat:40.4168, lon:-3.7038,   score_overall:7.2, score_cost_of_living:5.8, score_safety:6.5, score_healthcare:7.5, score_culture:8.5, score_outdoor:6.0 },
  { name:"Paris",       slug:"paris",              country:"France",        country_code:"FR", continent:"Europe",        lat:48.8566, lon:2.3522,    score_overall:7.4, score_cost_of_living:3.5, score_safety:5.5, score_healthcare:8.0, score_culture:9.5, score_outdoor:6.0 },
  { name:"London",      slug:"london",             country:"United Kingdom",country_code:"GB", continent:"Europe",        lat:51.5074, lon:-0.1278,   score_overall:7.5, score_cost_of_living:2.5, score_safety:6.5, score_healthcare:8.0, score_culture:9.5, score_outdoor:6.0 },
  { name:"Dublin",      slug:"dublin",             country:"Ireland",       country_code:"IE", continent:"Europe",        lat:53.3498, lon:-6.2603,   score_overall:7.2, score_cost_of_living:3.5, score_safety:7.5, score_healthcare:7.5, score_culture:7.5, score_outdoor:6.5 },
  { name:"Copenhagen",  slug:"copenhagen",         country:"Denmark",       country_code:"DK", continent:"Europe",        lat:55.6761, lon:12.5683,   score_overall:8.0, score_cost_of_living:3.0, score_safety:8.5, score_healthcare:8.5, score_culture:8.0, score_outdoor:7.5 },
  { name:"Stockholm",   slug:"stockholm",          country:"Sweden",        country_code:"SE", continent:"Europe",        lat:59.3293, lon:18.0686,   score_overall:8.0, score_cost_of_living:3.5, score_safety:8.0, score_healthcare:8.5, score_culture:8.0, score_outdoor:8.0 },
  { name:"Warsaw",      slug:"warsaw",             country:"Poland",        country_code:"PL", continent:"Europe",        lat:52.2297, lon:21.0122,   score_overall:6.8, score_cost_of_living:7.5, score_safety:7.5, score_healthcare:6.5, score_culture:7.5, score_outdoor:5.5 },
  { name:"Krakow",      slug:"krakow",             country:"Poland",        country_code:"PL", continent:"Europe",        lat:50.0647, lon:19.9450,   score_overall:7.0, score_cost_of_living:8.0, score_safety:7.8, score_healthcare:6.5, score_culture:8.0, score_outdoor:6.0 },
  { name:"Porto",       slug:"porto",              country:"Portugal",      country_code:"PT", continent:"Europe",        lat:41.1579, lon:-8.6291,   score_overall:7.0, score_cost_of_living:7.0, score_safety:8.0, score_healthcare:7.0, score_culture:7.5, score_outdoor:7.0 },
  { name:"Brussels",    slug:"brussels",           country:"Belgium",       country_code:"BE", continent:"Europe",        lat:50.8503, lon:4.3517,    score_overall:6.8, score_cost_of_living:4.5, score_safety:5.5, score_healthcare:7.5, score_culture:8.0, score_outdoor:5.5 },
  { name:"Milan",       slug:"milan",              country:"Italy",         country_code:"IT", continent:"Europe",        lat:45.4654, lon:9.1859,    score_overall:7.0, score_cost_of_living:4.0, score_safety:6.0, score_healthcare:7.5, score_culture:8.5, score_outdoor:5.5 },
  { name:"Munich",      slug:"munich",             country:"Germany",       country_code:"DE", continent:"Europe",        lat:48.1351, lon:11.5820,   score_overall:7.8, score_cost_of_living:4.0, score_safety:8.5, score_healthcare:8.5, score_culture:8.0, score_outdoor:7.5 },
  { name:"Zurich",      slug:"zurich",             country:"Switzerland",   country_code:"CH", continent:"Europe",        lat:47.3769, lon:8.5417,    score_overall:8.2, score_cost_of_living:1.5, score_safety:9.0, score_healthcare:9.0, score_culture:8.0, score_outdoor:8.5 },
  { name:"Zagreb",      slug:"zagreb",             country:"Croatia",       country_code:"HR", continent:"Europe",        lat:45.8150, lon:15.9819,   score_overall:6.5, score_cost_of_living:7.5, score_safety:8.0, score_healthcare:6.5, score_culture:7.0, score_outdoor:6.5 },
  { name:"Bucharest",   slug:"bucharest",          country:"Romania",       country_code:"RO", continent:"Europe",        lat:44.4268, lon:26.1025,   score_overall:6.0, score_cost_of_living:8.5, score_safety:6.5, score_healthcare:5.5, score_culture:6.5, score_outdoor:5.0 },
  { name:"Tokyo",       slug:"tokyo",              country:"Japan",         country_code:"JP", continent:"Asia",           lat:35.6762, lon:139.6503,  score_overall:8.2, score_cost_of_living:4.0, score_safety:9.0, score_healthcare:8.5, score_culture:9.0, score_outdoor:6.5 },
  { name:"Singapore",   slug:"singapore",          country:"Singapore",     country_code:"SG", continent:"Asia",           lat:1.3521,  lon:103.8198,  score_overall:8.0, score_cost_of_living:3.0, score_safety:9.5, score_healthcare:9.0, score_culture:7.5, score_outdoor:6.0 },
  { name:"Bangkok",     slug:"bangkok",            country:"Thailand",      country_code:"TH", continent:"Asia",           lat:13.7563, lon:100.5018,  score_overall:6.8, score_cost_of_living:8.5, score_safety:6.0, score_healthcare:7.0, score_culture:7.5, score_outdoor:6.0 },
  { name:"Seoul",       slug:"seoul",              country:"South Korea",   country_code:"KR", continent:"Asia",           lat:37.5665, lon:126.9780,  score_overall:7.5, score_cost_of_living:5.5, score_safety:8.5, score_healthcare:8.5, score_culture:8.0, score_outdoor:6.5 },
  { name:"Dubai",       slug:"dubai",              country:"UAE",           country_code:"AE", continent:"Asia",           lat:25.2048, lon:55.2708,   score_overall:7.0, score_cost_of_living:3.5, score_safety:9.0, score_healthcare:8.0, score_culture:6.5, score_outdoor:6.0 },
  { name:"Istanbul",    slug:"istanbul",           country:"Turkey",        country_code:"TR", continent:"Asia",           lat:41.0082, lon:28.9784,   score_overall:6.8, score_cost_of_living:8.0, score_safety:5.5, score_healthcare:6.5, score_culture:8.5, score_outdoor:6.5 },
  { name:"New York",    slug:"new-york",           country:"United States", country_code:"US", continent:"North America",  lat:40.7128, lon:-74.0060,  score_overall:7.2, score_cost_of_living:2.0, score_safety:5.5, score_healthcare:7.0, score_culture:9.5, score_outdoor:5.5 },
  { name:"San Francisco", slug:"san-francisco-bay-area", country:"United States", country_code:"US", continent:"North America", lat:37.7749, lon:-122.4194, score_overall:7.5, score_cost_of_living:1.5, score_safety:5.0, score_healthcare:7.5, score_culture:8.5, score_outdoor:8.0 },
  { name:"Toronto",     slug:"toronto",            country:"Canada",        country_code:"CA", continent:"North America",  lat:43.6532, lon:-79.3832,  score_overall:7.8, score_cost_of_living:4.0, score_safety:7.5, score_healthcare:8.0, score_culture:8.0, score_outdoor:7.0 },
  { name:"Montreal",    slug:"montreal",           country:"Canada",        country_code:"CA", continent:"North America",  lat:45.5017, lon:-73.5673,  score_overall:7.5, score_cost_of_living:5.0, score_safety:7.0, score_healthcare:8.0, score_culture:8.5, score_outdoor:7.5 },
  { name:"Buenos Aires",slug:"buenos-aires",       country:"Argentina",     country_code:"AR", continent:"South America",  lat:-34.6118,lon:-58.3960,  score_overall:6.5, score_cost_of_living:8.5, score_safety:4.5, score_healthcare:6.5, score_culture:8.0, score_outdoor:6.0 },
  { name:"Medellin",    slug:"medellin",           country:"Colombia",      country_code:"CO", continent:"South America",  lat:6.2442,  lon:-75.5812,  score_overall:6.5, score_cost_of_living:8.5, score_safety:5.5, score_healthcare:7.0, score_culture:7.0, score_outdoor:7.5 },
  { name:"Melbourne",   slug:"melbourne",          country:"Australia",     country_code:"AU", continent:"Oceania",        lat:-37.8136,lon:144.9631,  score_overall:8.0, score_cost_of_living:3.5, score_safety:8.0, score_healthcare:8.5, score_culture:8.5, score_outdoor:8.0 },
  { name:"Sydney",      slug:"sydney",             country:"Australia",     country_code:"AU", continent:"Oceania",        lat:-33.8688,lon:151.2093,  score_overall:8.0, score_cost_of_living:3.0, score_safety:8.0, score_healthcare:8.5, score_culture:8.5, score_outdoor:9.0 },
  { name:"Cape Town",   slug:"cape-town",          country:"South Africa",  country_code:"ZA", continent:"Africa",         lat:-33.9249,lon:18.4241,   score_overall:6.8, score_cost_of_living:7.5, score_safety:4.0, score_healthcare:6.0, score_culture:7.0, score_outdoor:9.0 },
  { name:"Tallinn",     slug:"tallinn",            country:"Estonia",       country_code:"EE", continent:"Europe",         lat:59.4370, lon:24.7536,   score_overall:7.0, score_cost_of_living:7.0, score_safety:8.5, score_healthcare:7.0, score_culture:7.5, score_outdoor:7.0 },
];

// --- Tipi Teleport API ---

interface TeleportUAListItem { href: string; name: string; }
interface TeleportScoreCategory { name: string; score_out_of_10: number; }
interface TeleportScores { categories: TeleportScoreCategory[]; teleport_city_score: number; }
interface TeleportUADetail {
  full_name: string; name: string; continent: string;
  bounding_box: { latlon: { east: number; north: number; south: number; west: number } };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function centerFromBbox(bbox: TeleportUADetail["bounding_box"]) {
  return {
    lat: (bbox.latlon.north + bbox.latlon.south) / 2,
    lon: (bbox.latlon.east + bbox.latlon.west) / 2,
  };
}

const COUNTRY_CODES: Record<string, string> = {
  "Netherlands":"NL","Spain":"ES","France":"FR","Germany":"DE","Italy":"IT",
  "Portugal":"PT","United Kingdom":"GB","Austria":"AT","Belgium":"BE","Switzerland":"CH",
  "Sweden":"SE","Denmark":"DK","Norway":"NO","Finland":"FI","Poland":"PL",
  "Czech Republic":"CZ","Hungary":"HU","Greece":"GR","Croatia":"HR","Romania":"RO",
  "United States":"US","Canada":"CA","Australia":"AU","Japan":"JP","Brazil":"BR",
  "Mexico":"MX","Argentina":"AR","Colombia":"CO","Singapore":"SG","Thailand":"TH",
  "Indonesia":"ID","India":"IN","South Africa":"ZA","UAE":"AE","Turkey":"TR",
  "South Korea":"KR","Estonia":"EE","Ireland":"IE",
};

function parseCountry(fullName: string) {
  const parts = fullName.split(", ");
  const country = parts.length > 1 ? parts[parts.length - 1] : "Unknown";
  return { country, countryCode: COUNTRY_CODES[country] ?? "??" };
}

function extractScores(categories: TeleportScoreCategory[]) {
  const get = (name: string) =>
    categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))?.score_out_of_10 ?? null;
  return {
    cost_of_living: get("Cost of Living"), safety: get("Safety"),
    healthcare: get("Healthcare"), culture: get("Culture"), outdoor: get("Outdoors"),
  };
}

async function fetchJSON<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`    HTTP ${res.status} — ${url}`);
        if (i < retries - 1) { await sleep(1000); continue; }
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`    Errore rete (tentativo ${i + 1}): ${err}`);
      if (i < retries - 1) await sleep(1000);
    }
  }
  return null;
}

async function upsertDestination(row: {
  name: string; slug: string; country: string; country_code: string;
  continent: string; lat: number; lon: number; score_overall: number;
  score_cost_of_living: number | null; score_safety: number | null;
  score_healthcare: number | null; score_culture: number | null; score_outdoor: number | null;
}) {
  await db.query(
    `INSERT INTO destinations
       (name, slug, country, country_code, continent, latitude, longitude,
        score_overall, score_cost_of_living, score_safety,
        score_healthcare, score_culture, score_outdoor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (slug) DO UPDATE SET
       score_overall=EXCLUDED.score_overall, score_cost_of_living=EXCLUDED.score_cost_of_living,
       score_safety=EXCLUDED.score_safety, score_healthcare=EXCLUDED.score_healthcare,
       score_culture=EXCLUDED.score_culture, score_outdoor=EXCLUDED.score_outdoor`,
    [row.name, row.slug, row.country, row.country_code, row.continent,
     row.lat, row.lon, row.score_overall,
     row.score_cost_of_living, row.score_safety, row.score_healthcare,
     row.score_culture, row.score_outdoor]
  );
}

async function seedFromTeleport(): Promise<boolean> {
  console.log("Tentativo connessione Teleport API...");
  const list = await fetchJSON<{ _links: { "ua:item": TeleportUAListItem[] } }>(
    "https://api.teleport.org/api/urban_areas/"
  );
  if (!list) return false;

  const cities = list._links["ua:item"]
    .map((item) => ({ name: item.name, slug: item.href.match(/slug:([^/]+)/)?.[1] ?? "" }))
    .filter((c) => c.slug !== "");

  console.log(`Teleport: ${cities.length} città trovate. Seed in corso...\n`);

  const BATCH = 5;
  let done = 0;
  for (let i = 0; i < cities.length; i += BATCH) {
    await Promise.all(
      cities.slice(i, i + BATCH).map(async ({ slug, name }) => {
        const [detail, scoresData] = await Promise.all([
          fetchJSON<TeleportUADetail>(`https://api.teleport.org/api/urban_areas/slug:${slug}/`),
          fetchJSON<TeleportScores>(`https://api.teleport.org/api/urban_areas/slug:${slug}/scores/`),
        ]);
        if (!detail || !scoresData) { console.warn(`  [skip] ${name}`); return; }

        const { lat, lon } = centerFromBbox(detail.bounding_box);
        const { country, countryCode } = parseCountry(detail.full_name);
        const scores = extractScores(scoresData.categories);

        await upsertDestination({
          name, slug, country, country_code: countryCode, continent: detail.continent,
          lat, lon, score_overall: scoresData.teleport_city_score / 10,
          score_cost_of_living: scores.cost_of_living, score_safety: scores.safety,
          score_healthcare: scores.healthcare, score_culture: scores.culture,
          score_outdoor: scores.outdoor,
        });
        console.log(`  [${++done}/${cities.length}] ${name}`);
      })
    );
    if (i + BATCH < cities.length) await sleep(500);
  }
  return true;
}

async function seedFromStatic() {
  console.log(`Teleport API non disponibile — uso dataset statico (${STATIC_DESTINATIONS.length} città).\n`);
  for (const d of STATIC_DESTINATIONS) {
    await upsertDestination({
      name: d.name, slug: d.slug, country: d.country, country_code: d.country_code,
      continent: d.continent, lat: d.lat, lon: d.lon, score_overall: d.score_overall,
      score_cost_of_living: d.score_cost_of_living, score_safety: d.score_safety,
      score_healthcare: d.score_healthcare, score_culture: d.score_culture,
      score_outdoor: d.score_outdoor,
    });
    console.log(`  [ok] ${d.name}`);
  }
}

// ---------------------------------------------------------------------------
// EVENTI STAGIONALI — dataset curato manualmente
// ---------------------------------------------------------------------------

interface StaticEvent {
  destination_slug: string;
  name: string;
  description: string;
  month_start: number;
  month_end: number;
  type: string;
}

const STATIC_EVENTS: StaticEvent[] = [
  // Asia
  { destination_slug:"tokyo",     name:"Hanami — Fiori di ciliegio",        description:"I ciliegi in fiore colorano parchi, viali e templi di rosa. Il picco è fine marzo–inizio aprile.",                                month_start:3,  month_end:4,  type:"cultural" },
  { destination_slug:"tokyo",     name:"Obon Festival",                      description:"Festival delle lanterne per onorare gli antenati: danze tradizionali e fuochi d'artificio nei templi.",                          month_start:8,  month_end:8,  type:"festival" },
  { destination_slug:"seoul",     name:"Fiori di ciliegio a Seul",           description:"I viali di Yeouido e il palazzo Gyeongbokgung si tingono di rosa, con feste di strada e mercatini.",                             month_start:3,  month_end:4,  type:"cultural" },
  { destination_slug:"seoul",     name:"Boryeong Mud Festival",              description:"Il festival del fango più famoso al mondo: gare, scivoli e bagni di fango sul lungomare di Boryeong.",                           month_start:7,  month_end:7,  type:"festival" },
  { destination_slug:"singapore", name:"Capodanno Cinese",                   description:"Dragoni, fuochi d'artificio e lanterne illuminano Chinatown. Una delle celebrazioni più vivaci d'Asia.",                        month_start:1,  month_end:2,  type:"festival" },
  { destination_slug:"singapore", name:"Formula 1 — Singapore GP",           description:"L'unico Gran Premio notturno del calendario F1: il circuito cittadino si snoda attorno alla baia.",                             month_start:9,  month_end:9,  type:"sports"   },
  { destination_slug:"bangkok",   name:"Songkran — Capodanno Thai",          description:"Il Capodanno tradizionale tailandese si festeggia con la battaglia d'acqua più grande del mondo.",                              month_start:4,  month_end:4,  type:"festival" },
  { destination_slug:"bangkok",   name:"Loi Krathong",                       description:"Festival delle lanterne: migliaia di lanterne di carta volano nel cielo e zattere di fiori galleggiano sui fiumi.",             month_start:11, month_end:11, type:"festival" },
  { destination_slug:"istanbul",  name:"Festival dei Tulipani di Istanbul",  description:"Milioni di tulipani colorano parchi e piazze della città — la Turchia è la patria storica del tulipano.",                      month_start:4,  month_end:4,  type:"cultural" },
  { destination_slug:"istanbul",  name:"Istanbul Jazz Festival",             description:"Concerti internazionali all'aperto in location iconiche: cortili storici, rive del Bosforo e palazzi.",                         month_start:7,  month_end:7,  type:"festival" },
  { destination_slug:"dubai",     name:"Dubai Shopping Festival",            description:"Sconti, spettacoli e fuochi d'artificio per settimane: il più grande evento commerciale del Medio Oriente.",                    month_start:12, month_end:2,  type:"festival" },

  // Europa
  { destination_slug:"amsterdam", name:"King's Day — Koningsdag",            description:"Il compleanno del re trasforma Amsterdam in una festa arancione: mercatini, musica live e barche colorate sui canali.",         month_start:4,  month_end:4,  type:"festival" },
  { destination_slug:"amsterdam", name:"Keukenhof — Tulipani in fiore",      description:"Il più grande giardino di tulipani al mondo apre le porte: 7 milioni di bulbi in fiore tra marzo e maggio.",                   month_start:3,  month_end:5,  type:"cultural" },
  { destination_slug:"munich",    name:"Oktoberfest",                        description:"La più grande festa della birra al mondo: birra bavarese, musica tradizionale e gastronomia tipica per due settimane.",         month_start:9,  month_end:10, type:"festival" },
  { destination_slug:"munich",    name:"Mercatini di Natale",                description:"I mercatini di Monaco sono tra i più antichi d'Europa: artigianato natalizio, vin brulé e decorazioni barocche.",             month_start:12, month_end:12, type:"market"   },
  { destination_slug:"dublin",    name:"St. Patrick's Day",                  description:"La festa nazionale irlandese con parata verde, musica folk tradizionale e festeggiamenti per le strade di Dublino.",           month_start:3,  month_end:3,  type:"festival" },
  { destination_slug:"dublin",    name:"Fleadh Cheoil — Musica Tradizionale",description:"Il più grande festival di musica tradizionale irlandese: sessioni spontanee nei pub e concerti nelle piazze.",                 month_start:8,  month_end:8,  type:"festival" },
  { destination_slug:"stockholm", name:"Midsommar",                          description:"La notte più lunga dell'anno: danze intorno al palo, corone di fiori, aringa marinata e aquavit sotto il sole di mezzanotte.", month_start:6,  month_end:6,  type:"festival" },
  { destination_slug:"barcelona", name:"La Mercè",                           description:"La festa patronale di Barcellona: castellers (torri umane), giganti, fuochi d'artificio e concerti gratuiti.",                month_start:9,  month_end:9,  type:"festival" },
  { destination_slug:"barcelona", name:"Carnevale di Sitges",                description:"Il carnevale più eccentrico della Spagna a soli 35 km da Barcellona: sfilate, costumi e festa per le strade.",                month_start:2,  month_end:2,  type:"carnival" },
  { destination_slug:"prague",    name:"Prague Spring — Festival Musicale",  description:"Uno dei più importanti festival di musica classica d'Europa, con concerti nelle sale storiche di Praga.",                      month_start:5,  month_end:6,  type:"festival" },
  { destination_slug:"prague",    name:"Mercatini di Natale di Praga",       description:"La Piazza della Città Vecchia si trasforma in un villaggio di Natale: artigianato tradizionale e vin brulé.",                  month_start:12, month_end:12, type:"market"   },
  { destination_slug:"vienna",    name:"Stagione dei Balli di Vienna",       description:"Oltre 450 balli ufficiali nei palazzi barocchi: dal Ballo dell'Opera al Ballo dei Filarmonici.",                               month_start:1,  month_end:3,  type:"cultural" },
  { destination_slug:"vienna",    name:"Mercatini di Natale a Schönbrunn",   description:"I mercatini davanti al palazzo di Schönbrunn sono tra i più romantici d'Europa.",                                               month_start:12, month_end:12, type:"market"   },
  { destination_slug:"budapest",  name:"Sziget Festival",                    description:"Uno dei più grandi festival musicali d'Europa su un'isola del Danubio: 500.000 visitatori da tutto il mondo.",                 month_start:8,  month_end:8,  type:"festival" },
  { destination_slug:"budapest",  name:"Budapest Spring Festival",           description:"Opera, musica classica, teatro e danza nei palazzi barocchi e nei teatri storici di Budapest.",                                  month_start:4,  month_end:4,  type:"festival" },
  { destination_slug:"athens",    name:"Festival di Atene ed Epidauro",      description:"Teatro greco antico, opera e danza moderna nel teatro di Erode Attico ai piedi dell'Acropoli.",                                 month_start:6,  month_end:8,  type:"festival" },
  { destination_slug:"london",    name:"Chelsea Flower Show",                description:"Il più prestigioso show di giardinaggio al mondo: 5 giorni di installazioni floreali nel cuore di Chelsea.",                   month_start:5,  month_end:5,  type:"cultural" },
  { destination_slug:"london",    name:"Notting Hill Carnival",              description:"Il carnevale più grande d'Europa fuori dal Brasile: musica caraibica, sfilate di costumi e cibo di strada.",                   month_start:8,  month_end:8,  type:"carnival" },
  { destination_slug:"copenhagen",name:"Copenhagen Jazz Festival",           description:"Dieci giorni di jazz in tutta la città: concerti gratuiti nei parchi, nei locali e nelle piazze.",                             month_start:7,  month_end:7,  type:"festival" },
  { destination_slug:"krakow",    name:"Sfilata del Drago di Wawel",         description:"La leggendaria parata del drago per le strade di Cracovia, con fuochi e costumi medievali.",                                    month_start:5,  month_end:6,  type:"cultural" },
  { destination_slug:"krakow",    name:"Mercatini di Natale in Piazza Rynek", description:"Uno dei più tradizionali d'Europa nella più grande piazza medievale del continente.",                                          month_start:12, month_end:12, type:"market"   },
  { destination_slug:"zurich",    name:"Street Parade di Zurigo",            description:"Uno dei più grandi rave all'aperto d'Europa: 1 milione di partecipanti e techno sul lungolago.",                               month_start:8,  month_end:8,  type:"festival" },
  { destination_slug:"tallinn",   name:"Old Town Days",                      description:"La città medievale di Tallinn si anima con mercati storici, cavalieri, giullari e musica rinascimentale.",                     month_start:6,  month_end:6,  type:"festival" },

  // Americhe
  { destination_slug:"buenos-aires", name:"Carnevale di Buenos Aires",       description:"Corsi, murgas e balli animano i quartieri porteños: meno noto del Rio ma autentico e travolgente.",                           month_start:2,  month_end:2,  type:"carnival" },
  { destination_slug:"buenos-aires", name:"Festival Mondiale del Tango",     description:"Il palcoscenico mondiale del tango argentino: campionati, milonghe e spettacoli in tutta Buenos Aires.",                      month_start:8,  month_end:8,  type:"festival" },
  { destination_slug:"new-york",  name:"Macy's Thanksgiving Parade",         description:"La parata più iconica d'America: palloni giganti, bande musicali e l'inizio ufficiale della stagione natalizia.",            month_start:11, month_end:11, type:"cultural" },
  { destination_slug:"new-york",  name:"New Year's Eve a Times Square",      description:"Il conto alla rovescia più famoso del mondo: il ball drop e i fuochi d'artificio davanti a 1 milione di persone.",          month_start:12, month_end:12, type:"festival" },
  { destination_slug:"toronto",   name:"TIFF — Toronto International Film Festival", description:"Uno dei festival cinematografici più importanti al mondo, seconda tappa dopo Venezia nella stagione dei premi.", month_start:9, month_end:9,  type:"cultural" },
  { destination_slug:"montreal",  name:"Montreal Jazz Festival",             description:"Il più grande festival jazz del mondo per numero di spettatori: 1.000 concerti e 650.000 visitatori.",                        month_start:6,  month_end:7,  type:"festival" },
  { destination_slug:"medellin",  name:"Feria de las Flores",                description:"La Fiera dei Fiori di Medellín: sfilata dei silleteros con composizioni floreali portate a spalla e orchidee ovunque.",     month_start:8,  month_end:8,  type:"festival" },

  // Oceania & Africa
  { destination_slug:"sydney",    name:"Vivid Sydney",                       description:"Il festival di luci più grande dell'emisfero australe: installazioni luminose sull'Opera House e il porto.",                  month_start:5,  month_end:6,  type:"festival" },
  { destination_slug:"sydney",    name:"Capodanno a Sydney",                 description:"I fuochi d'artificio sul Sydney Harbour Bridge sono tra i più famosi al mondo.",                                               month_start:12, month_end:12, type:"festival" },
  { destination_slug:"melbourne", name:"Australian Open",                    description:"Il primo Slam della stagione tennistica si gioca a Melbourne Park: 800.000 spettatori in due settimane.",                    month_start:1,  month_end:1,  type:"sports"   },
  { destination_slug:"melbourne", name:"Melbourne Cup",                      description:"La gara ippica più famosa d'Australia: ferma un'intera nazione il primo martedì di novembre.",                               month_start:11, month_end:11, type:"sports"   },
  { destination_slug:"cape-town", name:"Cape Town Jazz Festival",            description:"Il più grande festival jazz d'Africa: 40.000 visitatori, artisti internazionali e jazz africano.",                           month_start:3,  month_end:4,  type:"festival" },
  { destination_slug:"cape-town", name:"Whale watching season",              description:"Le balene australi si avvicinano alla costa di Hermanus: uno dei migliori posti al mondo per avvistarle.",                   month_start:7,  month_end:11, type:"cultural" },
];

async function seedEvents() {
  console.log("Seed eventi stagionali...");
  const { rows: destinations } = await db.query("SELECT id, slug FROM destinations");
  const slugToId = new Map<string, number>(destinations.map((d: { id: number; slug: string }) => [d.slug, d.id]));

  await db.query("DELETE FROM events");

  let inserted = 0;
  for (const ev of STATIC_EVENTS) {
    const destId = slugToId.get(ev.destination_slug);
    if (!destId) { continue; }
    await db.query(
      `INSERT INTO events (destination_id, name, description, month_start, month_end, type) VALUES ($1,$2,$3,$4,$5,$6)`,
      [destId, ev.name, ev.description, ev.month_start, ev.month_end, ev.type]
    );
    inserted++;
  }
  console.log(`  ${inserted} eventi inseriti.`);
}

async function main() {
  console.log("Creazione tabelle...");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await db.query(schema);
  console.log("Tabelle pronte.\n");

  const teleportOk = await seedFromTeleport();
  if (!teleportOk) await seedFromStatic();

  await seedEvents();

  console.log("\nSeed completato.");
  await db.end();
}

main().catch((err) => { console.error(err); db.end(); process.exit(1); });
