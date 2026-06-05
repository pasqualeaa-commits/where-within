export function formatEur(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Converte codice ISO 3166-1 alpha-2 in emoji bandiera (es. "IT" → "🇮🇹")
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return [...code.toUpperCase()]
    .map((ch) => String.fromCodePoint(0x1f1e6 - 65 + ch.charCodeAt(0)))
    .join("");
}

export const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

// Colore score: da blu scuro (basso) a verde (alto)
export function scoreColor(score: number): string {
  if (score >= 0.70) return "bg-emerald-500";
  if (score >= 0.50) return "bg-blue-500";
  if (score >= 0.35) return "bg-amber-500";
  return "bg-slate-400";
}
