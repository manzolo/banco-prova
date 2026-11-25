// Il multimetro. Non «legge» i valori dei componenti: entra nel circuito come un pezzo in più (10 MΩ da voltmetro, uno
// shunt da amperometro, un generatore debole da ohmetro) e mostra quello che ne risulta. Così gli errori veri hanno le
// conseguenze vere: il puntale nella boccola sbagliata fa un cortocircuito, la misura in ohm su un circuito acceso non
// vale, un voltmetro su un punto ad alta resistenza legge meno.
import { METER, TRANSIENT } from './config.ts';
import { solve, type Element, type Solution } from './circuit.ts';

import { measurementWindow, simulate, waveformStats } from './transient.ts';

export type Dial = 'off' | 'vdc' | 'vac' | 'ohm' | 'cont' | 'diode' | 'cap' | 'ma' | 'a';
export type Jack = 'v' | 'ma' | 'a';
export interface MeterState { dial: Dial; jack: Jack; fuseMaBlown: boolean; fuseABlown: boolean }
export interface Probes { red: string | null; black: string | null }
export type Note = 'ok' | 'open' | 'jack' | 'live' | 'fuse' | 'fuseBlown' | 'leak' | 'reverse' | 'short';
export interface Reading {
  display: string; unit: string; value: number;     // value: nell'unità di base (V, Ω, A, F); NaN se il display non mostra un numero
  beep: boolean; note: Note;
  blew: Jack | null;                                // un fusibile è saltato in questa misura
  solution: Solution;                               // il circuito com'è con il multimetro attaccato
}
export const NEW_METER: MeterState = { dial: 'off', jack: 'v', fuseMaBlown: false, fuseABlown: false };

const comma = (n: number, d: number): string => n.toFixed(d).replace('.', ',').replace('-', '−');
/** Scrive un numero come un display a 4000 punti: quattro cifre, la virgola dove serve. */
function scale(value: number, steps: [number, number, number, string][]): { display: string; unit: string } | null {
  const a = Math.abs(value);
  for (const [max, div, dec, unit] of steps) if (a < max) return { display: comma(value / div, dec), unit };
  return null;
}
export function formatVolt(v: number): { display: string; unit: string } {
  return scale(v, [[0.4, 1e-3, 1, 'mV'], [4, 1, 3, 'V'], [40, 1, 2, 'V'], [400, 1, 1, 'V']]) ?? { display: 'OL', unit: 'V' };
}
export function formatOhm(r: number): { display: string; unit: string } {
  if (!(r < METER.ohmsMax)) return { display: 'OL', unit: 'MΩ' };
  return scale(r, [[400, 1, 1, 'Ω'], [4e3, 1e3, 3, 'kΩ'], [4e4, 1e3, 2, 'kΩ'], [4e5, 1e3, 1, 'kΩ'], [4e6, 1e6, 3, 'MΩ'], [4e7, 1e6, 2, 'MΩ']])!;
}
export function formatAmp(i: number, jack: 'ma' | 'a'): { display: string; unit: string } {
  return jack === 'ma' ? scale(i, [[0.04, 1e-3, 2, 'mA'], [0.4, 1e-3, 1, 'mA']]) ?? { display: 'OL', unit: 'mA' } : scale(i, [[4, 1, 3, 'A'], [40, 1, 2, 'A']]) ?? { display: 'OL', unit: 'A' };
}
export function formatFarad(c: number): { display: string; unit: string } {
  return scale(c, [[4e-9, 1e-9, 3, 'nF'], [4e-8, 1e-9, 2, 'nF'], [4e-7, 1e-9, 1, 'nF'], [4e-6, 1e-6, 3, 'µF'], [4e-5, 1e-6, 2, 'µF'], [4e-4, 1e-6, 1, 'µF'], [4e-3, 1e-6, 0, 'µF'], [4e-2, 1e-3, 2, 'mF']]) ?? { display: 'OL', unit: 'mF' };
}

