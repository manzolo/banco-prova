// Il risolutore dei circuiti in continua: analisi nodale. Ogni elemento sta fra due nodi; si scrive per ogni nodo che la
// somma delle correnti è zero (Kirchhoff) e si risolve il sistema G·v = i. I diodi non sono lineari: si risolve più
// volte, ogni volta sostituendo il diodo con la retta tangente alla sua curva (Newton), finché le tensioni non si fermano.
// I condensatori in continua sono aperti; con un passo di tempo diventano una conduttanza C/dt più un generatore che
// ricorda la tensione di prima (Eulero all'indietro): basta per vedere una carica attraverso una resistenza.
import { GMIN, VT, ZENER, TRANSIENT, TRANSIENT_CURRENT_TOLERANCE } from './config.ts';

export type Element =
  | { id: string; kind: 'R'; a: string; b: string; ohm: number }
  /** Generatore di tensione reale: «volt» fra a (+) e b (−) a vuoto, con resistenza interna «rs» (maggiore di zero).
   *  Con «ac» è un generatore in alternata e «volt» è il valore efficace: in continua vale zero. */
  | { id: string; kind: 'V'; a: string; b: string; volt: number; rs: number; ac?: boolean; hz?: number; wave?: 'sine' | 'square' }
  /** Diodo: a è l'anodo, b il catodo. is e n sono quelli di Shockley; zener, se c'è, è la tensione di rottura inversa. */
  | { id: string; kind: 'D'; a: string; b: string; is: number; n: number; zener?: number }
  | { id: string; kind: 'C'; a: string; b: string; farad: number };

export interface Solution {
  v: Record<string, number>;                 // tensione di ogni nodo rispetto al riferimento
  /** Corrente convenzionale che attraversa l'elemento da a verso b (per un generatore: quella che esce dal +). */
  current(id: string): number;
  capV: Record<string, number>;              // tensione ai capi di ogni condensatore dopo questo passo
  converged: boolean;
}
export interface SolveOptions { dt?: number; capV?: Record<string, number>; ground?: string;
  /** true: si guardano solo i generatori in alternata (valori efficaci, circuito trattato come lineare); false o assente: solo quelli in continua. */
  ac?: boolean; time?: number; initialV?: Record<string, number> }

/** «volt» resta efficace: la sinusoide ha picco √2·Veff, la quadra simmetrica ha picco Veff. */
export function sourceVoltage(e: Extract<Element, { kind: 'V' }>, time: number): number {
  if (!e.ac) return e.volt;
  const phase = 2 * Math.PI * (e.hz ?? TRANSIENT.defaultHz) * time;
  return e.wave === 'square' ? e.volt * (Math.sin(phase) >= 0 ? 1 : -1) : Math.SQRT2 * e.volt * Math.sin(phase);
}

/** Corrente di un diodo e sua derivata a una tensione: Shockley, più il ginocchio di rottura se è uno zener. */
export function diodeAt(d: { is: number; n: number; zener?: number }, v: number): { i: number; g: number } {
  const nvt = d.n * VT, e = Math.exp(Math.min(v / nvt, 80));
  let i = d.is * (e - 1), g = d.is * e / nvt;
  if (d.zener !== undefined) {
    const z = Math.exp(Math.min((-v - d.zener) / ZENER.slopeVolt, 80));
    i -= ZENER.kneeAmp * z; g += ZENER.kneeAmp * z / ZENER.slopeVolt;
  }
  return { i, g: Math.max(g, GMIN) };
}

/** Risolve un sistema lineare denso con l'eliminazione di Gauss e il perno parziale. Restituisce null se è singolare. */
export function gauss(a: number[][], b: number[]): number[] | null {
  const n = b.length, m = a.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) { const f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = m[r][n]; for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k]; x[r] = s / m[r][r]; }
  return x;
}

