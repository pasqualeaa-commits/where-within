import "dotenv/config";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
  };
}

interface MonthlyAccumulator {
  temp_max: number[];
  temp_min: number[];
  temp_avg: number[];
  precipitation_mm: number[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Scarica dati giornalieri per 3 anni e restituisce medie mensili (indice 0=Gen, 11=Dic)
async function fetchClimateMonthly(
  lat: number,
  lon: number
): Promise<MonthlyAccumulator[] | null> {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 2;

  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("start_date", `${startYear}-01-01`);
  url.searchParams.set("end_date", `${endYear}-12-31`);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum"
  );
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;

    // Inizializza accumulatori per i 12 mesi
    const acc: MonthlyAccumulator[] = Array.from({ length: 12 }, () => ({
      temp_max: [],
      temp_min: [],
      temp_avg: [],
      precipitation_mm: [],
    }));

    for (let i = 0; i < data.daily.time.length; i++) {
      const month = new Date(data.daily.time[i]).getMonth(); // 0-11
      const tmax = data.daily.temperature_2m_max[i];
      const tmin = data.daily.temperature_2m_min[i];
      const tavg = data.daily.temperature_2m_mean[i];
      const prec = data.daily.precipitation_sum[i];

      // Open-Meteo può restituire null per giorni mancanti
      if (tmax != null) acc[month].temp_max.push(tmax);
      if (tmin != null) acc[month].temp_min.push(tmin);
      if (tavg != null) acc[month].temp_avg.push(tavg);
      if (prec != null) acc[month].precipitation_mm.push(prec);
    }

    return acc;
  } catch {
    return null;
  }
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]): number | null {
  if (values.length === 0) return null;
  // precipitation_sum da Open-Meteo è già mm/giorno — sommiamo e dividiamo per anni
  return values.reduce((a, b) => a + b, 0) / 3;
}

async function main() {
  const { rows: destinations } = await db.query<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  }>(
    "SELECT id, name, latitude, longitude FROM destinations WHERE latitude IS NOT NULL ORDER BY id"
  );

  console.log(`Seed clima per ${destinations.length} destinazioni...\n`);

  let done = 0;
  const BATCH = 3; // Open-Meteo free: massimo ~10 req/s, usiamo 3 per sicurezza

  for (let i = 0; i < destinations.length; i += BATCH) {
    const batch = destinations.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (dest) => {
        const monthly = await fetchClimateMonthly(
          Number(dest.latitude),
          Number(dest.longitude)
        );

        if (!monthly) {
          console.warn(`  [skip] ${dest.name}`);
          return;
        }

        // Upsert dei 12 mesi
        for (let m = 0; m < 12; m++) {
          await db.query(
            `INSERT INTO climate_monthly
               (destination_id, month, temp_avg, temp_min, temp_max, precipitation_mm)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (destination_id, month) DO UPDATE SET
               temp_avg         = EXCLUDED.temp_avg,
               temp_min         = EXCLUDED.temp_min,
               temp_max         = EXCLUDED.temp_max,
               precipitation_mm = EXCLUDED.precipitation_mm`,
            [
              dest.id,
              m + 1, // mesi 1-12
              avg(monthly[m].temp_avg),
              avg(monthly[m].temp_min),
              avg(monthly[m].temp_max),
              sum(monthly[m].precipitation_mm),
            ]
          );
        }

        done++;
        console.log(`  [${done}/${destinations.length}] ${dest.name}`);
      })
    );

    if (i + BATCH < destinations.length) await sleep(300);
  }

  console.log("\nSeed clima completato.");
  await db.end();
}

main().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
