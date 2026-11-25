// I componenti del banco: ognuno sa che cosa porta stampato addosso (bande, sigla, codice), quali piedini ha e come si
// comporta elettricamente, guasti compresi. Il banco li mette in scena; il risolutore vede solo gli elementi.
import { BAND_COLORS, GENERATOR, TRANSFORMER, TRANSIENT, BJT, DIODES, TOLERANCE_COLORS, WIRE_OHM, type DiodeModel } from './config.ts';
import type { Element } from './circuit.ts';

export type PartType = 'resistor' | 'capacitor' | 'inductor' | 'diode' | 'zener' | 'led' | 'bjt' | 'fuse' | 'battery' | 'pot' | 'switch' | 'transformer' | 'generator' | 'bridge';
export interface Part {
  id: string; type: PartType;
  mark: string;                 // quello che c'è scritto o disegnato sul componente
  pads: string[];               // i nodi dei piedini, nell'ordine in cui si vedono da sinistra a destra
  elements: Element[];
  view: Record<string, string | number | boolean | string[]>;     // ciò che serve a disegnarlo
  truth: Record<string, string | number | boolean>;               // la verità, per chi corregge gli esercizi
}
const OPEN_OHM = 1e12;
const pads = (id: string, n: number): string[] => Array.from({ length: n }, (_, i) => `${id}.${i + 1}`);

// ---------------------------------------------------------------- codici

/** Le bande di una resistenza a quattro bande: due cifre, moltiplicatore, tolleranza. Vale da 0,1 Ω a 99 MΩ. */
export function resistorBands(ohm: number, tolPct: number): string[] {
  let exp = Math.floor(Math.log10(ohm)) - 1, digits = Math.round(ohm / 10 ** exp);
  if (digits >= 100) { digits = Math.round(digits / 10); exp++; }
  const mult = exp >= 0 ? BAND_COLORS[exp] : exp === -1 ? 'oro' : 'argento';
  return [BAND_COLORS[Math.floor(digits / 10)], BAND_COLORS[digits % 10], mult, TOLERANCE_COLORS[tolPct] ?? 'oro'];
}

/** Dalle bande al valore: il contrario. */
export function decodeBands(bands: string[]): { ohm: number; tolPct: number } {
  const cifra = (c: string): number => (BAND_COLORS as readonly string[]).indexOf(c);
  const exp = bands[2] === 'oro' ? -1 : bands[2] === 'argento' ? -2 : cifra(bands[2]);
  const tol = Number(Object.entries(TOLERANCE_COLORS).find(([, c]) => c === bands[3])?.[0] ?? 20);
  return { ohm: (cifra(bands[0]) * 10 + cifra(bands[1])) * 10 ** exp, tolPct: tol };
}

/** Il codice a tre cifre dei condensatori ceramici: due cifre e il numero di zeri, in picofarad (104 = 100 000 pF = 100 nF). */
export function capacitorCode(farad: number): string {
  const pf = farad * 1e12;
  if (pf < 10) return `${Math.round(pf)}`;
  let exp = Math.floor(Math.log10(pf)) - 1, digits = Math.round(pf / 10 ** exp);
  if (digits >= 100) { digits = Math.round(digits / 10); exp++; }
  return `${digits}${exp}`;
}
export function decodeCapacitorCode(code: string): number {
  return code.length < 3 ? Number(code) * 1e-12 : Number(code.slice(0, 2)) * 10 ** Number(code[2]) * 1e-12;
}

/** Un valore scritto come si scrive al banco: 4,7 kΩ, 100 nF, 2,2 mH. */
export function si(value: number, unit: string): string {
  if (value === 0) return `0 ${unit}`;
  const scale: [number, string][] = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  const [f, p] = scale.find(([s]) => Math.abs(value) >= s * 0.9999) ?? scale[scale.length - 1];
  return `${String(Number((value / f).toPrecision(3))).replace('.', ',')} ${p}${unit}`;
}

// ---------------------------------------------------------------- componenti

export type ResistorFault = 'open' | 'drift';
/** Resistenza. «factor» è quanto il pezzo vero si scosta dal nominale (dentro la tolleranza, se è buono). */
export function resistor(id: string, ohm: number, tolPct = 5, o: { factor?: number; fault?: ResistorFault } = {}): Part {
  const real = o.fault === 'open' ? OPEN_OHM : ohm * (o.fault === 'drift' ? 1.38 : o.factor ?? 1), p = pads(id, 2);
  return { id, type: 'resistor', mark: resistorBands(ohm, tolPct).join(' · '), pads: p, elements: [{ id: `${id}.r`, kind: 'R', a: p[0], b: p[1], ohm: real }],
    view: { bands: resistorBands(ohm, tolPct) }, truth: { ohm, tolPct, real, fault: o.fault ?? 'none', inTolerance: Math.abs(real - ohm) <= ohm * tolPct / 100 } };
}

