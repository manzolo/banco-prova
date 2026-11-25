// Il tempo è un dato passato dal chiamante: nessun orologio, nessuna casualità.
import { solve, type Element, type Solution } from './circuit.ts';
import { TRANSIENT } from './config.ts';

export interface Sample { time: number; v: Record<string, number> }
export interface TransientState { time: number; capV: Record<string, number>; v: Record<string, number> }
export const NEW_TRANSIENT: TransientState = { time: 0, capV: {}, v: {} };

/** Finestra del multimetro: un periodo della sorgente più lenta; con sola continua, 20 ms. */
export function measurementWindow(elements: Element[]): number {
  const frequencies = elements.flatMap(e => e.kind === 'V' && e.ac ? [e.hz ?? TRANSIENT.defaultHz] : []);
  return frequencies.length ? 1 / Math.min(...frequencies) : TRANSIENT.measurementSeconds;
}

export function timeStep(elements: Element[]): number {
  const hz = Math.max(TRANSIENT.defaultHz, ...elements.filter(e => e.kind === 'V' && e.ac).map(e => e.kind === 'V' ? e.hz ?? TRANSIENT.defaultHz : 0));
  return Math.min(TRANSIENT.maxStep, 1 / (hz * TRANSIENT.samplesPerPeriod));
}

/** Eulero all'indietro: il passo usa la sorgente all'istante finale e la carica lasciata dal passo precedente. */
export function transientStep(elements: Element[], state: TransientState, dt: number): { state: TransientState; solution: Solution } {
  if (!(dt > 0) || !Number.isFinite(dt)) throw new Error('Il passo deve essere positivo e finito');
  const time = state.time + dt;
  const solution = solve(elements, { time, dt, capV: state.capV, initialV: state.v });
  if (!solution.converged) throw new Error('Il circuito non converge: ridurre il passo o semplificare il circuito');
  return { state: { time, capV: solution.capV, v: solution.v }, solution };
}

/** Una registrazione ripetibile; la memoria iniziale permette di proseguire senza scaricare i condensatori. */
export function simulate(elements: Element[], duration: number, initial: TransientState = NEW_TRANSIENT, step = timeStep(elements)): { state: TransientState; samples: Sample[] } {
  const count = Math.ceil(duration / step), dt = duration / count, samples: Sample[] = [];
  let state = initial;
  for (let i = 0; i < count; i++) { state = transientStep(elements, state, dt).state; samples.push({ time: state.time, v: state.v }); }
  return { state, samples };
}

/** Tutte le statistiche vengono dai campioni risolti, mai dai valori nominali dei componenti. */
export function waveformStats(values: number[]): { min: number; max: number; mean: number; rms: number; acRms: number; ripple: number } {
  if (!values.length) return { min: 0, max: 0, mean: 0, rms: 0, acRms: 0, ripple: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const rms = Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
  const acRms = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  const min = values.reduce((a, b) => Math.min(a, b)), max = values.reduce((a, b) => Math.max(a, b));
  return { min, max, mean, rms, acRms, ripple: max - min };
}
