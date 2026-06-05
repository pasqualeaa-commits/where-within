"use client";

import { useState, useEffect, useRef } from "react";
import { countryFlag } from "@/lib/utils";

interface Airport {
  iata_code: string;
  name: string;
  city: string | null;
  country_code: string | null;
}

interface Props {
  value: string;
  onChange: (iata: string) => void;
}

export default function AirportCombobox({ value, onChange }: Props) {
  const [inputValue, setInputValue]   = useState("");
  const [results, setResults]         = useState<Airport[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (inputValue.length < 2) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/airports/search?q=${encodeURIComponent(inputValue)}`);
        const data = await res.json();
        setResults(data.data ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [inputValue]);

  function select(airport: Airport) {
    onChange(airport.iata_code);
    setInputValue(`${airport.city ?? airport.name} (${airport.iata_code})`);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    if (value) onChange("");
  }

  const hasSelection = value.length === 3;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Es. Roma, Napoli, Milano…"
          autoComplete="off"
          className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            hasSelection
              ? "border-violet-400 bg-violet-50 focus:border-violet-500 focus:ring-violet-200"
              : "border-slate-300 bg-white focus:border-violet-500 focus:ring-violet-200"
          }`}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">…</span>
        )}
        {hasSelection && !loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 text-sm font-bold">
            {value}
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((airport) => (
            <li key={airport.iata_code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(airport); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 transition-colors"
              >
                <span className="text-lg shrink-0">
                  {airport.country_code ? countryFlag(airport.country_code) : "🌍"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900 text-sm">
                    {airport.city ?? airport.name}
                  </span>
                  {airport.city && (
                    <span className="text-slate-400 text-xs ml-1 truncate">{airport.name}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-bold tracking-widest text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  {airport.iata_code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && inputValue.length >= 2 && results.length === 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">
          Nessun aeroporto trovato
        </div>
      )}
    </div>
  );
}
