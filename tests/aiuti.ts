// Aiuti comuni alle prove.
import assert from 'node:assert/strict';

/** Confronto con tolleranza assoluta. */
export function vicino(ottenuto: number, atteso: number, tolleranza: number, cosa: string): void {
  assert.ok(Math.abs(ottenuto - atteso) <= tolleranza, `${cosa}: atteso ${atteso} ± ${tolleranza}, ottenuto ${ottenuto}`);
}
/** Confronto con tolleranza relativa (0,01 = 1%). */
export function vicinoRel(ottenuto: number, atteso: number, relativa: number, cosa: string): void {
  assert.ok(Math.abs(ottenuto - atteso) <= Math.abs(atteso) * relativa, `${cosa}: atteso ${atteso} ± ${relativa * 100}%, ottenuto ${ottenuto}`);
}
