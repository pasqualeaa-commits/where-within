// Calcola il punteggio finale di una destinazione.
// Tutti i sub-score sono nel range [0, 1].
// Formula: budget(40%) + clima(30%) + qualità(25%) + eventi(5%)

import { estimateFlightCost, estimateHotelNightlyCents } from "./pricing-model";

const WEIGHTS = {
  budget:  0.40,
  climate: 0.30,
  quality: 0.25,
  events:  0.05,
};

export interface ScoreBreakdown {
  total: number;
  budget: number;
  climate: number;
  quality: number;
  events: number;
}

export interface DestinationCost {
  flight_cents: number;
  hotel_cents: number;
  total_cents: number;
  nights: number;
}

// Budget: quanto "avanza" del budget dopo il viaggio (0 = al limite, 1 = gratuito).
// Destinazioni oltre budget vengono escluse prima di chiamare questa funzione.
function scoreBudget(totalCents: number, budgetCents: number): number {
  if (budgetCents <= 0) return 0;
  return Math.max(0, 1 - totalCents / budgetCents);
}

// Clima: temperatura ideale 22°C, penalità per pioggia.
function scoreClimate(tempAvg: number | null, precipMm: number | null): number {
  if (tempAvg === null) return 0.5; // nessun dato → punteggio neutro

  // Temperatura: picco a 22°C, scende a 0 a ±18°C
  const tempScore = Math.max(0, 1 - Math.abs(tempAvg - 22) / 18);

  // Precipitazioni: 0mm = nessuna penalità, 150mm+ = penalità massima
  const precipScore = precipMm != null
    ? Math.max(0, 1 - precipMm / 150)
    : 1;

  return tempScore * 0.7 + precipScore * 0.3;
}

// Qualità Teleport: media pesata dei punteggi (normalizzati da 0-10 a 0-1).
function scoreQuality(params: {
  score_overall:    number | null;
  score_safety:     number | null;
  score_culture:    number | null;
  score_outdoor:    number | null;
}): number {
  const values = [
    { v: params.score_overall, w: 0.4 },
    { v: params.score_safety,  w: 0.3 },
    { v: params.score_culture, w: 0.2 },
    { v: params.score_outdoor, w: 0.1 },
  ].filter((x) => x.v !== null) as Array<{ v: number; w: number }>;

  if (values.length === 0) return 0.5;

  const totalWeight = values.reduce((s, x) => s + x.w, 0);
  const weighted    = values.reduce((s, x) => s + (x.v / 10) * x.w, 0);
  return weighted / totalWeight;
}

// Eventi: 0 = nessun evento, cresce fino a 1 con 4+ eventi nel periodo.
function scoreEvents(eventsCount: number): number {
  return Math.min(1, eventsCount / 4);
}

// --- Calcolo costo totale ---

export function calculateCost(params: {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  travelMonth: number;
  daysUntilFlight: number;
  nights: number;
  costOfLivingScore: number | null;
}): DestinationCost {
  const flight = estimateFlightCost({
    originLat:       params.originLat,
    originLon:       params.originLon,
    destLat:         params.destLat,
    destLon:         params.destLon,
    travelMonth:     params.travelMonth,
    daysUntilFlight: params.daysUntilFlight,
  });

  // × 2 per il volo di ritorno (stima: ritorno ≈ stesso prezzo dell'andata)
  const flight_cents  = flight.price_cents * 2;
  const hotelPerNight = estimateHotelNightlyCents(params.costOfLivingScore, params.travelMonth, params.destLat);
  const hotel_cents   = hotelPerNight * params.nights;
  const total_cents   = flight_cents + hotel_cents;

  return {
    flight_cents,
    hotel_cents,
    total_cents,
    nights: params.nights,
  };
}

// --- Punteggio finale ---

export function scoreDestination(params: {
  cost: DestinationCost;
  budgetCents: number;
  climateTemp: number | null;
  climatePrecip: number | null;
  eventsCount: number;
  score_overall:    number | null;
  score_safety:     number | null;
  score_culture:    number | null;
  score_outdoor:    number | null;
}): ScoreBreakdown {
  const budget  = scoreBudget(params.cost.total_cents, params.budgetCents);
  const climate = scoreClimate(params.climateTemp, params.climatePrecip);
  const quality = scoreQuality(params);
  const events  = scoreEvents(params.eventsCount);

  const total =
    budget  * WEIGHTS.budget  +
    climate * WEIGHTS.climate +
    quality * WEIGHTS.quality +
    events  * WEIGHTS.events;

  return {
    total: Math.round(total * 1000) / 1000,
    budget:  Math.round(budget  * 1000) / 1000,
    climate: Math.round(climate * 1000) / 1000,
    quality: Math.round(quality * 1000) / 1000,
    events:  Math.round(events  * 1000) / 1000,
  };
}