/** Risolve il circuito. Il riferimento (0 V) è «ground» se indicato, se no il nodo «gnd», se no il primo che si incontra. */
export function solve(elements: Element[], opts: SolveOptions = {}): Solution {
  const nodes: string[] = [];
  for (const e of elements) for (const n of [e.a, e.b]) if (!nodes.includes(n)) nodes.push(n);
  const ground = opts.ground && nodes.includes(opts.ground) ? opts.ground : nodes.includes('gnd') ? 'gnd' : nodes[0];
  const idx = new Map<string, number>(); nodes.filter(n => n !== ground).forEach((n, i) => idx.set(n, i));
  const n = idx.size, capPrev = opts.capV ?? {}, dt = opts.dt;
  const attivo = (e: Extract<Element, { kind: 'V' }>): number => opts.time !== undefined ? sourceVoltage(e, opts.time) : Boolean(e.ac) === Boolean(opts.ac) ? e.volt : 0;
  let v = new Array<number>(n).fill(0);
  const vd = new Map<string, number>(elements.filter(e => e.kind === 'D').map(e => [e.id, (opts.initialV?.[e.a] ?? 0) - (opts.initialV?.[e.b] ?? 0)]));        // tensione usata per linearizzare ogni diodo
  const at = (x: number[], node: string): number => { const i = idx.get(node); return i === undefined ? 0 : x[i]; };
  let converged = elements.every(e => e.kind !== 'D');
  for (let giro = 0; giro < 300; giro++) {
    const g = Array.from({ length: n }, () => new Array<number>(n).fill(0)), rhs = new Array<number>(n).fill(0);
    const cond = (a: string, b: string, s: number): void => {
      const i = idx.get(a), j = idx.get(b);
      if (i !== undefined) g[i][i] += s; if (j !== undefined) g[j][j] += s;
      if (i !== undefined && j !== undefined) { g[i][j] -= s; g[j][i] -= s; }
    };
    const inject = (a: string, b: string, amp: number): void => { const i = idx.get(a), j = idx.get(b); if (i !== undefined) rhs[i] += amp; if (j !== undefined) rhs[j] -= amp; };
    for (let i = 0; i < n; i++) g[i][i] += GMIN;
    for (const e of elements) {
      if (e.kind === 'R') cond(e.a, e.b, 1 / Math.max(e.ohm, 1e-9));
      else if (e.kind === 'V') { cond(e.a, e.b, 1 / e.rs); inject(e.a, e.b, attivo(e) / e.rs); }
      else if (e.kind === 'C') { if (dt !== undefined && dt > 0) { const s = e.farad / dt; cond(e.a, e.b, s); inject(e.a, e.b, s * (capPrev[e.id] ?? 0)); } }
      else { const x = vd.get(e.id) ?? 0, d = diodeAt(e, x); cond(e.a, e.b, d.g); inject(e.b, e.a, d.i - d.g * x); }
    }
    const nuovo = n ? gauss(g, rhs) : [];
    if (!nuovo) break;
    let scarto = 0, residual = 0;
    for (const e of elements) if (e.kind === 'D') {
      const prima = vd.get(e.id) ?? 0, voluto = at(nuovo, e.a) - at(nuovo, e.b);
      // Nei raddrizzatori interdetti il modo comune è quasi flottante: conta anche il residuo di corrente,
      // perché la sola differenza di tensione amplifica il rumore numerico delle conduttanze minime.
      const tangent = diodeAt(e, prima);
      residual = Math.max(residual, Math.abs(diodeAt(e, voluto).i - (tangent.i + tangent.g * (voluto - prima))));
      // freno: in conduzione diretta la curva è ripidissima, quindi si sale a piccoli passi; lo stesso verso il ginocchio dello zener
      const su = prima > 0.2 * e.n ? 0.05 * e.n : 0.4 * e.n, giu = e.zener !== undefined && prima < -e.zener + 0.5 ? 0.1 : 5;
      const ora = Math.min(prima + su, Math.max(prima - giu, voluto));
      scarto = Math.max(scarto, Math.abs(ora - prima), Math.abs(voluto - ora)); vd.set(e.id, ora);
    }
    v = nuovo;
    if (scarto < 1e-9 || (opts.time !== undefined && residual < TRANSIENT_CURRENT_TOLERANCE)) { converged = true; break; }
  }
  const volt: Record<string, number> = { [ground]: 0 };
  for (const [node, i] of idx) volt[node] = v[i];
  const capV: Record<string, number> = {};
  for (const e of elements) if (e.kind === 'C') capV[e.id] = dt !== undefined && dt > 0 ? volt[e.a] - volt[e.b] : volt[e.a] - volt[e.b];
  const byId = new Map(elements.map(e => [e.id, e]));
  return {
    v: volt, capV, converged,
    current(id: string): number {
      const e = byId.get(id); if (!e) return 0;
      const d = volt[e.a] - volt[e.b];
      if (e.kind === 'R') return d / Math.max(e.ohm, 1e-9);
      if (e.kind === 'V') return (attivo(e) - d) / e.rs;
      if (e.kind === 'C') return dt !== undefined && dt > 0 ? e.farad / dt * (d - (capPrev[e.id] ?? 0)) : 0;
      return diodeAt(e, d).i;
    },
  };
}
