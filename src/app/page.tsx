import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import { getSpotlightEvents } from "@/lib/spotlight";
import { countryFlag } from "@/lib/utils";

const EVENT_ICONS: Record<string, string> = {
  festival: "🎉", carnival: "🎭", sports: "⚽", cultural: "🌸", market: "🛍️",
};

interface PageProps {
  searchParams: Promise<{ start_date?: string; end_date?: string; from?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params   = await searchParams;
  const prefill  = {
    start_date: params.start_date,
    end_date:   params.end_date,
    from:       params.from,
  };

  const spotlight  = await getSpotlightEvents();
  const nowEvents  = spotlight.filter((e) => e.section === 'now');
  const soonEvents = spotlight.filter((e) => e.section === 'soon');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex flex-col">

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌍</span>
          <span className="font-bold text-white text-lg tracking-tight">WhereWithin</span>
        </div>
      </header>

      {/* Hero + Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Titolo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3 drop-shadow-sm">
              Dove vuoi andare?
            </h1>
            <p className="text-white/75 text-base leading-relaxed">
              Inserisci budget e date: ti suggeriamo le destinazioni migliori
              con stime di volo, hotel e clima.
            </p>
          </div>

          {/* Form card — key forza il remount quando cambiano le date dal prefill */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6">
            <SearchForm
              key={`${prefill.start_date ?? ""}-${prefill.end_date ?? ""}`}
              prefill={prefill}
            />
          </div>

          {/* Feature pills */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "✈️", label: "Volo stimato",     sub: "anticipo + stagione" },
              { icon: "🏨", label: "Hotel incluso",     sub: "costo medio/notte"  },
              { icon: "🌡️", label: "Clima del periodo", sub: "medie storiche reali" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1 bg-white/10 rounded-xl px-2 py-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-semibold text-white">{label}</span>
                <span className="text-xs text-white/60">{sub}</span>
              </div>
            ))}
          </div>

          {/* Spotlight eventi stagionali */}
          {spotlight.length > 0 && (
            <div className="mt-8 space-y-5">

              {/* In corso */}
              {nowEvents.length > 0 && (
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 text-center flex items-center justify-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    In corso questo mese
                  </p>
                  <div className="space-y-2">
                    {nowEvents.map((ev, i) => (
                      <Link
                        key={i}
                        href={`/?start_date=${ev.prefill_start}&end_date=${ev.prefill_end}`}
                        className="flex items-center gap-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-red-300/30 rounded-xl px-4 py-3 transition-all"
                      >
                        <span className="text-2xl shrink-0">{countryFlag(ev.dest_country_code)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm leading-tight truncate">
                            {EVENT_ICONS[ev.event_type ?? ""] ?? "📅"} {ev.event_name}
                          </p>
                          <p className="text-white/60 text-xs mt-0.5 truncate">
                            {ev.dest_name} · {ev.dest_country}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-red-500 text-white">
                          In corso
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Prossimi */}
              {soonEvents.length > 0 && (
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2 text-center">
                    Prossimamente
                  </p>
                  <div className="space-y-2">
                    {soonEvents.map((ev, i) => (
                      <Link
                        key={i}
                        href={`/?start_date=${ev.prefill_start}&end_date=${ev.prefill_end}`}
                        className="flex items-center gap-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 transition-all"
                      >
                        <span className="text-2xl shrink-0">{countryFlag(ev.dest_country_code)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm leading-tight truncate">
                            {EVENT_ICONS[ev.event_type ?? ""] ?? "📅"} {ev.event_name}
                          </p>
                          <p className="text-white/60 text-xs mt-0.5 truncate">
                            {ev.dest_name} · {ev.dest_country}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-white/20 text-white">
                          {ev.timing_label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-white/40 text-xs text-center">
                Clicca un evento per pre-compilare le date nel form
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
