// Stima i costi di viaggio (volo + hotel) senza API a pagamento.
// Tutti i prezzi sono in EUR cents (es. 15000 = €150.00)

// --- Hotel ---
// Stima il costo medio per notte (camera doppia, 3 stelle) da due fattori:
//   1. punteggio "cost_of_living" 0-10 (alto = città economica → hotel più economici)
//   2. stagionalità del mese di soggiorno (alta stagione → prezzi più alti)
// Range base: score 10 → €35/notte, score 0 → €200/notte
// Nota: gli hotel variano meno dei voli, quindi i moltiplicatori stagionali sono più miti.

const HOTEL_SEASON_MULTIPLIERS: Record<number, { value: number; label: string }> = {
  1:  { value: 0.85, label: "bassa stagione" },
  2:  { value: 0.85, label: "bassa stagione" },
  3:  { value: 0.92, label: "spalla" },
  4:  { value: 1.00, label: "spalla" },
  5:  { value: 1.08, label: "spalla alta" },
  6:  { value: 1.18, label: "alta stagione" },
  7:  { value: 1.28, label: "picco" },
  8:  { value: 1.28, label: "picco" },
  9:  { value: 1.08, label: "spalla alta" },
  10: { value: 0.95, label: "spalla" },
  11: { value: 0.85, label: "bassa stagione" },
  12: { value: 1.05, label: "festività" }, // Natale/Capodanno
};

export function getHotelSeasonMultiplier(month: number): { value: number; label: string } {
  return HOTEL_SEASON_MULTIPLIERS[month] ?? { value: 1.0, label: "standard" };
}

export function estimateHotelNightlyCents(
  costOfLivingScore: number | null,
  travelMonth?: number,
  destLat?: number,
): number {
  const score = costOfLivingScore ?? 5;
  const min = 3500;   // €35 (città molto economica)
  const max = 20000;  // €200 (città molto cara)
  const base = max - (score / 10) * (max - min);
  const month = travelMonth != null && destLat != null
    ? effectiveSeasonMonth(travelMonth, destLat)
    : travelMonth;
  const season = month ? getHotelSeasonMultiplier(month).value : 1;
  return Math.round(base * season);
}

// --- Volo ---
// Formula: base_price × season_multiplier × advance_multiplier

export interface PriceBreakdown {
  price_cents: number;
  distance_km: number;
  base_price_cents: number;
  season_multiplier: number;
  advance_multiplier: number;
  season_label: string;
  advance_label: string;
}

// --- Distanza ---

// Formula di Haversine: distanza in km tra due coordinate geografiche
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Prezzo base (sola andata) in funzione continua della distanza ---
// Curva di potenza calibrata su tariffe medie reali (sola andata, classe economica):
//   500 km ≈ €45 · 1500 km ≈ €105 · 3000 km ≈ €170 · 6000 km ≈ €300 · 16000 km ≈ €655
// Sostituisce le 5 fasce grezze che davano lo stesso prezzo a Tokyo, Sydney e Bangkok.
export function getBasePriceCents(distanceKm: number): number {
  const eur = 0.38 * Math.pow(Math.max(1, distanceKm), 0.77);
  return Math.round(Math.max(30, eur) * 100);
}

// --- Moltiplicatore stagionale ---
// Basato sul mese di arrivo/soggiorno (1=Gennaio, 12=Dicembre)

const SEASON_MULTIPLIERS: Record<number, { value: number; label: string }> = {
  1:  { value: 0.75, label: "bassa stagione" },
  2:  { value: 0.75, label: "bassa stagione" },
  3:  { value: 0.90, label: "spalla" },
  4:  { value: 1.00, label: "spalla" },
  5:  { value: 1.10, label: "spalla alta" },
  6:  { value: 1.25, label: "alta stagione" },
  7:  { value: 1.40, label: "picco" },
  8:  { value: 1.40, label: "picco" },
  9:  { value: 1.10, label: "spalla alta" },
  10: { value: 0.95, label: "spalla" },
  11: { value: 0.80, label: "bassa stagione" },
  12: { value: 0.90, label: "spalla" }, // Natale alza i prezzi vs Nov
};

export function getSeasonMultiplier(month: number): { value: number; label: string } {
  return SEASON_MULTIPLIERS[month] ?? { value: 1.0, label: "standard" };
}

// Emisfero sud: le stagioni sono invertite di 6 mesi (luglio nord = inverno sud).
// destLat < 0 → sposta il mese di 6 per ottenere la stagione "percepita".
export function effectiveSeasonMonth(month: number, destLat: number): number {
  if (destLat >= 0) return month;
  return ((month - 1 + 6) % 12) + 1;
}

// --- Moltiplicatore anticipo prenotazione ---

const ADVANCE_BANDS: Array<{ minDays: number; value: number; label: string }> = [
  { minDays: 90, value: 0.60, label: "90+ giorni prima" },
  { minDays: 60, value: 0.75, label: "60-90 giorni prima" },
  { minDays: 30, value: 0.90, label: "30-60 giorni prima" },
  { minDays: 15, value: 1.20, label: "15-30 giorni prima" },
  { minDays: 0,  value: 1.55, label: "meno di 15 giorni" },
];

export function getAdvanceMultiplier(daysUntilFlight: number): { value: number; label: string } {
  return (
    ADVANCE_BANDS.find((b) => daysUntilFlight >= b.minDays) ??
    { value: 1.55, label: "last minute" }
  );
}

// --- Calcolo finale ---

export function estimateFlightCost(params: {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  travelMonth: number;    // 1-12
  daysUntilFlight: number;
}): PriceBreakdown {
  const distance_km = Math.round(
    haversineKm(params.originLat, params.originLon, params.destLat, params.destLon)
  );
  const base_price_cents = getBasePriceCents(distance_km);
  const season = getSeasonMultiplier(effectiveSeasonMonth(params.travelMonth, params.destLat));
  const advance = getAdvanceMultiplier(params.daysUntilFlight);

  const price_cents = Math.round(base_price_cents * season.value * advance.value);

  return {
    price_cents,
    distance_km,
    base_price_cents,
    season_multiplier: season.value,
    advance_multiplier: advance.value,
    season_label: season.label,
    advance_label: advance.label,
  };
}
