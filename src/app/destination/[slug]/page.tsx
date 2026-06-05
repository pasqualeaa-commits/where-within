import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestinationDetail } from "@/lib/detail";
import { formatEur, countryFlag, scoreColor, MONTH_NAMES } from "@/lib/utils";

interface PageProps {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; budget?: string; start_date?: string; end_date?: string }>;
}

const EVENT_ICONS: Record<string, string> = {
  festival: "🎉", carnival: "🎭", sports: "⚽", cultural: "🎨", market: "🛍️",
};

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 10);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${scoreColor(value / 10)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-8 text-right">{pct}</span>
    </div>
  );
}

export default async function DestinationDetailPage({ params, searchParams }: PageProps) {
  const { slug }                               = await params;
  const { from, budget, start_date, end_date } = await searchParams;

  if (!from || !start_date || !end_date) notFound();

  const startDate = new Date(start_date!);
  const endDate   = new Date(end_date!);
  const budgetEur = parseFloat(budget ?? "0");

  const detail = await getDestinationDetail({
    slug, fromIata: from!, startDate, endDate, bookingDate: new Date(),
  });

  if (!detail) notFound();

  const { destination, flight, flight_cents, flight_real_price_cents, flight_airline, flight_transfers, flight_direct, hotel_nightly_cents, hotel_total_cents, hotel_season_label, total_cents, nights, daysUntilFlight, events, climate, alternativeAirports, originIata } = detail;
  const effective_flight_cents = flight_cents;

  // Etichetta scali: 0=diretto, n=scali, null=ignoto (nessuna rotta diretta nota)
  const stopsLabel =
    flight_transfers === 0 ? "Diretto" :
    flight_transfers === 1 ? "1 scalo" :
    flight_transfers != null ? `${flight_transfers} scali` :
    "Scalo probabile";
  const stopsColor = flight_transfers === 0
    ? "bg-emerald-100 text-emerald-700"
    : "bg-amber-100 text-amber-700";

  const travelMonths = Array.from(new Set([startDate.getMonth(), endDate.getMonth()]));
  const backHref = `/results?from=${from}&budget=${budget}&start_date=${start_date}&end_date=${end_date}`;
  const budgetLeft = budgetEur * 100 - total_cents;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold">
            <span className="text-xl">🌍</span>
            <span className="tracking-tight">WhereWithin</span>
          </Link>
          <Link href={backHref} className="text-sm text-white/80 font-medium hover:text-white transition-colors">
            ← Torna ai risultati
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-4xl">{countryFlag(destination.country_code)}</span>
                  <h1 className="text-3xl font-extrabold text-slate-900">{destination.name}</h1>
                </div>
                <p className="text-slate-500">{destination.country} · {destination.continent}</p>
                {destination.airport_iata && (
                  <p className="text-sm text-slate-400 mt-1">
                    Aeroporto principale: <span className="font-semibold text-slate-600">{destination.airport_iata}</span>
                    {destination.airport_name && ` — ${destination.airport_name}`}
                  </p>
                )}
              </div>
              {destination.score_overall !== null && (
                <div className={`shrink-0 rounded-2xl px-4 py-3 text-center ${
                  destination.score_overall >= 7 ? "bg-emerald-500 text-white" :
                  destination.score_overall >= 5 ? "bg-blue-500 text-white" :
                  "bg-amber-500 text-white"
                }`}>
                  <div className="text-2xl font-extrabold leading-none">{Math.round(destination.score_overall * 10)}</div>
                  <div className="text-xs font-medium opacity-80 mt-0.5">/ 100</div>
                </div>
              )}
            </div>
          </div>

          {/* Date + budget summary strip */}
          <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-sm text-slate-600">
            <span>✈️ <strong>{originIata}</strong> → <strong>{destination.airport_iata ?? destination.name}</strong></span>
            <span>📅 {startDate.toLocaleDateString("it-IT")} → {endDate.toLocaleDateString("it-IT")}</span>
            <span>🌙 {nights} notti</span>
            <span>💶 Budget: <strong>€{budgetEur.toLocaleString("it-IT")}</strong></span>
            {budgetLeft > 0
              ? <span className="text-emerald-600 font-medium">✓ Avanzano {formatEur(budgetLeft)}</span>
              : <span className="text-red-500 font-medium">⚠ Supera il budget di {formatEur(-budgetLeft)}</span>}
          </div>
        </div>

        {/* Costi + Qualità */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Costi */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">💰 Stima costi</h2>

            <div className="space-y-3">
              <div className={`rounded-xl border p-4 space-y-2 ${flight_real_price_cents ? "bg-emerald-50 border-emerald-200" : "bg-indigo-50 border-indigo-100"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                      ✈️ Volo A/R
                      {flight_real_price_cents
                        ? <span className="text-xs font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full">prezzo reale</span>
                        : <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">stima</span>}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stopsColor}`}>{stopsLabel}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {flight.distance_km.toLocaleString("it-IT")} km · {flight.season_label}
                      {flight_airline && ` · ${flight_airline}`}
                    </p>
                  </div>
                  <span className={`font-bold text-lg ${flight_real_price_cents ? "text-emerald-700" : "text-indigo-700"}`}>
                    {formatEur(effective_flight_cents)}
                  </span>
                </div>
                {!flight_real_price_cents && (
                  <div className="flex gap-2 mt-2 text-xs flex-wrap">
                    <span className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full">Base 1 senso: {formatEur(flight.base_price_cents)}</span>
                    <span className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full">Stagione: ×{flight.season_multiplier}</span>
                    <span className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full">Anticipo: ×{flight.advance_multiplier}</span>
                    <span className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full">A/R: ×2</span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800">🏨 Hotel ({nights} notti)</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatEur(hotel_nightly_cents)}/notte · {hotel_season_label}</p>
                  </div>
                  <span className="font-bold text-violet-700 text-lg">{formatEur(hotel_total_cents)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Stima su costo della vita locale + stagionalità (camera doppia ~3★)</p>
              </div>

              <div className="flex justify-between items-center rounded-xl bg-slate-900 text-white px-4 py-3">
                <span className="font-semibold">Totale stimato</span>
                <span className="text-xl font-extrabold">{formatEur(total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Qualità */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">⭐ Indici di qualità</h2>
            <div className="space-y-3">
              <ScoreRow label="Qualità vita"    value={destination.score_overall} />
              <ScoreRow label="Costo della vita" value={destination.score_cost_of_living} />
              <ScoreRow label="Sicurezza"        value={destination.score_safety} />
              <ScoreRow label="Sanità"           value={destination.score_healthcare} />
              <ScoreRow label="Cultura"          value={destination.score_culture} />
              <ScoreRow label="Attività outdoor" value={destination.score_outdoor} />
            </div>
            {destination.score_overall === null && (
              <p className="text-sm text-slate-400">Punteggi non disponibili per questa destinazione.</p>
            )}
          </div>
        </div>

        {/* Clima */}
        {climate.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-4">🌡️ Clima nel periodo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {climate.map((c) => (
                <div key={c.month} className="rounded-xl bg-orange-50 border border-orange-100 p-4">
                  <p className="font-semibold text-slate-800 mb-2">{MONTH_NAMES[c.month - 1]}</p>
                  <div className="space-y-1 text-sm text-slate-600">
                    {c.temp_avg  !== null && <p>🌡️ Media: <strong>{c.temp_avg.toFixed(1)}°C</strong></p>}
                    {c.temp_min  !== null && c.temp_max !== null && (
                      <p>↕️ Range: {c.temp_min.toFixed(0)}°C – {c.temp_max.toFixed(0)}°C</p>
                    )}
                    {c.precipitation_mm !== null && (
                      <p>🌧️ Precipitazioni: <strong>{c.precipitation_mm.toFixed(0)} mm</strong></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eventi */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-lg mb-4">
            🎭 Eventi nel periodo
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">Nessun evento noto in {travelMonths.map((m) => MONTH_NAMES[m]).join(" / ")}.</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="flex gap-3 rounded-xl bg-purple-50 border border-purple-100 p-4">
                  <span className="text-2xl shrink-0">{EVENT_ICONS[ev.type ?? ""] ?? "📅"}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{ev.name}</p>
                    {ev.description && <p className="text-sm text-slate-600 mt-0.5">{ev.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {MONTH_NAMES[ev.month_start - 1]}
                      {ev.month_end !== ev.month_start && ` – ${MONTH_NAMES[ev.month_end - 1]}`}
                      {ev.type && ` · ${ev.type}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aeroporti alternativi / open-jaw */}
        {alternativeAirports.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-900 text-lg mb-1">🔀 Volo open-jaw — esplora più città</h2>
            <p className="text-sm text-slate-500 mb-4">
              In <strong>{destination.country}</strong> ci sono altri aeroporti: potresti arrivare a{" "}
              <strong>{destination.airport_iata ?? destination.name}</strong> e tornare da un'altra città,
              combinando più destinazioni in un unico viaggio.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alternativeAirports.map((ap) => (
                <div key={ap.iata_code} className="flex items-center gap-3 rounded-xl bg-sky-50 border border-sky-100 p-3">
                  <span className="text-lg font-extrabold text-sky-600 bg-sky-100 px-2 py-1 rounded-lg tracking-wider">
                    {ap.iata_code}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{ap.city}</p>
                    {ap.dest_name && <p className="text-xs text-slate-400">{ap.dest_name}</p>}
                    {!ap.dest_name && <p className="text-xs text-slate-400">{ap.name}</p>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Esempio: vola da <strong>{originIata}</strong> → <strong>{destination.airport_iata ?? "?"}</strong>, ritorno da{" "}
              <strong>{alternativeAirports[0]?.iata_code ?? "?"}</strong> → <strong>{originIata}</strong>
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
