"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchForm() {
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom]           = useState("");
  const [budget, setBudget]       = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [error, setError]         = useState("");

  function validate(): string | null {
    if (!from || from.length !== 3) return "Inserisci un codice aeroporto valido (es. MXP)";
    if (!budget || parseFloat(budget) < 100) return "Il budget minimo è €100";
    if (!startDate) return "Seleziona la data di partenza";
    if (!endDate) return "Seleziona la data di ritorno";
    if (new Date(endDate) <= new Date(startDate)) return "La data di ritorno deve essere dopo la partenza";
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");

    const params = new URLSearchParams({
      from:        from.toUpperCase(),
      budget,
      start_date:  startDate,
      end_date:    endDate,
    });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Aeroporto di partenza */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Aeroporto di partenza
        </label>
        <input
          type="text"
          placeholder="es. MXP, FCO, BGY"
          maxLength={3}
          value={from}
          onChange={(e) => setFrom(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Codice IATA a 3 lettere — cerca su <span className="font-medium">airportcodes.io</span>
        </p>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Budget totale (€)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
          <input
            type="number"
            min="100"
            step="50"
            placeholder="1200"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-7 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">Voli + hotel compresi</p>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Partenza</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ritorno</label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
      >
        Cerca destinazioni
      </button>
    </form>
  );
}
