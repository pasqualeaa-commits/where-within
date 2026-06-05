import Link from "next/link";
import { searchDestinations } from "@/lib/search";
import DestinationCard from "@/components/DestinationCard";
import { MONTH_NAMES } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    budget?: string;
    start_date?: string;
    end_date?: string;
    booking_date?: string;
  }>;
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { from, budget, start_date, end_date, booking_date } = params;

  // Parametri mancanti → redirect silenzioso alla home
  if (!from || !budget || !start_date || !end_date) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-500">Parametri di ricerca mancanti.</p>
          <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">
            ← Torna alla ricerca
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(start_date);
  const endDate   = new Date(end_date);
  const nights    = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  const month     = MONTH_NAMES[startDate.getMonth()];

  const result = await searchDestinations({
    fromIata:    from,
    budgetEur:   parseFloat(budget),
    startDate,
    endDate,
    bookingDate: booking_date ? new Date(booking_date) : new Date(),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold">
            <span className="text-xl">🌍</span>
            <span className="tracking-tight">WhereWithin</span>
          </Link>
          <Link
            href={`/?from=${from}&budget=${budget}&start_date=${start_date}&end_date=${end_date}`}
            className="text-sm text-white/80 font-medium hover:text-white transition-colors"
          >
            ← Modifica ricerca
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Riepilogo ricerca */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {result.meta.total_found > 0
              ? `${result.meta.total_found} destinazioni trovate`
              : "Nessuna destinazione trovata"}
          </h1>
          <p className="text-slate-500 text-sm">
            Da <strong>{from.toUpperCase()}</strong> · {" "}
            {startDate.toLocaleDateString("it-IT")} → {endDate.toLocaleDateString("it-IT")} · {" "}
            {nights} notti in <strong>{month}</strong> · {" "}
            Budget <strong>€{parseFloat(budget).toLocaleString("it-IT")}</strong> · {" "}
            {result.meta.days_until_flight > 0
              ? `prenotazione con ${result.meta.days_until_flight} giorni di anticipo`
              : "partenza imminente"}
          </p>
        </div>

        {result.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6 text-sm text-red-700">
            {result.error}
          </div>
        )}

        {result.data.length === 0 && !result.error && (
          <div className="rounded-2xl bg-white border border-slate-100 p-10 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-600 font-medium mb-1">Nessuna destinazione nel budget</p>
            <p className="text-slate-400 text-sm mb-4">
              Prova ad aumentare il budget, allontanare le date o scegliere un periodo diverso.
            </p>
            <Link href="/" className="text-indigo-600 text-sm font-medium hover:underline">
              ← Modifica la ricerca
            </Link>
          </div>
        )}

        {/* Griglia risultati */}
        {result.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.data.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  result={dest}
                  nights={nights}
                  searchContext={{ from, budget, start_date, end_date }}
                />
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-400 text-center">
              I prezzi sono stime basate su medie storiche — non prezzi in tempo reale.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