/** Gli elementi che il multimetro aggiunge al circuito, secondo selettore, boccola e fusibili. */
export function meterElements(m: MeterState, p: Probes): Element[] {
  if (!p.red || !p.black || p.red === p.black) return [];
  if (m.jack === 'ma') return m.fuseMaBlown ? [] : [{ id: 'M.shunt', kind: 'R', a: p.red, b: p.black, ohm: METER.shuntMaOhm }];
  if (m.jack === 'a') return m.fuseABlown ? [] : [{ id: 'M.shunt', kind: 'R', a: p.red, b: p.black, ohm: METER.shuntAOhm }];
  if (m.dial === 'vdc' || m.dial === 'vac') return [{ id: 'M.in', kind: 'R', a: p.red, b: p.black, ohm: METER.inputOhm }];
  if (m.dial === 'ohm' || m.dial === 'cont') return [{ id: 'M.src', kind: 'V', a: p.red, b: p.black, volt: METER.ohmsVolt, rs: METER.ohmsSeriesOhm }];
  if (m.dial === 'diode') return [{ id: 'M.src', kind: 'V', a: p.red, b: p.black, volt: METER.diodeVolt, rs: METER.diodeSeriesOhm }];
  return [];
}

/**
 * Una lettura. «scene» è il circuito sul banco; «capV» la tensione dei condensatori in questo momento; «dt», se c'è,
 * fa passare quel tempo (i condensatori si caricano attraverso il multimetro: la lettura in ohm sale da sola).
 */