export type CapacitorFault = 'short' | 'leak' | 'open' | 'dry';
/** Condensatore: ceramico (col codice a tre cifre) o elettrolitico (col valore scritto e il segno del negativo). */
export function capacitor(id: string, farad: number, kind: 'ceramic' | 'electrolytic', o: { factor?: number; fault?: CapacitorFault } = {}): Part {
  const p = pads(id, 2), real = o.fault === 'open' ? 1e-12 : farad * (o.fault === 'dry' ? 0.3 : o.factor ?? 1);
  const elements: Element[] = [{ id: `${id}.c`, kind: 'C', a: p[0], b: p[1], farad: real }];
  if (o.fault === 'short') elements.push({ id: `${id}.sc`, kind: 'R', a: p[0], b: p[1], ohm: 0.4 });
  if (o.fault === 'leak') elements.push({ id: `${id}.lk`, kind: 'R', a: p[0], b: p[1], ohm: 18000 });
  return { id, type: 'capacitor', mark: kind === 'ceramic' ? capacitorCode(farad) : `${si(farad, 'F')} 25 V`, pads: p, elements,
    view: { kind }, truth: { farad, real, fault: o.fault ?? 'none', kind } };
}

/** Bobina: in continua è solo il suo filo, cioè pochi ohm. Interrotta, è un circuito aperto. */
export function inductor(id: string, henry: number, wireOhm: number, o: { fault?: 'open' } = {}): Part {
  const p = pads(id, 2);
  return { id, type: 'inductor', mark: si(henry, 'H'), pads: p, elements: [{ id: `${id}.r`, kind: 'R', a: p[0], b: p[1], ohm: o.fault === 'open' ? OPEN_OHM : wireOhm }],
    view: {}, truth: { henry, wireOhm, fault: o.fault ?? 'none' } };
}

export type DiodeFault = 'open' | 'short';
/** Diodo, LED o zener. «flipped» lo mette col catodo a sinistra. Sul corpo la fascia (o il lato piatto del LED) segna il catodo. */
export function diode(id: string, model: DiodeModel, o: { flipped?: boolean; fault?: DiodeFault; zenerVolt?: number; unmarked?: boolean } = {}): Part {
  const p = pads(id, 2), m = DIODES[model], anode = o.flipped ? p[1] : p[0], cathode = o.flipped ? p[0] : p[1], mid = `${id}.m`;
  const elements: Element[] = o.fault === 'open' ? [{ id: `${id}.r`, kind: 'R', a: anode, b: cathode, ohm: OPEN_OHM }]
    : o.fault === 'short' ? [{ id: `${id}.r`, kind: 'R', a: anode, b: cathode, ohm: 0.3 }]
    : [{ id: `${id}.d`, kind: 'D', a: anode, b: mid, is: o.zenerVolt ? 1e-12 : m.is, n: o.zenerVolt ? 1.2 : m.n, ...(o.zenerVolt ? { zener: o.zenerVolt } : {}) }, { id: `${id}.rs`, kind: 'R', a: mid, b: cathode, ohm: o.zenerVolt ? 2 : m.rs }];
  const type: PartType = o.zenerVolt ? 'zener' : model.startsWith('led') ? 'led' : 'diode';
  return { id, type, mark: o.zenerVolt ? `zener ${String(o.zenerVolt).replace('.', ',')} V` : m.name, pads: p, elements,
    view: { cathodeRight: !o.flipped, unmarked: Boolean(o.unmarked), color: model.startsWith('led-') ? model.slice(4) : '' },
    truth: { model, cathodePad: o.flipped ? 1 : 2, fault: o.fault ?? 'none', zenerVolt: o.zenerVolt ?? 0 } };
}

/** Transistor bipolare, visto col multimetro: due giunzioni che partono dalla base. «pins» dice quale piedino è cosa, da sinistra (per esempio «EBC»). */
export function bjt(id: string, polarity: 'npn' | 'pnp', pins: string, o: { fault?: 'be-open' | 'ce-short' } = {}): Part {
  const p = pads(id, 3), node = (l: string): string => p[pins.indexOf(l)], b = node('B'), e = node('E'), c = node('C');
  const giunzione = (nome: string, altro: string, j: { is: number; n: number; rs: number }): Element[] => {
    const mid = `${id}.${nome}m`, [a, k] = polarity === 'npn' ? [b, altro] : [altro, b];
    return [{ id: `${id}.${nome}`, kind: 'D', a, b: mid, is: j.is, n: j.n }, { id: `${id}.${nome}rs`, kind: 'R', a: mid, b: k, ohm: j.rs }];
  };
  const elements: Element[] = [...(o.fault === 'be-open' ? [] : giunzione('be', e, BJT.be)), ...giunzione('bc', c, BJT.bc)];
  if (o.fault === 'ce-short') elements.push({ id: `${id}.ce`, kind: 'R', a: c, b: e, ohm: 0.5 });
  return { id, type: 'bjt', mark: polarity === 'npn' ? 'BC547' : 'BC557', pads: p, elements, view: {}, truth: { polarity, pins, basePad: pins.indexOf('B') + 1, fault: o.fault ?? 'none' } };
}

