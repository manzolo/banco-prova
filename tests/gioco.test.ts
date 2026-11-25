// Prove dello stato del banco e del salvataggio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answer, apply, newBench, partCurrent, tick, type Action, type Bench } from '../shared/game.ts';
import { SAVE_VERSION, emptySave, parseSave, recordSolved, serializeSave, starCount } from '../shared/save.ts';
import { vicino } from './aiuti.ts';

const fai = (b: Bench, ...azioni: Action[]): Bench => azioni.reduce(apply, b);

test('un banco nuovo: esercizio o banco libero, multimetro spento, puntali a riposo', () => {
  const b = newBench('colori', 2);
  assert.equal(b.exercise!.id, 'colori'); assert.equal(b.meter.dial, 'off'); assert.deepEqual(b.probes, { red: null, black: null }); assert.equal(b.tries, 0); assert.equal(b.solved, false);
  const libero = newBench(null, 0, 'b-9v'); assert.equal(libero.exercise, null); assert.equal(libero.scene.parts[0].type, 'battery');
  assert.equal(newBench(null, 0, 'inesistente').scene.parts[0].type, 'resistor', 'un cassetto che non c\'è: si prende il primo');
  assert.throws(() => newBench('inesistente'));
});

test('i gesti: selettore, boccola, puntali, ponticello', () => {
  const b = newBench('pila', 0), c = fai(b, { type: 'dial', dial: 'vdc' }, { type: 'jack', jack: 'ma' }, { type: 'probe', color: 'red', node: 'B1.1' }, { type: 'probe', color: 'black', node: 'B1.2' });
  assert.equal(c.meter.dial, 'vdc'); assert.equal(c.meter.jack, 'ma'); assert.deepEqual(c.probes, { red: 'B1.1', black: 'B1.2' }); assert.equal(b.meter.dial, 'off', 'lo stato di prima non cambia');
  assert.equal(apply(c, { type: 'probe', color: 'red', node: 'non-esiste' }), c, 'un piedino che non c\'è: niente'); assert.equal(apply(c, { type: 'probe', color: 'red', node: null }).probes.red, null);
  const chiuso = apply(b, { type: 'switch', partId: 'S1' }); assert.equal(chiuso.scene.parts.find(p => p.id === 'S1')!.truth.closed, true); assert.equal(apply(b, { type: 'switch', partId: 'R1' }), b, 'una resistenza non si apre');
  assert.equal(apply(b, { type: 'hint' }).usedHint, true); assert.deepEqual(apply({ ...b, capV: { x: 1 } }, { type: 'discharge' }).capV, {});
  assert.deepEqual(fai(b, { type: 'probe', color: 'red', node: 'B1.1' }, { type: 'probe', color: 'black', node: 'B1.1' }).probes, { red: 'B1.1', black: 'B1.1' }, 'i due puntali sullo stesso piedino');
});

test('il tempo: la lettura arriva dal multimetro del modello, e i condensatori ricordano la carica', () => {
  let b = fai(newBench(null, 0, 'c-1000'), { type: 'dial', dial: 'ohm' }, { type: 'probe', color: 'red', node: 'X1.1' }, { type: 'probe', color: 'black', node: 'X1.2' });
  const prima = tick(b, 0.05); b = prima.bench; assert.ok(prima.reading.value < 200, `appena toccato: ${prima.reading.value}`);
  for (let i = 0; i < 400; i++) b = tick(b, 0.05).bench;
  assert.equal(tick(b, 0.05).reading.display, 'OL'); vicino(b.capV['X1.c'], 0.6, 0.01, 'carico'); assert.ok(tick(apply(b, { type: 'discharge' }), 0.05).reading.value < 200, 'scaricato, riparte da capo');
  const tolti = apply(b, { type: 'probe', color: 'red', node: null }); vicino(tick(tolti, 1).bench.capV['X1.c'], 0.6, 0.01, 'coi puntali staccati resta carico');
});

test('il fusibile che salta: lo stato lo ricorda, lo conta, e lo si cambia', () => {
  let b = fai(newBench(null, 0, 'b-9v'), { type: 'dial', dial: 'vdc' }, { type: 'jack', jack: 'ma' }, { type: 'probe', color: 'red', node: 'X1.1' }, { type: 'probe', color: 'black', node: 'X1.2' });
  const t = tick(b, 0.05); b = t.bench;
  assert.equal(t.reading.blew, 'ma'); assert.equal(b.meter.fuseMaBlown, true); assert.equal(b.fusesBlown, 1);
  const dopo = tick(b, 0.05); assert.equal(dopo.reading.blew, null, 'salta una volta sola'); assert.equal(dopo.bench.fusesBlown, 1);
  assert.equal(tick(apply(b, { type: 'dial', dial: 'ma' }), 0.05).reading.note, 'fuseBlown');
  const cambiato = apply(b, { type: 'replaceFuse', jack: 'ma' }); assert.equal(cambiato.meter.fuseMaBlown, false); assert.equal(cambiato.fusesBlown, 1, 'cambiarlo non cancella l\'errore');
  assert.equal(apply(cambiato, { type: 'replaceFuse', jack: 'a' }), cambiato, 'un fusibile buono non si cambia');
});

