// L'oscilloscopio carica il circuito con 1 MΩ per canale. Le masse dei due canali sono collegate fra loro, come in
// uno strumento da banco vero: mettere le due masse su punti diversi li cortocircuita.
import type { Element } from './circuit.ts';
import { SCOPE, TRANSIENT } from './config.ts';
import { measurementWindow, simulate, waveformStats, type Sample } from './transient.ts';

export interface ScopeChannel { probe: string | null; ground: string | null; voltDiv: number; coupling: 'dc' | 'ac' }
export interface ScopeState { channels: [ScopeChannel, ScopeChannel]; timeDiv: number; triggerLevel: number; triggerChannel: 0 | 1 }
export function newScope(): ScopeState {
  const channel = (): ScopeChannel => ({ probe: null, ground: null, voltDiv: SCOPE.defaultVoltDiv, coupling: 'dc' });
  return { channels: [channel(), channel()], timeDiv: SCOPE.defaultTimeDiv, triggerLevel: 0, triggerChannel: 0 };
}
export function scopeElements(scope: ScopeState): Element[] {
  const ingressi: Element[] = scope.channels.flatMap((c, i) => c.probe && c.ground && c.probe !== c.ground ? [{ id: `O${i}.in`, kind: 'R' as const, a: c.probe, b: c.ground, ohm: SCOPE.inputOhm }] : []);
  const [g0, g1] = scope.channels.map(c => c.ground);
  return g0 && g1 && g0 !== g1 ? [...ingressi, { id: 'O.masse', kind: 'R', a: g0, b: g1, ohm: SCOPE.groundOhm }] : ingressi;
}
export const channelVoltage = (s: Sample, c: ScopeChannel): number => c.probe && c.ground ? (s.v[c.probe] ?? 0) - (s.v[c.ground] ?? 0) : 0;

/** Fronti interpolati: consentono di contare le divisioni di un periodo senza usare la frequenza del generatore. */
export function risingEdges(times: number[], values: number[], level: number): number[] {
  const edges: number[] = [];
  for (let i = 1; i < values.length; i++) if (values[i - 1] < level && values[i] >= level)
    edges.push(times[i - 1] + (times[i] - times[i - 1]) * (level - values[i - 1]) / (values[i] - values[i - 1]));
  return edges;
}

/**
 * La parte della registrazione che copre un numero intero di periodi: dal primo all'ultimo fronte di salita a metà
 * altezza. Media ed efficace calcolati lì non dipendono da dove cade la finestra. Senza due fronti: tutta.
 */
export function wholePeriods(times: number[], values: number[]): number[] {
  if (values.length < 3) return values;
  const mid = (Math.max(...values) + Math.min(...values)) / 2, edges = risingEdges(times, values, mid);
  if (edges.length < 2) return values;
  const a = edges[0], b = edges.at(-1)!;
  return values.filter((_, i) => times[i] > a && times[i] <= b);
}

/** Accoppiamento AC ideale: sottrae la media calcolata su un numero intero di periodi; non simula il condensatore d'ingresso reale. */
export function scopeFrame(samples: Sample[], scope: ScopeState) {
  const duration = scope.timeDiv * SCOPE.columns, times = samples.map(s => s.time);
  const raw = scope.channels.map(c => samples.map(s => channelVoltage(s, c)));
  const stats = raw.map(vs => { const full = waveformStats(vs), whole = waveformStats(wholePeriods(times, vs)); return { ...full, mean: whole.mean, rms: whole.rms, acRms: whole.acRms }; });
  const values = raw.map((vs, i) => vs.map(v => v - (scope.channels[i].coupling === 'ac' ? stats[i].mean : 0)));
  const edges = risingEdges(times, values[scope.triggerChannel], scope.triggerLevel);
  const end = times.at(-1) ?? 0;
  // Si sceglie l'ultimo fronte per cui esiste un'intera schermata; senza fronte si dichiara la corsa libera.
  const edge = edges.findLast(t => t + duration <= end);
  const start = edge ?? Math.max(times[0] ?? 0, end - duration);
  const traces = values.map((vs, c) => times.flatMap((t, i) => t >= start && t <= start + duration ? [{ x: (t - start) / scope.timeDiv, y: SCOPE.rows / 2 - vs[i] / scope.channels[c].voltDiv }] : []));
  const periods = raw.map((vs, i) => { const es = risingEdges(times, vs, stats[i].mean); return es.length >= 2 ? (es.at(-1)! - es[0]) / (es.length - 1) : null; });
  return { traces, stats, periods, triggered: edge !== undefined, start };
}

/** Acquisizione da fermo per le prove e la correzione: assestamento dichiarato, poi registrazione. */
export function captureScope(elements: Element[], scope: ScopeState, settle = TRANSIENT.settleSeconds) {
  const circuit = [...elements, ...scopeElements(scope)];
  const initial = simulate(circuit, settle).state;
  // almeno tre schermate e più di due periodi: così media ed efficace si calcolano su periodi interi
  const samples = simulate(circuit, Math.max(scope.timeDiv * SCOPE.columns * 3, 2.2 * measurementWindow(circuit)), initial).samples;
  return { samples, frame: scopeFrame(samples, scope) };
}

/** Un punto sullo schermo, in divisioni: x da 0 a 10 da sinistra, y da 0 a 8 dall'alto. */
export interface ScreenPoint { x: number; y: number }

/**
 * I cursori, come su uno strumento vero: due punti posati sullo schermo. Il canale dà la scala verticale: la tensione
 * di un punto è la sua distanza dalla riga centrale per V/div (con l'accoppiamento AC è riferita alla media). Il tempo
 * è la distanza orizzontale per tempo/div. Non legge il segnale: dice solo dove stanno i cursori.
 */
export function cursorReading(scope: ScopeState, channel: 0 | 1, a: ScreenPoint, b: ScreenPoint): { va: number; vb: number; dv: number; dt: number; hz: number | null } {
  const vd = scope.channels[channel].voltDiv, volt = (p: ScreenPoint): number => (SCOPE.rows / 2 - p.y) * vd;
  const dt = Math.abs(b.x - a.x) * scope.timeDiv;
  return { va: volt(a), vb: volt(b), dv: Math.abs(volt(a) - volt(b)), dt, hz: dt > 0 ? 1 / dt : null };
}
