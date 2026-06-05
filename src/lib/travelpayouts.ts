const TOKEN = process.env.TRAVELPAYOUTS_TOKEN ?? "";
const BASE  = "https://api.travelpayouts.com";

// --- Prezzo reale per una singola rotta (usato nella pagina dettaglio) ---
// Endpoint aviasales/v3/prices_for_dates: dati molto più affidabili del bulk "cheap",
// e include il numero di scali (transfers). Una sola chiamata per rotta → poco traffico.

export interface RoutePrice {
  price_cents: number;
  airline: string;
  transfers: number;       // 0 = diretto, 1+ = scali
  departure_at: string;
  return_at: string | null;
  duration_minutes: number | null;
}

interface TpDatedTicket {
  price: number;
  airline: string;
  transfers: number;
  departure_at: string;
  return_at?: string;
  duration?: number;
}

export async function getRoutePrice(
  origin: string,
  destination: string,
  departMonth: string,        // "YYYY-MM"
  returnMonth?: string        // "YYYY-MM" → cerca A/R
): Promise<RoutePrice | null> {
  if (!TOKEN) return null;

  const url = new URL(`${BASE}/aviasales/v3/prices_for_dates`);
  url.searchParams.set("origin",       origin.toUpperCase());
  url.searchParams.set("destination",  destination.toUpperCase());
  url.searchParams.set("departure_at", departMonth);
  if (returnMonth) {
    url.searchParams.set("return_at", returnMonth);
    url.searchParams.set("one_way", "false");
  } else {
    url.searchParams.set("one_way", "true");
  }
  url.searchParams.set("currency", "eur");
  url.searchParams.set("sorting",  "price");
  url.searchParams.set("limit",    "1");
  url.searchParams.set("token",    TOKEN);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: TpDatedTicket[] };
    const t = json.success ? json.data?.[0] : undefined;
    if (!t) return null;
    return {
      price_cents:      Math.round(t.price * 100),
      airline:          t.airline,
      transfers:        t.transfers ?? 0,
      departure_at:     t.departure_at,
      return_at:        t.return_at ?? null,
      duration_minutes: t.duration ?? null,
    };
  } catch {
    return null;
  }
}