export function fuse(id: string, blown: boolean): Part {
  const p = pads(id, 2);
  return { id, type: 'fuse', mark: 'F 2 A', pads: p, elements: [{ id: `${id}.r`, kind: 'R', a: p[0], b: p[1], ohm: blown ? OPEN_OHM : 0.05 }], view: { blown }, truth: { blown } };
}

/** Pila. Scaricandosi cala poco la tensione a vuoto e cresce molto la resistenza interna: per questo va provata sotto carico. Il primo piedino è il +. */
export function battery(id: string, kind: '9v' | 'aa', charge: number): Part {
  const p = pads(id, 2), c = Math.min(1, Math.max(0, charge));
  const volt = kind === '9v' ? 7.4 + 2.2 * c : 1.2 + 0.4 * c, rs = kind === '9v' ? 2 + 60 * (1 - c) ** 2 : 0.15 + 4 * (1 - c) ** 2;
  return { id, type: 'battery', mark: kind === '9v' ? 'pila 9 V' : 'stilo 1,5 V', pads: p, elements: [{ id: `${id}.v`, kind: 'V', a: p[0], b: p[1], volt, rs }], view: { kind }, truth: { kind, charge: c, volt, rs } };
}

/** Potenziometro: tre piedini, il cursore in mezzo. «position» va da 0 (cursore tutto verso il primo piedino) a 1. */
export function pot(id: string, ohm: number, position: number): Part {
  const p = pads(id, 3), x = Math.min(1, Math.max(0, position));
  return { id, type: 'pot', mark: `${si(ohm, 'Ω')} lineare`, pads: p,
    elements: [{ id: `${id}.a`, kind: 'R', a: p[0], b: p[1], ohm: Math.max(ohm * x, 0.5) }, { id: `${id}.b`, kind: 'R', a: p[1], b: p[2], ohm: Math.max(ohm * (1 - x), 0.5) }], view: { position: x }, truth: { ohm, position: x } };
}

export function toggle(id: string, closed: boolean): Part {
  const p = pads(id, 2);
  return { id, type: 'switch', mark: 'interruttore', pads: p, elements: [{ id: `${id}.r`, kind: 'R', a: p[0], b: p[1], ohm: closed ? 0.02 : OPEN_OHM }], view: { closed }, truth: { closed } };
}

/**
 * Il secondario di un trasformatore da rete. Sulla targa c'è la tensione a pieno carico; a vuoto ne dà il 12% in più, e
 * la differenza cade sulla resistenza del filo quando si tira la corrente di targa (regola, valori tipici dei piccoli).
 */
export function transformer(id: string, voltRms: number): Part {
  const p = pads(id, 2), open = voltRms * TRANSFORMER.openFactor, rs = (open - voltRms) / TRANSFORMER.ratedAmp;
  return { id, type: 'transformer', mark: `secondario ${voltRms} V~`, pads: p, elements: [{ id: `${id}.v`, kind: 'V', a: p[0], b: p[1], volt: open, rs, ac: true, hz: TRANSIENT.defaultHz, wave: 'sine' }], view: {}, truth: { voltRms, openRms: open, rs } };
}

/** Generatore di funzioni da banco: tensione efficace, frequenza e forma d'onda regolate, uscita da 50 Ω. */
export function generator(id: string, voltRms: number, hz: number, wave: 'sine' | 'square' = 'sine'): Part {
  const p = pads(id, 2);
  return { id, type: 'generator', mark: 'generatore di funzioni', pads: p, elements: [{ id: `${id}.v`, kind: 'V', a: p[0], b: p[1], volt: voltRms, rs: GENERATOR.outputOhm, ac: true, hz, wave }], view: { wave }, truth: { voltRms, hz, wave } };
}

/** Un filo fra due nodi. */
export const wire = (id: string, a: string, b: string): Element => ({ id, kind: 'R', a, b, ohm: WIRE_OHM });

/** Ponte: due diodi conducono per semiperiodo. Piedini: alternata A, positivo, alternata B, negativo. */
export function bridge(id: string): Part {
  const p = pads(id, 4);
  const pairs = [[p[0], p[1]], [p[2], p[1]], [p[3], p[0]], [p[3], p[2]]];
  const elements = pairs.flatMap(([a, b], i) => {
    const d = diode(`${id}.D${i + 1}`, '1N4007');
    return d.elements.map(e => ({ ...e, a: e.a === d.pads[0] ? a : e.a, b: e.b === d.pads[1] ? b : e.b }));
  });
  return { id, type: 'bridge', mark: 'ponte a quattro diodi', pads: p, elements, view: {}, truth: {} };
}
