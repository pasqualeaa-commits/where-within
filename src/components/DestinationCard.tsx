import type { DestinationResult } from "@/lib/search";
import { formatEur, countryFlag, scoreColor } from "@/lib/utils";

interface Props {
  result: DestinationResult;
  nights: number;
}

export default function DestinationCard({ result, nights }: Props) {
  const { name, country, country_code, cost, score, climate, events_count, teleport_scores } = result;
  const scorePct = Math.round(score.total * 100);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-label={country}>{countryFlag(country_code)}</span>
            <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{country}</p>
        </div>
        {/* Score badge */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xl font-bold text-slate-900">{scorePct}%</span>
          <span className="text-xs text-slate-400">punteggio</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreColor(score.total)}`}
          style={{ width: `${scorePct}%` }}
        />
      </div>

      {/* Costi */}
      <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">✈️ Volo (andata)</span>
          <span className="font-medium text-slate-800">{formatEur(cost.flight_cents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">🏨 Hotel ({nights} notti)</span>
          <span className="font-medium text-slate-800">{formatEur(cost.hotel_cents)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5 mt-1.5">
          <span className="font-semibold text-slate-700">Totale stimato</span>
          <span className="font-bold text-indigo-600">{formatEur(cost.total_cents)}</span>
        </div>
      </div>

      {/* Clima + eventi */}
      <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
        {climate.temp_avg !== null && (
          <span className="flex items-center gap-1">
            🌡️ <strong>{climate.temp_avg.toFixed(1)}°C</strong>
          </span>
        )}
        {climate.precip_avg !== null && (
          <span className="flex items-center gap-1">
            🌧️ {climate.precip_avg.toFixed(0)} mm
          </span>
        )}
        {events_count > 0 && (
          <span className="flex items-center gap-1">
            🎭 {events_count} {events_count === 1 ? "evento" : "eventi"}
          </span>
        )}
      </div>

      {/* Sub-score pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Budget",  value: score.budget  },
          { label: "Clima",   value: score.climate  },
          { label: "Qualità", value: score.quality  },
        ].map(({ label, value }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
          >
            {label}
            <span className={`inline-block h-1.5 w-8 rounded-full overflow-hidden bg-slate-200`}>
              <span
                className={`block h-full ${scoreColor(value)}`}
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </span>
          </span>
        ))}
        {teleport_scores.safety !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            🔒 Sicurezza {(teleport_scores.safety * 10).toFixed(0)}/100
          </span>
        )}
      </div>
    </div>
  );
}
