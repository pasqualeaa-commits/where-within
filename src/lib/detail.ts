import { db } from "./db";
import { estimateFlightCost, estimateHotelNightlyCents, getHotelSeasonMultiplier, effectiveSeasonMonth } from "./pricing-model";
import { getRoutePrice } from "./travelpayouts";
import type { PriceBreakdown } from "./pricing-model";

export interface EventDetail {
  id: number;
  name: string;
  description: string | null;
  month_start: number;
  month_end: number;
  type: string | null;
}

export interface ClimateMonth {
  month: number;
  temp_avg: number | null;
  temp_min: number | null;
  temp_max: number | null;
  precipitation_mm: number | null;
}

export interface AlternativeAirport {
  iata_code: string;
  name: string;
  city: string;
  dest_name: string | null;
  dest_slug: string | null;
}

export interface DestinationDetail {
  id: number;
  name: string;
  slug: string;
  country: string;
  country_code: string;
  continent: string | null;
  latitude: number;
  longitude: number;
  score_overall: number | null;
  score_cost_of_living: number | null;
  score_safety: number | null;
  score_healthcare: number | null;
  score_culture: number | null;
  score_outdoor: number | null;
  airport_iata: string | null;
  airport_name: string | null;
  airport_city: string | null;
}

export interface DetailResult {
  destination: DestinationDetail;
  flight: PriceBreakdown;
  flight_cents: number;                     // prezzo A/R mostrato (reale o stima ×2)
  flight_real_price_cents: number | null;   // non-null se il prezzo viene da TP
  flight_airline: string | null;
  flight_transfers: number | null;          // 0=diretto, n=scali, null=ignoto
  flight_direct: boolean;
  hotel_nightly_cents: number;
  hotel_total_cents: number;
  hotel_season_label: string;
  total_cents: number;
  nights: number;
  daysUntilFlight: number;
  events: EventDetail[];
  climate: ClimateMonth[];
  alternativeAirports: AlternativeAirport[];
  originIata: string;
}

