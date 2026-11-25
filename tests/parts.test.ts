// Prove dei componenti: i codici stampati e il comportamento elettrico, guasti compresi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E12 } from '../shared/config.ts';
import { battery, bjt, capacitor, capacitorCode, decodeBands, decodeCapacitorCode, diode, fuse, inductor, pot, resistor, resistorBands, si, toggle, transformer, wire } from '../shared/parts.ts';
import { vicino } from './aiuti.ts';

test('codice colori: 4,7 kΩ è giallo-viola-rosso, 1 MΩ marrone-nero-verde, sotto i 10 Ω oro e argento', () => {
  assert.deepEqual(resistorBands(4700, 5), ['giallo', 'viola', 'rosso', 'oro']);
  assert.deepEqual(resistorBands(1e6, 1), ['marrone', 'nero', 'verde', 'marrone']);
  assert.deepEqual(resistorBands(220, 10), ['rosso', 'rosso', 'marrone', 'argento']);
  assert.deepEqual(resistorBands(10, 5), ['marrone', 'nero', 'nero', 'oro']);
  assert.deepEqual(resistorBands(4.7, 5), ['giallo', 'viola', 'oro', 'oro']);
  assert.deepEqual(resistorBands(0.47, 5), ['giallo', 'viola', 'argento', 'oro']);
  assert.deepEqual(resistorBands(82000, 2), ['grigio', 'rosso', 'arancio', 'rosso']);
});

test('codice colori: andata e ritorno su tutta la serie E12, da 1 Ω a 8,2 MΩ', () => {
  for (let dec = -1; dec <= 5; dec++) for (const v of E12) {
    const ohm = v * 10 ** dec, d = decodeBands(resistorBands(ohm, 5));
    vicino(d.ohm, ohm, ohm * 1e-9, `${ohm} Ω`); assert.equal(d.tolPct, 5);
  }
  assert.deepEqual(decodeBands(['marrone', 'nero', 'rosso', 'argento']), { ohm: 1000, tolPct: 10 });
});

test('codice dei condensatori: 104 è 100 nF, 472 è 4,7 nF, 220 è 22 pF', () => {
  assert.equal(capacitorCode(100e-9), '104'); assert.equal(capacitorCode(4.7e-9), '472'); assert.equal(capacitorCode(22e-12), '220');
  assert.equal(capacitorCode(1e-6), '105'); assert.equal(capacitorCode(4.7e-12), '5', 'sotto i 10 pF si scrive il valore');
  vicino(decodeCapacitorCode('104'), 100e-9, 1e-18, '104'); vicino(decodeCapacitorCode('472'), 4.7e-9, 1e-18, '472'); vicino(decodeCapacitorCode('33'), 33e-12, 1e-20, 'due cifre: picofarad');
  for (const v of [10e-12, 47e-12, 1e-9, 22e-9, 470e-9]) vicino(decodeCapacitorCode(capacitorCode(v)), v, v * 1e-9, `andata e ritorno ${v}`);
});

test('i valori scritti come al banco', () => {
  assert.equal(si(4700, 'Ω'), '4,7 kΩ'); assert.equal(si(100e-9, 'F'), '100 nF'); assert.equal(si(2.2e-3, 'H'), '2,2 mH'); assert.equal(si(1e6, 'Ω'), '1 MΩ');
  assert.equal(si(470e-6, 'F'), '470 µF'); assert.equal(si(22e-12, 'F'), '22 pF'); assert.equal(si(0, 'V'), '0 V'); assert.equal(si(33, 'Ω'), '33 Ω');
});

test('resistenza: dentro la tolleranza, fuori (derivata) e interrotta', () => {
  const buona = resistor('R1', 4700, 5, { factor: 1.03 }), derivata = resistor('R2', 4700, 5, { fault: 'drift' }), aperta = resistor('R3', 4700, 5, { fault: 'open' });
  vicino(buona.truth.real as number, 4841, 1e-9, '4700 · 1,03'); assert.equal(buona.truth.inTolerance, true);
  vicino(derivata.truth.real as number, 6486, 1e-9, '4700 · 1,38'); assert.equal(derivata.truth.inTolerance, false);
  assert.ok((aperta.truth.real as number) > 1e11); assert.equal(aperta.truth.inTolerance, false);
  assert.deepEqual(buona.pads, ['R1.1', 'R1.2']); assert.equal(buona.mark, 'giallo · viola · rosso · oro'); assert.equal(resistor('R', 100).truth.inTolerance, true);
  assert.equal(resistor('R', 100, 5, { factor: 1.051 }).truth.inTolerance, false, 'appena fuori dal 5%'); assert.equal(resistor('R', 100, 5, { factor: 0.95 }).truth.inTolerance, true);
});

test('condensatore: sigla, e i quattro guasti', () => {
  const c = capacitor('C1', 100e-9, 'ceramic'), e = capacitor('C2', 470e-6, 'electrolytic');
  assert.equal(c.mark, '104'); assert.equal(e.mark, '470 µF 25 V'); assert.equal(c.elements.length, 1);
  assert.equal(capacitor('C', 1e-6, 'electrolytic', { fault: 'short' }).elements.find(x => x.kind === 'R')!.ohm, 0.4);
  assert.equal(capacitor('C', 1e-6, 'electrolytic', { fault: 'leak' }).elements.find(x => x.kind === 'R')!.ohm, 18000);
  vicino(capacitor('C', 100e-6, 'electrolytic', { fault: 'dry' }).truth.real as number, 30e-6, 1e-12, 'secco: resta il 30%');
  assert.ok((capacitor('C', 100e-6, 'electrolytic', { fault: 'open' }).truth.real as number) < 1e-11);
  vicino(capacitor('C', 100e-9, 'ceramic', { factor: 0.92 }).truth.real as number, 92e-9, 1e-15, 'dentro la tolleranza');
});

