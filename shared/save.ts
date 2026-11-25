// Il salvataggio: le stelle prese in ogni esercizio, quante varianti si sono fatte e il suono. Ha una versione: quando
// la forma cambia si aggiunge un passo qui e un esempio in tests/fixtures/, mai si butta un salvataggio vecchio.
import { EXERCISES } from './exercises.ts';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'bancoprova-salvataggio';
export interface Save { v: number; stars: Record<string, number>; done: Record<string, number>; sound: boolean }

export function emptySave(): Save { return { v: SAVE_VERSION, stars: {}, done: {}, sound: true }; }
const oggetto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Legge un salvataggio: testo rotto, versione futura o dati strani diventano un salvataggio vuoto o ripulito, mai un errore. */
export function parseSave(text: string | null | undefined): Save {
  const s = emptySave();
  if (!text) return s;
  let d: unknown;
  try { d = JSON.parse(text); } catch { return s; }
  if (!oggetto(d) || typeof d.v !== 'number' || d.v < 1 || d.v > SAVE_VERSION) return s;
  const ids = new Set(EXERCISES.map(e => e.id));
  if (typeof d.sound === 'boolean') s.sound = d.sound;
  if (oggetto(d.stars)) for (const [id, n] of Object.entries(d.stars)) if (ids.has(id) && typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3) s.stars[id] = n;
  if (oggetto(d.done)) for (const [id, n] of Object.entries(d.done)) if (ids.has(id) && typeof n === 'number' && Number.isInteger(n) && n >= 1 && n < 1e6) s.done[id] = n;
  return s;
}
export function serializeSave(s: Save): string { return JSON.stringify({ ...s, v: SAVE_VERSION }); }

/** Segna un esercizio riuscito: si tiene il numero di stelle migliore e si conta una variante in più. */
export function recordSolved(s: Save, id: string, stars: number): Save {
  if (!EXERCISES.some(e => e.id === id) || !(stars >= 1)) return s;
  return { ...s, stars: { ...s.stars, [id]: Math.max(s.stars[id] ?? 0, Math.min(3, Math.floor(stars))) }, done: { ...s.done, [id]: (s.done[id] ?? 0) + 1 } };
}
export function starCount(s: Save): { got: number; of: number } {
  return { got: Object.values(s.stars).reduce((a, b) => a + b, 0), of: EXERCISES.length * 3 };
}
