export interface Destination {
  id: number;
  name: string;
  slug: string;
  country: string;
  country_code: string;
  continent: string | null;
  latitude: number | null;
  longitude: number | null;
  score_overall: number | null;
  score_cost_of_living: number | null;
  score_safety: number | null;
  score_healthcare: number | null;
  score_culture: number | null;
  score_outdoor: number | null;
  avg_hotel_per_night_cents: number | null;
  created_at: Date;
}

export interface Airport {
  id: number;
  iata_code: string | null;
  name: string;
  city: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  destination_id: number | null;
}

export interface ClimateMonthly {
  id: number;
  destination_id: number;
  month: number;
  temp_avg: number | null;
  temp_min: number | null;
  temp_max: number | null;
  precipitation_mm: number | null;
}

export interface Event {
  id: number;
  destination_id: number;
  name: string;
  description: string | null;
  month_start: number | null;
  month_end: number | null;
  type: string | null;
}
