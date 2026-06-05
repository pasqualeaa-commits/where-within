import Link from "next/link";
import type { DestinationResult } from "@/lib/search";
import { formatEur, countryFlag, scoreColor } from "@/lib/utils";

interface Props {
  result: DestinationResult;
  nights: number;
  searchContext: { from: string; budget: string; start_date: string; end_date: string };
}

export default function DestinationCard({ result, nights, searchContext }: Props) {
  const { name, country, country_code, slug, cost, score, climate, events_count, teleport_scores, flight_direct } = result;
  const scorePct  = Math.round(score.total * 100);
  const detailUrl = `/destination/${slug}?from=${searchContext.from}&budget=${searchContext.budget}&start_date=${searchContext.start_date}&end_date=${searchContext.end_date}`;

  const scoreBadgeColor =
    score.total >= 0.70 ? "bg-emerald-500 text-white" :
    score.total >= 0.50 ? "bg-blue-500 text-white" :
    score.total >= 0.35 ? "bg-amber-500 text-white" :
                          "bg-slate-400 text-white";

  return (
    <Link href={detailUrl} className="block rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:border-violet-200 transition-all hover:-translate-y-0.5 overflow-hidden">

      {/* Header strip */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-5 pt-5 pb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-label={country}>{countryFlag(country_code)}</span>
            <h2 className="text-lg font-bold text-slate-900">{name}</h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{country}</p>
        </div>
        <div className={`flex flex-col items-center shrink-0 rounded-xl px-3 py-1.5 ${scoreBadgeColor}`}>
          <span className="text-lg font-extrabold leading-none">{scorePct}</span>
          <span className="text-[10px] font-medium opacity-90">punti</span>
        </div>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-4">
        {/* Score bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreColor(score.total)}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>

        {/* Costi */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1">
              ✈️ Volo A/R
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">~stima</span>
              {flight_direct
                ? <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">diretto</span>
                : <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">scalo</span>}
            </span>
            <span className="font-semibold text-slate-800">{formatEur(cost.flight_cents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">🏨 Hotel ({nights} notti)</span>
            <span className="font-semibold text-slate-800">{formatEur(cost.hotel_cents)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-1">
            <span className="font-semibold text-slate-700">Totale stimato</span>
            <span className="font-bold text-violet-600 text-base">{formatEur(cost.total_cents)}</span>
          </div>
        </div>

        {/* Clima + eventi */}
        <div className="flex items-center gap-2 flex-wrap">
          {climate.temp_avg !== null && (
            <span className="flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full border border-orange-100">
              🌡️ {climate.temp_avg.toFixed(1)}°C
            </span>
          )}
          {climate.precip_avg !== null && (
            <span className="flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full border border-sky-100">
              🌧️ {climate.precip_avg.toFixed(0)} mm
            </span>
          )}
          {events_count > 0 && (
            <span className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-100">
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
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {label}
              <span className="inline-block h-1.5 w-8 rounded-full overflow-hidden bg-slate-200">
                <span
                  className={`block h-full ${scoreColor(value)}`}
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
              </span>
            </span>
          ))}
          {teleport_scores.safety !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
              🔒 Sicurezza {(teleport_scores.safety * 10).toFixed(0)}/100
            </span>
          )}
        </div>
      </div>
      <div className="px-5 pb-3 text-xs text-violet-500 font-medium">Vedi dettagli →</div>
    </Link>
  );
}
