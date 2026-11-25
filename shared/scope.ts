// L'oscilloscopio carica il circuito con 1 MΩ per canale, fra sonda e massa locale isolata.
import type { Element } from './circuit.ts';
import { SCOPE, TRANSIENT } from './config.ts';
import { simulate, waveformStats, type Sample } from './transient.ts';

export interface ScopeChannel { probe: string | null; ground: string | null; voltDiv: number; coupling: 'dc' | 'ac' }
export interface ScopeState { channels: [ScopeChannel, ScopeChannel]; timeDiv: number; triggerLevel: number; triggerChannel: 0 | 1 }
export function newScope(): ScopeState {
  const channel = (): ScopeChannel => ({ probe: null, ground: null, voltDiv: SCOPE.defaultVoltDiv, coupling: 'dc' });
  return { channels: [channel(), channel()], timeDiv: SCOPE.defaultTimeDiv, triggerLevel: 0, triggerChannel: 0 };
}
export function scopeElements(scope: ScopeState): Element[] {
  return scope.channels.flatMap((c, i) => c.probe && c.ground && c.probe !== c.ground ? [{ id: `O${i}.in`, kind: 'R' as const, a: c.probe, b: c.ground, ohm: SCOPE.inputOhm }] : []);
}
export const channelVoltage = (s: Sample, c: ScopeChannel): number => c.probe && c.ground ? (s.v[c.probe] ?? 0) - (s.v[c.ground] ?? 0) : 0;

/** Fronti interpolati: consentono di contare le divisioni di un periodo senza usare la frequenza del generatore. */
export function risingEdges(times: number[], values: number[], level: number): number[] {
  const edges: number[] = [];
  for (let i = 1; i < values.length; i++) if (values[i - 1] < level && values[i] >= level)
    edges.push(times[i - 1] + (times[i] - times[i - 1]) * (level - values[i - 1]) / (values[i] - values[i - 1]));
  return edges;
}

/** Accoppiamento AC ideale: sottrae la media della registrazione; non simula il condensatore d'ingresso reale. */
export function scopeFrame(samples: Sample[], scope: ScopeState) {
  const duration = scope.timeDiv * SCOPE.columns, times = samples.map(s => s.time);
  const raw = scope.channels.map(c => samples.map(s => channelVoltage(s, c)));
  const stats = raw.map(waveformStats);
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
  const samples = simulate(circuit, scope.timeDiv * SCOPE.columns * 3, initial).samples;
  return { samples, frame: scopeFrame(samples, scope) };
}
