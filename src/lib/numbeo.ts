// Utility di conversione degli indici Numbeo in punteggi 0-10 usati dall'app.
// I dati provengono dai CSV gratuiti scaricabili da numbeo.com (vedi seed-numbeo.ts).

export interface NumbeoScores {
  score_overall: number;        // 0-10
  score_cost_of_living: number; // 0-10, alto = economica
  score_safety: number;         // 0-10
  score_healthcare: number;     // 0-10
}

export function qolIndexToScore(qolIndex: number): number {
  // quality_of_life_index: NYC ≈ 150, Zurigo ≈ 180, Lagos ≈ 80 → normalizza su 200
  return round10(Math.min(10, qolIndex / 20));
}

export function colIndexToScore(colIndex: number): number {
  // cost_of_living_index: più alto = più cara. Invertiamo: punteggio alto = economica.
  // NYC ≈ 100 → score ~3, Tbilisi ≈ 30 → score ~8
  return round10(Math.max(0, Math.min(10, (150 - colIndex) / 15)));
}

export function safetyIndexToScore(safetyIndex: number): number {
  return round10(Math.min(10, safetyIndex / 10));
}

export function healthIndexToScore(healthIndex: number): number {
  return round10(Math.min(10, healthIndex / 10));
}

function round10(v: number): number {
  return Math.round(v * 10) / 10;
}
