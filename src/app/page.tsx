import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌍</span>
          <span className="font-bold text-slate-900 text-lg tracking-tight">WhereWithin</span>
        </div>
      </header>

      {/* Hero + Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
              Dove vuoi andare?
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Inserisci il tuo budget e le date: ti suggeriamo le destinazioni migliori
              con stime di volo, hotel e clima.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <SearchForm />
          </div>

          {/* Come funziona */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "✈️", label: "Volo stimato", sub: "in base a distanza e anticipo" },
              { icon: "🏨", label: "Hotel incluso", sub: "costo medio per notte" },
              { icon: "🌡️", label: "Clima del periodo", sub: "medie storiche reali" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
                <span className="text-xs text-slate-400">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
