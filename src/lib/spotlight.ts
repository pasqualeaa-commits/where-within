import { db } from "./db";
import { MONTH_NAMES } from "./utils";

export interface SpotlightEvent {
  event_name: string;
  event_description: string | null;
  event_type: string | null;
  month_start: number;
  month_end: number;
  dest_name: string;
  dest_slug: string;
  dest_country: string;
  dest_country_code: string;
  timing_label: string;
  section: 'now' | 'soon';
  prefill_start: string;  // YYYY-MM-DD per prefillare il form
  prefill_end: string;
}

export async function getSpotlightEvents(): Promise<SpotlightEvent[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = now.getFullYear();

  // Domani come start per gli eventi in corso (evita date passate nel form)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const tomorrowPlus7 = new Date(tomorrow);
  tomorrowPlus7.setDate(tomorrowPlus7.getDate() + 7);
  const tomorrowPlus7Str = tomorrowPlus7.toISOString().split("T")[0];

  // Finestra: mese corrente + 2 mesi, con wrap-around
  const window = [0, 1, 2].map((offset) => ((currentMonth - 1 + offset) % 12) + 1);

  try {
    const { rows } = await db.query(
      `SELECT e.name AS event_name, e.description AS event_description, e.type AS event_type,
              e.month_start, e.month_end,
              d.name AS dest_name, d.slug AS dest_slug,
              d.country AS dest_country, d.country_code AS dest_country_code
       FROM events e
       JOIN destinations d ON e.destination_id = d.id
       WHERE e.month_start = ANY($1) OR e.month_end = ANY($1)
       ORDER BY
         CASE WHEN e.month_start <= $2 AND e.month_end >= $2 THEN 0
              ELSE 1 END,
         e.month_start,
         RANDOM()
       LIMIT 8`,
      [window, currentMonth]
    );

    return rows.map((row) => {
      const m = row.month_start;
      const isNow = row.month_start <= currentMonth && row.month_end >= currentMonth;

      if (isNow) {
        return {
          ...row,
          section: 'now' as const,
          timing_label: 'In corso',
          prefill_start: tomorrowStr,
          prefill_end:   tomorrowPlus7Str,
        };
      }

      // Evento futuro: se month_start è già passato nell'anno corrente, è l'anno prossimo
      const eventYear = m < currentMonth ? year + 1 : year;
      const mm = String(m).padStart(2, "0");
      return {
        ...row,
        section: 'soon' as const,
        timing_label: MONTH_NAMES[m - 1],
        prefill_start: `${eventYear}-${mm}-01`,
        prefill_end:   `${eventYear}-${mm}-14`,
      };
    });
  } catch {
    return [];
  }
}
