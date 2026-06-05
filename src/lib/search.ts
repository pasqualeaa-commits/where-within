import { db } from "./db";
import { calculateCost, scoreDestination } from "./scoring";
import type { ScoreBreakdown, DestinationCost } from "./scoring";

export interface SearchParams {
  fromIata: string;
  budgetEur: number;
  startDate: Date;
  endDate: Date;
  bookingDate: Date;
  limit?: number;
}

export interface DestinationResult {
  id: number;
  name: string;
  slug: string;
  country: string;
  country_code: string;
  continent: string | null;
  airport_iata: string;
  cost: DestinationCost;
  score: ScoreBreakdown;
  climate: { temp_avg: number | null; precip_avg: number | null };
  events_count: number;
  flight_direct: boolean;   // esiste una rotta diretta origine→destinazione
  teleport_scores: {
    overall: number | null;
    cost_of_living: number | null;
    safety: number | null;
    culture: number | null;
    outdoor: number | null;
  };
}

export interface SearchResult {
  data: DestinationResult[];
  meta: { total_found: number; nights: number; days_until_flight: number };
  error: string | null;
}

interface DBRow {
  id: number;
  name: string;
  slug: string;
  country: string;
  country_code: string;
  continent: string | null;
  latitude: string;
  longitude: string;
  score_overall: string | null;
  score_cost_of_living: string | null;
  score_safety: string | null;
  score_culture: string | null;
  score_outdoor: string | null;
  climate_temp_avg: string | null;
  climate_precip_avg: string | null;
  events_count: string;
  airport_iata: string;
  airport_lat: string;
  airport_lon: string;
}

export async function searchDestinations(params: SearchParams): Promise<SearchResult> {
  const { fromIata, budgetEur, startDate, endDate, bookingDate, limit = 20 } = params;

  const nights          = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  const daysUntilFlight = Math.max(0, Math.floor((startDate.getTime() - bookingDate.getTime()) / 86_400_000));
  const budgetCents     = Math.round(budgetEur * 100);
  const travelMonth     = startDate.getMonth() + 1;
  const travelMonths    = Array.from(new Set([startDate.getMonth() + 1, endDate.getMonth() + 1]));

  const originResult = await db.query<{ latitude: string; longitude: string }>(
    "SELECT latitude, longitude FROM airports WHERE iata_code = $1",
    [fromIata.toUpperCase()]
  );

  if (originResult.rowCount === 0) {
    return { data: [], meta: { total_found: 0, nights, days_until_flight: daysUntilFlight }, error: `Aeroporto "${fromIata}" non trovato` };
  }

  const originLat = Number(originResult.rows[0].latitude);
  const originLon = Number(originResult.rows[0].longitude);

  const { rows } = await db.query<DBRow>(
    `SELECT
       d.id, d.name, d.slug, d.country, d.country_code, d.continent,
       d.latitude, d.longitude,
       d.score_overall, d.score_cost_of_living,
       d.score_safety, d.score_culture, d.score_outdoor,
       AVG(cm.temp_avg)::DECIMAL(5,2)         AS climate_temp_avg,
       AVG(cm.precipitation_mm)::DECIMAL(7,2) AS climate_precip_avg,
       (
         SELECT COUNT(*) FROM events ev
         WHERE ev.destination_id = d.id
           AND (ev.month_start IS NULL
             OR ev.month_start = ANY($1::int[])
             OR ev.month_end   = ANY($1::int[]))
       )::int AS events_count,
       ap.iata_code AS airport_iata,
       ap.latitude  AS airport_lat,
       ap.longitude AS airport_lon
     FROM destinations d
     JOIN LATERAL (
       SELECT iata_code, latitude, longitude
       FROM airports WHERE destination_id = d.id
       ORDER BY iata_code LIMIT 1
     ) ap ON true
     LEFT JOIN climate_monthly cm
       ON cm.destination_id = d.id AND cm.month = ANY($1::int[])
     WHERE d.latitude IS NOT NULL
     GROUP BY d.id, ap.iata_code, ap.latitude, ap.longitude`,
    [travelMonths]
  );

  // Rotte dirette dall'origine verso gli aeroporti delle destinazioni (una sola query)
  const destIatas    = rows.map((r) => r.airport_iata).filter(Boolean);
  const directRes    = await db.query<{ dst_iata: string }>(
    "SELECT dst_iata FROM routes WHERE src_iata = $1 AND dst_iata = ANY($2::text[])",
    [fromIata.toUpperCase(), destIatas]
  );
  const directSet    = new Set(directRes.rows.map((r) => r.dst_iata));

  const results: DestinationResult[] = [];

  for (const row of rows) {
    // Tutte le destinazioni: costo stimato (volo A/R ×2 + hotel). Prezzi reali solo nel dettaglio.
    const cost: DestinationCost = calculateCost({
      originLat, originLon,
      destLat: Number(row.latitude), destLon: Number(row.longitude),
      travelMonth, daysUntilFlight, nights,
      costOfLivingScore: row.score_cost_of_living ? Number(row.score_cost_of_living) : null,
    });

    if (cost.total_cents > budgetCents) continue;

    const flight_direct = directSet.has(row.airport_iata);

    const score = scoreDestination({
      cost,
      budgetCents,
      climateTemp:   row.climate_temp_avg   ? Number(row.climate_temp_avg)   : null,
      climatePrecip: row.climate_precip_avg ? Number(row.climate_precip_avg) : null,
      eventsCount:   Number(row.events_count),
      score_overall: row.score_overall ? Number(row.score_overall) : null,
      score_safety:  row.score_safety  ? Number(row.score_safety)  : null,
      score_culture: row.score_culture ? Number(row.score_culture) : null,
      score_outdoor: row.score_outdoor ? Number(row.score_outdoor) : null,
    });

    results.push({
      id:           row.id,
      name:         row.name,
      slug:         row.slug,
      country:      row.country,
      country_code: row.country_code,
      continent:    row.continent,
      airport_iata: row.airport_iata,
      cost,
      score,
      flight_direct,
      climate: {
        temp_avg:   row.climate_temp_avg   ? Number(row.climate_temp_avg)   : null,
        precip_avg: row.climate_precip_avg ? Number(row.climate_precip_avg) : null,
      },
      events_count: Number(row.events_count),
      teleport_scores: {
        overall:        row.score_overall        ? Number(row.score_overall)        : null,
        cost_of_living: row.score_cost_of_living ? Number(row.score_cost_of_living) : null,
        safety:         row.score_safety         ? Number(row.score_safety)         : null,
        culture:        row.score_culture        ? Number(row.score_culture)        : null,
        outdoor:        row.score_outdoor        ? Number(row.score_outdoor)        : null,
      },
    });
  }

  results.sort((a, b) => b.score.total - a.score.total);

  return {
    data: results.slice(0, limit),
    meta: { total_found: results.length, nights, days_until_flight: daysUntilFlight },
    error: null,
  };
}
