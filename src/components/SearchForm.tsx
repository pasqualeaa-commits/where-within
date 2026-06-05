"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AirportCombobox from "./AirportCombobox";

interface Props {
  prefill?: { start_date?: string; end_date?: string; from?: string };
}

export default function SearchForm({ prefill }: Props) {
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom]           = useState(prefill?.from       ?? "");
  const [budget, setBudget]       = useState("");
  const [startDate, setStartDate] = useState(prefill?.start_date ?? "");
  const [endDate, setEndDate]     = useState(prefill?.end_date   ?? "");
  const [error, setError]         = useState("");

  function validate(): string | null {
    if (!from || from.length !== 3) return "Seleziona un aeroporto di partenza dalla lista";
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

    const params = new URLSearchParams({ from, budget, start_date: startDate, end_date: endDate });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">

      {/* Aeroporto di partenza */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Aeroporto di partenza
        </label>
        <AirportCombobox value={from} onChange={setFrom} />
        <p className="mt-1.5 text-xs text-slate-500">
          Cerca per città o nome aeroporto · ogni destinazione mostrerà se il volo è diretto o con scalo
        </p>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Budget totale (€)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">€</span>
          <input
            type="number"
            min="100"
            step="50"
            placeholder="1200"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Voli A/R + hotel compresi</p>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Partenza</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Ritorno</label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.99] transition-all"
      >
        Cerca destinazioni →
      </button>
    </form>
  );
}