test('diodo: anodo e catodo, girato, guasto; lo zener e i LED', () => {
  const d = diode('D1', '1N4148'), g = diode('D2', '1N4148', { flipped: true });
  assert.equal(d.truth.cathodePad, 2); assert.equal(g.truth.cathodePad, 1); assert.equal(d.view.cathodeRight, true); assert.equal(g.view.cathodeRight, false);
  const dd = d.elements.find(x => x.kind === 'D')!, gd = g.elements.find(x => x.kind === 'D')!;
  assert.equal(dd.a, 'D1.1'); assert.equal(gd.a, 'D2.2', 'girato: l\'anodo è il secondo piedino');
  assert.equal(diode('D', '1N4007', { fault: 'short' }).elements[0].kind, 'R'); assert.ok((diode('D', '1N4007', { fault: 'open' }).elements[0] as { ohm: number }).ohm > 1e11);
  const z = diode('Z1', '1N4148', { zenerVolt: 5.1 }); assert.equal(z.type, 'zener'); assert.equal(z.mark, 'zener 5,1 V'); assert.equal((z.elements[0] as { zener?: number }).zener, 5.1);
  assert.equal(diode('L', 'led-red').type, 'led'); assert.equal(diode('L', 'led-red').view.color, 'red'); assert.equal(diode('D', 'schottky').type, 'diode');
});

test('transistor: due giunzioni che partono dalla base, nel verso giusto per NPN e PNP', () => {
  const n = bjt('Q1', 'npn', 'EBC'), p = bjt('Q2', 'pnp', 'CBE');
  assert.equal(n.truth.basePad, 2); assert.equal(n.pads.length, 3); assert.equal(n.mark, 'BC547'); assert.equal(p.mark, 'BC557');
  const dn = n.elements.filter(e => e.kind === 'D'), dp = p.elements.filter(e => e.kind === 'D');
  assert.equal(dn.length, 2); assert.ok(dn.every(d => d.a === 'Q1.2'), 'NPN: gli anodi sono sulla base'); assert.ok(dp.every(d => d.a !== 'Q2.2'), 'PNP: sulla base ci sono i catodi');
  assert.equal(bjt('Q', 'npn', 'BCE').truth.basePad, 1); assert.equal(bjt('Q', 'npn', 'ECB').truth.basePad, 3);
  assert.equal(bjt('Q', 'npn', 'EBC', { fault: 'be-open' }).elements.filter(e => e.kind === 'D').length, 1);
  assert.ok(bjt('Q', 'npn', 'EBC', { fault: 'ce-short' }).elements.some(e => e.kind === 'R' && e.ohm === 0.5));
});

test('pila: scarica cala poco a vuoto e molto sotto carico', () => {
  const nuova = battery('B', '9v', 1), scarica = battery('B', '9v', 0.2);
  vicino(nuova.truth.volt as number, 9.6, 1e-9, 'nuova a vuoto'); vicino(nuova.truth.rs as number, 2, 1e-9, 'resistenza interna');
  vicino(scarica.truth.volt as number, 7.84, 1e-9, '7,4 + 2,2·0,2'); vicino(scarica.truth.rs as number, 40.4, 1e-9, '2 + 60·0,8²');
  vicino(battery('B', 'aa', 1).truth.volt as number, 1.6, 1e-9, 'stilo nuova'); assert.equal(battery('B', '9v', 7).truth.charge, 1, 'la carica sta fra 0 e 1');
});

test('potenziometro, fusibile, interruttore, bobina, trasformatore, filo', () => {
  const p = pot('P', 10000, 0.3);
  vicino((p.elements[0] as { ohm: number }).ohm, 3000, 1e-9, 'dal primo piedino al cursore'); vicino((p.elements[1] as { ohm: number }).ohm, 7000, 1e-9, 'dal cursore al terzo');
  assert.equal((pot('P', 10000, 0).elements[0] as { ohm: number }).ohm, 0.5, 'a fine corsa resta il contatto');
  assert.equal((fuse('F', false).elements[0] as { ohm: number }).ohm, 0.05); assert.ok((fuse('F', true).elements[0] as { ohm: number }).ohm > 1e11);
  assert.ok((toggle('S', false).elements[0] as { ohm: number }).ohm > 1e11); assert.equal((toggle('S', true).elements[0] as { ohm: number }).ohm, 0.02);
  assert.equal((inductor('L', 100e-6, 1.8).elements[0] as { ohm: number }).ohm, 1.8); assert.ok((inductor('L', 100e-6, 1.8, { fault: 'open' }).elements[0] as { ohm: number }).ohm > 1e11);
  assert.equal(inductor('L', 2.2e-3, 5).mark, '2,2 mH'); assert.equal((transformer('T', 12).elements[0] as { ac?: boolean }).ac, true);
  assert.deepEqual(wire('w', 'a', 'b'), { id: 'w', kind: 'R', a: 'a', b: 'b', ohm: 0.001 });
});