test('la corrente che fa brillare il LED', () => {
  const b = fai(newBench('corrente-led', 0), { type: 'dial', dial: 'vdc' }), r = tick(b, 0.05).reading;
  assert.ok(partCurrent(r, 'L1') > 0.005 && partCurrent(r, 'L1') < 0.03, `acceso: ${partCurrent(r, 'L1')}`);
  assert.ok(partCurrent(tick(apply(b, { type: 'switch', partId: 'S1' }), 0.05).reading, 'L1') < 1e-6, 'ponticello aperto: spento'); assert.equal(partCurrent(r, 'niente'), 0);
});

test('la risposta e le stelle: tre al primo colpo, meno con l\'aiuto, coi tentativi o col fusibile bruciato', () => {
  const b = newBench('interrotta', 1), giusta = (b.exercise!.question as { correct: number }).correct, sbagliata = (giusta + 1) % 3;
  const v = answer(b, giusta); assert.equal(v.correct, true); assert.equal(v.stars, 3); assert.equal(v.bench.solved, true); assert.equal(v.bench.tries, 1);
  assert.equal(answer(apply(b, { type: 'hint' }), giusta).stars, 2);
  const err = answer(b, sbagliata); assert.equal(err.correct, false); assert.equal(err.stars, 0); assert.equal(err.bench.solved, false); assert.equal(answer(err.bench, giusta).stars, 2);
  assert.equal(answer({ ...b, fusesBlown: 1 }, giusta).stars, 2); assert.equal(answer({ ...apply(err.bench, { type: 'hint' }), fusesBlown: 2 }, giusta).stars, 1, 'mai meno di una, se è giusta');
  assert.equal(answer(v.bench, giusta).stars, 0, 'un esercizio già risolto non si rivince'); assert.equal(answer(newBench(null), 1).correct, false, 'sul banco libero non c\'è niente da rispondere');
  assert.equal(answer(newBench('colori', 0), NaN).correct, false);
});

test('il salvataggio: vuoto, andata e ritorno, il migliore resta e le varianti si contano', () => {
  const s = emptySave(); assert.deepEqual(s, { v: SAVE_VERSION, stars: {}, done: {}, sound: true });
  const a = recordSolved(s, 'colori', 2), b = recordSolved(a, 'colori', 3), c = recordSolved(b, 'colori', 1);
  assert.equal(b.stars.colori, 3); assert.equal(c.stars.colori, 3, 'un risultato peggiore non cancella il migliore'); assert.equal(c.done.colori, 3); assert.deepEqual(s.stars, {}, 'il salvataggio di prima non cambia');
  assert.equal(recordSolved(s, 'marte', 3), s); assert.equal(recordSolved(s, 'colori', 0), s); assert.equal(recordSolved(s, 'colori', 9).stars.colori, 3);
  assert.deepEqual(parseSave(serializeSave(c)), c); assert.deepEqual(starCount(recordSolved(c, 'catodo', 2)), { got: 5, of: 60 });
});

test('il salvataggio della versione 1 si legge ancora, e uno rotto non rompe il gioco', () => {
  const s = parseSave(readFileSync(new URL('./fixtures/save-v1.json', import.meta.url), 'utf8'));
  assert.deepEqual(s.stars, { colori: 3, catodo: 2 }); assert.deepEqual(s.done, { colori: 4, catodo: 1 }); assert.equal(s.sound, false);
  for (const rotto of [null, undefined, '', 'non è json', '[]', '7', '{"v":99,"stars":{"colori":3},"sound":false}', '{"v":0,"sound":false}', '{"stars":{"colori":3}}']) assert.deepEqual(parseSave(rotto), emptySave(), String(rotto));
  const strano = parseSave('{"v":1,"sound":"sì","stars":{"colori":7,"marte":3,"catodo":2,"base":1.5,"zener":"tre"},"done":{"colori":-1,"catodo":2,"marte":4},"altro":1}');
  assert.deepEqual(strano, { v: 1, stars: { catodo: 2 }, done: { catodo: 2 }, sound: true });
});