export function read(scene: Element[], m: MeterState, p: Probes, o: { capV?: Record<string, number>; dt?: number; time?: number; solution?: Solution; values?: number[] } = {}): Reading {
  const con = meterElements(m, p), opts = { capV: o.capV, dt: o.dt, time: o.time, ground: p.black ?? undefined };
  const sol = o.solution ?? solve([...scene, ...con], opts);
  const between = (s: Solution): number => p.red && p.black ? (s.v[p.red] ?? 0) - (s.v[p.black] ?? 0) : 0;
  const out = (f: { display: string; unit: string }, value: number, note: Note = 'ok', extra: Partial<Reading> = {}): Reading => ({ ...f, value, beep: false, note, blew: null, solution: sol, ...extra });
  const attaccato = Boolean(p.red && p.black);
  if (m.dial === 'off') return out({ display: '', unit: '' }, NaN);
  // --- puntale rosso in una boccola di corrente: fra i puntali c'è uno shunt, qualunque cosa dica il selettore
  if (m.jack !== 'v') {
    const blown = m.jack === 'ma' ? m.fuseMaBlown : m.fuseABlown, i = con.length ? sol.current('M.shunt') : 0;
    const limit = m.jack === 'ma' ? METER.fuseMaAmp : METER.fuseAAmp;
    if (Math.abs(i) > limit) {
      const dopo = { ...m, fuseMaBlown: m.fuseMaBlown || m.jack === 'ma', fuseABlown: m.fuseABlown || m.jack === 'a' };
      const r = read(scene, dopo, p, { ...o, solution: undefined, values: undefined });
      return { ...r, note: 'fuse', blew: m.jack };
    }
    if (m.dial === m.jack) return out(formatAmp(blown ? 0 : i, m.jack), blown ? 0 : i, blown ? 'fuseBlown' : attaccato ? 'ok' : 'open');
    if (m.dial === 'ma' || m.dial === 'a') return out(formatAmp(0, m.dial), 0, 'jack');
    if (m.dial === 'vdc' || m.dial === 'vac') return out(formatVolt(0), 0, 'jack');
    if (m.dial === 'cap') return out(formatFarad(0), 0, 'jack');
    return out({ display: 'OL', unit: m.dial === 'diode' ? 'V' : 'Ω' }, NaN, 'jack');
  }
  // --- puntale rosso nella boccola VΩ
  if (m.dial === 'ma' || m.dial === 'a') return out(formatAmp(0, m.dial), 0, 'jack');       // lo shunt non è collegato: il circuito resta aperto
  if (m.dial === 'vdc' || m.dial === 'vac') {
    let values = o.values;
    // In presenza di alternata si misura la forma d'onda caricata dal voltmetro, anche dopo un raddrizzatore.
    if (!values && scene.some(e => e.kind === 'V' && e.ac)) {
      const circuit = [...scene, ...con], initial = simulate(circuit, TRANSIENT.settleSeconds).state;
      values = simulate(circuit, measurementWindow(circuit), initial).samples.map(s => between({ ...sol, v: s.v }));
    }
    const stats = waveformStats(values ?? [between(sol)]);
    const v = m.dial === 'vac' ? stats.acRms : stats.mean;
    return out(formatVolt(v), v, attaccato ? 'ok' : 'open');
  }
  if (!attaccato) return out(m.dial === 'cap' ? formatFarad(0) : { display: 'OL', unit: m.dial === 'diode' ? 'V' : 'MΩ' }, m.dial === 'cap' ? 0 : NaN, 'open');
  // tensione che c'era già fra i puntali, senza il multimetro: se c'è, ohm, continuità e capacità non valgono
  const acceso = scene.some(e => e.kind === 'V' && e.ac && e.volt !== 0) || Math.abs(between(solve([...scene, { id: 'M.in', kind: 'R', a: p.red!, b: p.black!, ohm: METER.inputOhm }], { ground: p.black! }))) > METER.liveOhmsVolt;   // senza memoria dei condensatori: la carica lasciata dall'ohmetro stesso non è «circuito acceso»
  if (m.dial === 'ohm' || m.dial === 'cont') {
    const v = between(sol), i = sol.current('M.src'), r = p.red === p.black ? 0 : i > 1e-13 ? v / i : Infinity;
    if (m.dial === 'ohm') return out(r < 0 ? { display: comma(r, 1), unit: 'Ω' } : formatOhm(r), r, acceso ? 'live' : 'ok');
    const suona = !acceso && r < METER.continuityBeepOhm;
    return out(r >= 0 && r < METER.continuityMaxOhm ? { display: comma(r, 1), unit: 'Ω' } : { display: 'OL', unit: 'Ω' }, r, acceso ? 'live' : 'ok', { beep: suona });
  }
  if (m.dial === 'diode') {
    const v = p.red === p.black ? 0 : between(sol);
    if (acceso) return out(v < METER.diodeMaxVolt && v > -METER.diodeMaxVolt ? { display: comma(v, 3), unit: 'V' } : { display: 'OL', unit: 'V' }, v, 'live');
    if (v >= METER.diodeMaxVolt) return out({ display: 'OL', unit: 'V' }, NaN, 'reverse');
    return out({ display: comma(v, 3), unit: 'V' }, v, v < 0.05 ? 'short' : 'ok', { beep: v < 0.05 });
  }
  // capacità: la somma dei condensatori messi proprio fra i due puntali, se non c'è una via in continua che li scarica
  const perdita = solve([...scene, { id: 'M.src', kind: 'V', a: p.red!, b: p.black!, volt: METER.ohmsVolt, rs: METER.ohmsSeriesOhm }], { ground: p.black! });
  const iPerdita = perdita.current('M.src'), rPerdita = iPerdita > 1e-13 ? between(perdita) / iPerdita : Infinity;
  if (acceso) return out({ display: 'OL', unit: 'µF' }, NaN, 'live');
  if (rPerdita < METER.capMinLeakOhm) return out({ display: 'OL', unit: 'µF' }, NaN, 'leak');
  const c = scene.filter(e => e.kind === 'C' && ((e.a === p.red && e.b === p.black) || (e.a === p.black && e.b === p.red))).reduce((s, e) => s + (e.kind === 'C' ? e.farad : 0), 0);
  return out(formatFarad(c), c);
}
