// La scena sul banco: quali componenti ci sono, come sono collegati e dove stanno disegnati. Due forme: una fila di
// pezzi sciolti, oppure un circuito ad anello (un generatore a sinistra, i pezzi in serie in alto, il ritorno in basso,
// ed eventuali pezzi messi fra il filo alto e il ritorno). La geometria sta qui perché è un dato, non un disegno.
import type { Element } from './circuit.ts';
import { toggle, wire, type Part } from './parts.ts';

export interface Placed { x: number; y: number; vertical: boolean }
export interface Scene {
  parts: Part[]; wires: Element[];
  place: Record<string, Placed>;                 // dove sta ogni componente
  lines: [number, number, number, number][];     // i fili da disegnare
  width: number; height: number;
}

/** Dove cadono i piedini di un componente: a 50 unità dal centro, in orizzontale o in verticale (tre piedini: anche al centro). */
export function padPositions(part: Part, p: Placed): { node: string; x: number; y: number }[] {
  const passi = part.pads.length === 3 ? [-50, 0, 50] : [-50, 50];
  return part.pads.map((node, i) => p.vertical ? { node, x: p.x, y: p.y + passi[i] } : { node, x: p.x + passi[i], y: p.y });
}

/** Tutti gli elementi elettrici della scena. */
export function sceneElements(s: Scene): Element[] {
  return [...s.parts.flatMap(p => p.elements), ...s.wires];
}

/** Tutti i piedini che si possono toccare coi puntali, con la loro posizione. */
export function scenePads(s: Scene): { node: string; partId: string; index: number; x: number; y: number }[] {
  return s.parts.flatMap(part => padPositions(part, s.place[part.id]).map((p, index) => ({ ...p, partId: part.id, index })));
}

/** Pezzi sciolti, in fila, non collegati fra loro. */
export function row(parts: Part[]): Scene {
  const passo = 190, place: Scene['place'] = {};
  parts.forEach((p, i) => { place[p.id] = { x: 120 + i * passo, y: 110, vertical: false }; });
  return { parts, wires: [], place, lines: [], width: Math.max(560, 240 + (parts.length - 1) * passo), height: 220 };
}

/**
 * Un circuito ad anello. «source» sta a sinistra in verticale, col primo piedino (il +) in alto; se è null non c'è
 * generatore e resta una rete di soli componenti. «top» sono i pezzi in serie lungo il filo alto, da sinistra.
 * «shunts» sono pezzi messi in verticale fra il filo alto, subito dopo il pezzo di indice «after», e il ritorno.
 * Con «closed» l'ultimo pezzo in alto è collegato al ritorno.
 */
export function loop(source: Part | null, top: Part[], o: { shunts?: { after: number; part: Part }[]; closed?: boolean } = {}): Scene {
  const yTop = 70, yBot = 250, x0 = 80, passo = 170, shunts = o.shunts ?? [], yMid = (yTop + yBot) / 2;
  const place: Scene['place'] = {}, wires: Element[] = [], lines: Scene['lines'] = [];
  const xTop = (i: number): number => x0 + 120 + i * passo;
  // più pezzi dopo lo stesso punto stanno uno accanto all'altro
  const xShunt = shunts.map((s, k) => xTop(s.after) + passo / 2 + shunts.slice(0, k).filter(q => q.after === s.after).length * 80);
  const minus = source ? source.pads[1] : shunts.length ? shunts[0].part.pads[1] : 'ritorno';
  top.forEach((p, i) => { place[p.id] = { x: xTop(i), y: yTop, vertical: false }; });
  if (source) {
    place[source.id] = { x: x0, y: yMid, vertical: true };
    lines.push([x0, yMid - 50, x0, yTop], [x0, yTop, xTop(0) - 50, yTop]);
    wires.push(wire('w.s', source.pads[0], top[0].pads[0]));
  }
  for (let i = 1; i < top.length; i++) { wires.push(wire(`w.t${i}`, top[i - 1].pads[1], top[i].pads[0])); lines.push([xTop(i - 1) + 50, yTop, xTop(i) - 50, yTop]); }
  const xFine = xTop(top.length - 1) + 50 + (o.closed ? 40 : 0), xDestra = Math.max(xFine, ...xShunt), xSinistra = source ? x0 : Math.min(...xShunt, xFine);
  if (source) lines.push([x0, yMid + 50, x0, yBot]);
  if (source || shunts.length > 1 || o.closed) lines.push([xSinistra, yBot, xDestra, yBot]);
  if (o.closed) { wires.push(wire('w.r', top[top.length - 1].pads[1], minus)); lines.push([xTop(top.length - 1) + 50, yTop, xFine, yTop], [xFine, yTop, xFine, yBot]); }
  shunts.forEach((s, k) => {
    const x = xShunt[k];
    place[s.part.id] = { x, y: yMid, vertical: true };
    wires.push(wire(`w.h${k}a`, top[s.after].pads[1], s.part.pads[0]));
    if (s.part.pads[1] !== minus) wires.push(wire(`w.h${k}b`, s.part.pads[1], minus));
    lines.push([xTop(s.after) + 50, yTop, x, yTop], [x, yTop, x, yMid - 50], [x, yMid + 50, x, yBot]);
  });
  return { parts: [...(source ? [source] : []), ...top, ...shunts.map(s => s.part)], wires, place, lines, width: Math.max(560, xDestra + 70), height: 320 };
}

/** Apre o chiude un ponticello (un componente «switch») della scena: restituisce una scena nuova. */
export function flipSwitch(s: Scene, partId: string): Scene {
  return { ...s, parts: s.parts.map(p => p.id === partId && p.type === 'switch' ? toggle(p.id, !p.truth.closed) : p) };
}