export async function getDestinationDetail(params: {
  slug: string;
  fromIata: string;
  startDate: Date;
  endDate: Date;
  bookingDate: Date;
}): Promise<DetailResult | null> {
  const { slug, fromIata, startDate, endDate, bookingDate } = params;

  const nights           = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  const daysUntilFlight  = Math.max(0, Math.floor((startDate.getTime() - bookingDate.getTime()) / 86_400_000));
  const travelMonth      = startDate.getMonth() + 1;
  const travelMonths     = Array.from(new Set([startDate.getMonth() + 1, endDate.getMonth() + 1]));
  const minMonth         = Math.min(...travelMonths);
  const maxMonth         = Math.max(...travelMonths);

  const [destResult, originResult] = await Promise.all([
    db.query(
      `SELECT d.*,
         a.iata_code AS airport_iata, a.name AS airport_name, a.city AS airport_city,
         a.latitude AS airport_lat, a.longitude AS airport_lon
       FROM destinations d
       LEFT JOIN LATERAL (
         SELECT iata_code, name, city, latitude, longitude
         FROM airports WHERE destination_id = d.id AND iata_code IS NOT NULL
         ORDER BY iata_code LIMIT 1
       ) a ON true
       WHERE d.slug = $1`,
      [slug]
    ),
    db.query(
      `SELECT latitude, longitude FROM airports WHERE iata_code = $1 LIMIT 1`,
      [fromIata.toUpperCase()]
    ),
  ]);

  if (!destResult.rows.length) return null;
  const row = destResult.rows[0];

  const destination: DestinationDetail = {
    id:                   row.id,
    name:                 row.name,
    slug:                 row.slug,
    country:              row.country,
    country_code:         row.country_code,
    continent:            row.continent,
    latitude:             Number(row.latitude),
    longitude:            Number(row.longitude),
    score_overall:        row.score_overall        ? Number(row.score_overall)        : null,
    score_cost_of_living: row.score_cost_of_living ? Number(row.score_cost_of_living) : null,
    score_safety:         row.score_safety         ? Number(row.score_safety)         : null,
    score_healthcare:     row.score_healthcare     ? Number(row.score_healthcare)     : null,
    score_culture:        row.score_culture        ? Number(row.score_culture)        : null,
    score_outdoor:        row.score_outdoor        ? Number(row.score_outdoor)        : null,
    airport_iata:         row.airport_iata  ?? null,
    airport_name:         row.airport_name  ?? null,
    airport_city:         row.airport_city  ?? null,
  };

  const originLat = originResult.rows.length ? Number(originResult.rows[0].latitude)  : 0;
  const originLon = originResult.rows.length ? Number(originResult.rows[0].longitude) : 0;

  const flight              = estimateFlightCost({ originLat, originLon, destLat: destination.latitude, destLon: destination.longitude, travelMonth, daysUntilFlight });
  const hotel_nightly_cents = estimateHotelNightlyCents(destination.score_cost_of_living, travelMonth, destination.latitude);
  const hotel_total_cents   = hotel_nightly_cents * nights;
  const hotel_season_label  = getHotelSeasonMultiplier(effectiveSeasonMonth(travelMonth, destination.latitude)).label;

  // Prezzo reale A/R per questa rotta + verifica volo diretto (in parallelo)
  const departMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
  const returnMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
  const destIata    = destination.airport_iata;

  const [routePrice, directRes] = await Promise.all([
    destIata ? getRoutePrice(fromIata, destIata, departMonth, returnMonth) : Promise.resolve(null),
    destIata
      ? db.query("SELECT 1 FROM routes WHERE src_iata = $1 AND dst_iata = $2 LIMIT 1", [fromIata.toUpperCase(), destIata])
      : Promise.resolve({ rows: [] as unknown[] }),
  ]);

  const flight_direct           = directRes.rows.length > 0 || routePrice?.transfers === 0;
  const flight_real_price_cents = routePrice ? routePrice.price_cents : null;
  const flight_airline          = routePrice ? routePrice.airline : null;
  // scali: dal prezzo reale se disponibile; altrimenti 0 se esiste rotta diretta, null = ignoto
  const flight_transfers        = routePrice ? routePrice.transfers : (flight_direct ? 0 : null);
  // stima A/R = sola andata × 2 (coerente con la lista risultati)
  const estimate_rt_cents       = flight.price_cents * 2;
  const flight_cents            = flight_real_price_cents ?? estimate_rt_cents;
  const total_cents             = flight_cents + hotel_total_cents;

  const [eventsResult, climateResult, altResult] = await Promise.all([
    db.query(
      `SELECT id, name, description, month_start, month_end, type
       FROM events
       WHERE destination_id = $1 AND month_end >= $2 AND month_start <= $3
       ORDER BY month_start`,
      [destination.id, minMonth, maxMonth]
    ),
    db.query(
      `SELECT month, temp_avg, temp_min, temp_max, precipitation_mm
       FROM climate_monthly
       WHERE destination_id = $1 AND month = ANY($2)
       ORDER BY month`,
      [destination.id, travelMonths]
    ),
    db.query(
      `SELECT DISTINCT ON (a.city)
         a.iata_code, a.name, a.city, d.name AS dest_name, d.slug AS dest_slug
       FROM airports a
       LEFT JOIN destinations d ON a.destination_id = d.id
       WHERE a.country_code = $1
         AND a.iata_code IS NOT NULL
         AND a.iata_code != $2
         AND a.city IS NOT NULL
       ORDER BY a.city, d.id NULLS LAST
       LIMIT 6`,
      [destination.country_code, destination.airport_iata ?? "??"]
    ),
  ]);

  return {
    destination,
    flight,
    flight_cents,
    flight_real_price_cents,
    flight_airline,
    flight_transfers,
    flight_direct,
    hotel_nightly_cents,
    hotel_total_cents,
    hotel_season_label,
    total_cents,
    nights,
    daysUntilFlight,
    events:              eventsResult.rows,
    climate:             climateResult.rows.map((r) => ({
      month:            r.month,
      temp_avg:         r.temp_avg         ? Number(r.temp_avg)         : null,
      temp_min:         r.temp_min         ? Number(r.temp_min)         : null,
      temp_max:         r.temp_max         ? Number(r.temp_max)         : null,
      precipitation_mm: r.precipitation_mm ? Number(r.precipitation_mm) : null,
    })),
    alternativeAirports: altResult.rows,
    originIata:          fromIata.toUpperCase(),
  };
}
