// Prove del multimetro: ogni funzione su componenti di cui si sa cosa deve dire, e gli errori classici con le loro conseguenze.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Element } from '../shared/circuit.ts';
import { NEW_METER, formatAmp, formatFarad, formatOhm, formatVolt, meterElements, read, type Dial, type MeterState } from '../shared/meter.ts';
import { battery, bjt, capacitor, diode, fuse, inductor, pot, resistor, transformer, wire, type Part } from '../shared/parts.ts';
import { vicino } from './aiuti.ts';

const m = (dial: Dial, o: Partial<MeterState> = {}): MeterState => ({ ...NEW_METER, dial, ...o });
const su = (part: Part, dial: Dial, rosso = 0, nero = 1, o: Partial<MeterState> = {}) => read(part.elements, m(dial, o), { red: part.pads[rosso], black: part.pads[nero] });

test('il display a 4000 punti: dove va la virgola', () => {
  assert.deepEqual(formatVolt(9.6), { display: '9,60', unit: 'V' }); assert.deepEqual(formatVolt(3.8367), { display: '3,837', unit: 'V' });
  assert.deepEqual(formatVolt(0.1234), { display: '123,4', unit: 'mV' }); assert.deepEqual(formatVolt(-12.34), { display: '−12,34', unit: 'V' }); assert.deepEqual(formatVolt(230), { display: '230,0', unit: 'V' });
  assert.deepEqual(formatOhm(47.3), { display: '47,3', unit: 'Ω' }); assert.deepEqual(formatOhm(4841), { display: '4,84', unit: 'kΩ' }); assert.deepEqual(formatOhm(1500), { display: '1,500', unit: 'kΩ' });
  assert.deepEqual(formatOhm(220000), { display: '220,0', unit: 'kΩ' }); assert.deepEqual(formatOhm(1e6), { display: '1,000', unit: 'MΩ' }); assert.deepEqual(formatOhm(12e6), { display: '12,00', unit: 'MΩ' });
  assert.deepEqual(formatOhm(50e6), { display: 'OL', unit: 'MΩ' }); assert.deepEqual(formatOhm(Infinity), { display: 'OL', unit: 'MΩ' });
  assert.deepEqual(formatAmp(0.0153, 'ma'), { display: '15,30', unit: 'mA' }); assert.deepEqual(formatAmp(0.25, 'ma'), { display: '250,0', unit: 'mA' }); assert.deepEqual(formatAmp(1.5, 'a'), { display: '1,500', unit: 'A' });
  assert.deepEqual(formatFarad(100e-9), { display: '100,0', unit: 'nF' }); assert.deepEqual(formatFarad(4.7e-9), { display: '4,70', unit: 'nF' }); assert.deepEqual(formatFarad(470e-6), { display: '470', unit: 'µF' });
  assert.deepEqual(formatFarad(22e-12), { display: '0,022', unit: 'nF' }); assert.deepEqual(formatFarad(1e-6), { display: '1,000', unit: 'µF' });
});

test('ohmetro: legge il valore vero del pezzo, non quello stampato', () => {
  const r = su(resistor('R1', 4700, 5, { factor: 1.03 }), 'ohm');
  vicino(r.value, 4841, 0.5, '4700 · 1,03'); assert.equal(r.display, '4,84'); assert.equal(r.unit, 'kΩ'); assert.equal(r.note, 'ok');
  assert.equal(su(resistor('R', 4700, 5, { fault: 'open' }), 'ohm').display, 'OL');
  vicino(su(resistor('R', 4700, 5, { fault: 'drift' }), 'ohm').value, 6486, 1, 'derivata');
  vicino(su(resistor('R', 1e6, 5), 'ohm').value, 1e6, 200, 'un megaohm'); vicino(su(resistor('R', 10, 5), 'ohm').value, 10, 0.01, 'dieci ohm');
  vicino(su(resistor('R', 4700), 'ohm', 1, 0).value, 4700, 0.5, 'una resistenza non ha verso');
});

test('puntali non collegati o sullo stesso piedino', () => {
  const r = resistor('R', 1000);
  assert.equal(read(r.elements, m('ohm'), { red: 'R.1', black: null }).display, 'OL'); assert.equal(read(r.elements, m('ohm'), { red: 'R.1', black: null }).note, 'open');
  assert.equal(read(r.elements, m('vdc'), { red: null, black: null }).display, '0,0'); assert.equal(read(r.elements, m('off'), { red: 'R.1', black: 'R.2' }).display, '');
  assert.equal(read(r.elements, m('ohm'), { red: 'R.1', black: 'R.1' }).value, 0, 'puntali uniti: zero ohm'); assert.equal(read(r.elements, m('cont'), { red: 'R.1', black: 'R.1' }).beep, true);
  assert.deepEqual(meterElements(m('vdc'), { red: 'a', black: null }), []);
});

test('continuità: suona sotto i 50 Ω', () => {
  assert.equal(su(fuse('F', false), 'cont').beep, true); vicino(su(fuse('F', false), 'cont').value, 0.05, 0.001, 'cinque centesimi di ohm');
  assert.equal(su(fuse('F', true), 'cont').beep, false); assert.equal(su(fuse('F', true), 'cont').display, 'OL');
  assert.equal(su(resistor('R', 47), 'cont').beep, true); assert.equal(su(resistor('R', 56), 'cont').beep, false, '56 Ω: si legge ma non suona');
  assert.equal(su(resistor('R', 56), 'cont').display, '56,0'); assert.equal(su(resistor('R', 1000), 'cont').display, 'OL');
  assert.equal(su(inductor('L', 100e-6, 1.8), 'cont').beep, true, 'una bobina buona è un filo'); assert.equal(su(inductor('L', 100e-6, 1.8, { fault: 'open' }), 'cont').beep, false);
});

test('prova diodi: in diretta la caduta, in inversa OL; ogni tipo ha la sua', () => {
  const d = diode('D1', '1N4148');
  const diretta = su(d, 'diode', 0, 1), inversa = su(d, 'diode', 1, 0);
  assert.ok(diretta.value > 0.58 && diretta.value < 0.66, `1N4148: ${diretta.value}`); assert.equal(diretta.note, 'ok'); assert.equal(diretta.unit, 'V');
  assert.equal(inversa.display, 'OL'); assert.equal(inversa.note, 'reverse');
  const caduta = (model: Parameters<typeof diode>[1]): number => su(diode('D', model), 'diode').value;
  assert.ok(caduta('schottky') > 0.12 && caduta('schottky') < 0.22, `Schottky: ${caduta('schottky')}`);
  assert.ok(caduta('germanium') > 0.17 && caduta('germanium') < 0.3, `germanio: ${caduta('germanium')}`);
  assert.ok(caduta('1N4007') > 0.52 && caduta('1N4007') < 0.62, `1N4007: ${caduta('1N4007')}`);
  assert.ok(caduta('led-red') > 1.7 && caduta('led-red') < 1.9, `LED rosso: ${caduta('led-red')}`);
  assert.ok(caduta('led-green') > 2.0 && caduta('led-green') < 2.25, `LED verde: ${caduta('led-green')}`);
  assert.equal(su(diode('D', 'led-blue'), 'diode').display, 'OL', 'un LED blu vuole più dei 2,5 V che il multimetro sa mostrare');
  assert.ok(caduta('schottky') < caduta('germanium') && caduta('germanium') < caduta('1N4007') && caduta('1N4148') < caduta('led-red'));
});

test('prova diodi sui guasti: in corto suona e legge zero nei due versi, interrotto dà OL nei due versi', () => {
  const corto = diode('D', '1N4007', { fault: 'short' }), aperto = diode('D', '1N4007', { fault: 'open' });
  for (const [a, b] of [[0, 1], [1, 0]]) { assert.equal(su(corto, 'diode', a, b).note, 'short'); assert.equal(su(corto, 'diode', a, b).beep, true); assert.ok(su(corto, 'diode', a, b).value < 0.01); assert.equal(su(aperto, 'diode', a, b).display, 'OL'); }
  const girato = diode('D', '1N4148', { flipped: true });
  assert.equal(su(girato, 'diode', 0, 1).display, 'OL', 'girato: col rosso a sinistra non conduce'); assert.ok(su(girato, 'diode', 1, 0).value > 0.5);
});

test('con gli ohm un diodo non si prova: 0,6 V non bastano ad aprirlo', () => {
  const d = diode('D', '1N4007');
  assert.ok(su(d, 'ohm', 0, 1).value > 2000 && su(d, 'ohm', 0, 1).value < 20000, `in diretta legge qualche kiloohm, che non è una misura: ${su(d, 'ohm', 0, 1).value}`); assert.equal(su(d, 'ohm', 1, 0).display, 'OL');
  assert.equal(su(diode('D', 'led-red'), 'ohm', 0, 1).display, 'OL', 'un LED nemmeno si accorge degli ohm');
});

test('zener con la prova diodi: è un diodo normale (la tensione di zener non si vede)', () => {
  const z = diode('Z', '1N4148', { zenerVolt: 5.1 });
  assert.ok(su(z, 'diode', 0, 1).value > 0.6 && su(z, 'diode', 0, 1).value < 0.85); assert.equal(su(z, 'diode', 1, 0).display, 'OL');
});

test('transistor: la base si trova perché conduce verso tutti e due gli altri piedini', () => {
  const q = bjt('Q', 'npn', 'EBC');     // base al centro
  const v = (r: number, n: number): string => su(q, 'diode', r, n).display;
  assert.notEqual(v(1, 0), 'OL'); assert.notEqual(v(1, 2), 'OL'); assert.equal(v(0, 1), 'OL'); assert.equal(v(2, 1), 'OL'); assert.equal(v(0, 2), 'OL'); assert.equal(v(2, 0), 'OL');
  assert.ok(su(q, 'diode', 1, 0).value > su(q, 'diode', 1, 2).value, 'la base-emettitore cade un filo più della base-collettore: così si distinguono');
  const p = bjt('Q', 'pnp', 'EBC'), w = (r: number, n: number): string => su(p, 'diode', r, n).display;
  assert.notEqual(w(0, 1), 'OL'); assert.notEqual(w(2, 1), 'OL'); assert.equal(w(1, 0), 'OL'); assert.equal(w(1, 2), 'OL', 'PNP: è il nero che sta sulla base');
  assert.equal(su(bjt('Q', 'npn', 'EBC', { fault: 'ce-short' }), 'diode', 0, 2).note, 'short');
  assert.equal(su(bjt('Q', 'npn', 'EBC', { fault: 'be-open' }), 'diode', 1, 0).display, 'OL');
});

test('capacimetro: legge il valore vero; in perdita o in corto dice OL', () => {
  const c = su(capacitor('C', 100e-9, 'ceramic', { factor: 0.92 }), 'cap');
  vicino(c.value, 92e-9, 1e-15, '100 nF · 0,92'); assert.equal(c.display, '92,0'); assert.equal(c.unit, 'nF');
  assert.equal(su(capacitor('C', 470e-6, 'electrolytic'), 'cap').display, '470'); vicino(su(capacitor('C', 100e-6, 'electrolytic', { fault: 'dry' }), 'cap').value, 30e-6, 1e-12, 'secco');
  assert.equal(su(capacitor('C', 100e-6, 'electrolytic', { fault: 'leak' }), 'cap').note, 'leak'); assert.equal(su(capacitor('C', 100e-6, 'electrolytic', { fault: 'short' }), 'cap').display, 'OL');
  assert.ok(su(capacitor('C', 100e-6, 'electrolytic', { fault: 'open' }), 'cap').value < 1e-10, 'interrotto: capacità quasi zero');
  assert.equal(su(resistor('R', 1000), 'cap').note, 'leak', 'una resistenza non è un condensatore');
});

test('condensatore con gli ohm: la lettura sale da sola mentre si carica, poi OL; in corto resta a zero', () => {
  const c = capacitor('C', 1000e-6, 'electrolytic'), probes = { red: c.pads[0], black: c.pads[1] };
  let capV: Record<string, number> = { 'C.c': 0 }; const letture: number[] = [];
  for (let i = 0; i < 600; i++) { const r = read(c.elements, m('ohm'), probes, { capV, dt: 0.02 }); capV = r.solution.capV; if (i % 50 === 0) letture.push(r.value); }
  assert.ok(letture[0] < 50, `appena toccato è quasi un corto: ${letture[0]}`);          // τ = 1 kΩ · 1000 µF = 1 s
  for (let i = 1; i < letture.length; i++) assert.ok(letture[i] > letture[i - 1], `sale sempre: ${letture.join(' ')}`);
  assert.ok(letture[letture.length - 1] > 1e6, 'dopo dieci secondi è oltre il megaohm'); vicino(capV['C.c'], 0.6, 0.001, 'carico alla tensione dell\'ohmetro');
  assert.equal(read(c.elements, m('ohm'), probes).display, 'OL', 'a regime un condensatore buono è aperto');
  assert.ok(su(capacitor('C', 1000e-6, 'electrolytic', { fault: 'short' }), 'ohm').value < 1); vicino(su(capacitor('C', 1000e-6, 'electrolytic', { fault: 'leak' }), 'ohm').value, 18000, 5, 'in perdita si ferma sui 18 kΩ');
});

test('voltmetro: la pila a vuoto, il verso dei puntali, e l\'alternata', () => {
  const b = battery('B', '9v', 1);
  vicino(su(b, 'vdc').value, 9.6, 1e-4, 'a vuoto'); assert.equal(su(b, 'vdc').display, '9,60'); vicino(su(b, 'vdc', 1, 0).value, -9.6, 1e-4, 'puntali scambiati: segno meno');
  assert.equal(su(b, 'vdc', 1, 0).display, '−9,60'); vicino(su(b, 'vac').value, 0, 1e-9, 'in alternata una pila legge zero');
  const t = transformer('T', 12); vicino(su(t, 'vac').value, 12, 0.001, '12 V efficaci'); vicino(su(t, 'vdc').value, 0, 1e-9, 'in continua un\'alternata legge zero');
});

test('pila sotto carico: quella scarica crolla, quella nuova no', () => {
  const prova = (carica: number): number => { const b = battery('B', '9v', carica), r = resistor('R', 100); return read([...b.elements, ...r.elements, wire('w1', 'B.1', 'R.1'), wire('w2', 'B.2', 'R.2')], m('vdc'), { red: 'B.1', black: 'B.2' }).value; };
  vicino(prova(1), 9.6 * 100 / 102, 0.01, 'nuova: 9,41 V'); vicino(prova(0.2), 7.84 * 100 / 140.4, 0.01, 'scarica: 5,58 V');
  assert.ok(su(battery('B', '9v', 0.2), 'vdc').value > 7.8, 'a vuoto la stessa pila scarica sembra quasi buona');
});

test('il voltmetro carica il circuito: su due resistenze da 10 MΩ legge un terzo, non metà', () => {
  const rete: Element[] = [...battery('B', '9v', 1).elements, ...resistor('R1', 10e6).elements, ...resistor('R2', 10e6).elements, wire('w1', 'B.1', 'R1.1'), wire('w2', 'R1.2', 'R2.1'), wire('w3', 'R2.2', 'B.2')];
  vicino(read(rete, m('vdc'), { red: 'R2.1', black: 'R2.2' }).value, 9.6 / 3, 0.01, '10 MΩ in parallelo ai 10 MΩ del voltmetro fanno 5 MΩ');
  const bassa: Element[] = [...battery('B', '9v', 1).elements, ...resistor('R1', 1000).elements, ...resistor('R2', 1000).elements, wire('w1', 'B.1', 'R1.1'), wire('w2', 'R1.2', 'R2.1'), wire('w3', 'R2.2', 'B.2')];
  vicino(read(bassa, m('vdc'), { red: 'R2.1', black: 'R2.2' }).value, 9.6 * 1000 / 2002, 0.001, 'su resistenze basse non si nota');
});

const ledAperto = (): Element[] => [...battery('B', '9v', 1).elements, ...resistor('R1', 470).elements, ...diode('L1', 'led-red').elements, wire('w1', 'B.1', 'R1.1'), wire('w3', 'L1.2', 'B.2')];   // manca il filo fra R1.2 e L1.1: lì va l'amperometro

test('amperometro: va in serie, nel punto dove il circuito è aperto', () => {
  const r = read(ledAperto(), m('ma', { jack: 'ma' }), { red: 'R1.2', black: 'L1.1' });
  assert.ok(r.value > 0.0155 && r.value < 0.0170, `circa 16 mA: ${r.value}`); assert.equal(r.unit, 'mA'); assert.equal(r.note, 'ok'); assert.equal(r.blew, null);
  vicino(read(ledAperto(), m('ma', { jack: 'ma' }), { red: 'L1.1', black: 'R1.2' }).value, -r.value, 1e-9, 'puntali scambiati: segno meno');
  vicino(r.solution.current('L1.d'), r.value, 1e-9, 'la corrente letta è quella che passa nel LED');
  assert.equal(read(ledAperto(), m('ma'), { red: 'R1.2', black: 'L1.1' }).note, 'jack', 'selettore su mA ma puntale in VΩ: non passa niente'); assert.equal(read(ledAperto(), m('ma'), { red: 'R1.2', black: 'L1.1' }).value, 0);
  assert.ok(Math.abs(read(ledAperto(), m('ma'), { red: 'R1.2', black: 'L1.1' }).solution.current('L1.d')) < 1e-6, 'e il LED resta spento');
  const dieci = read(ledAperto(), m('a', { jack: 'a' }), { red: 'R1.2', black: 'L1.1' }); assert.equal(dieci.unit, 'A'); assert.equal(dieci.display, '0,016');
  assert.equal(read(ledAperto(), m('ma', { jack: 'a' }), { red: 'R1.2', black: 'L1.1' }).display, '0,00', 'selettore su mA e puntale nella boccola 10 A: il display non vede niente');
});

test('l\'errore classico: puntale rimasto nella boccola mA e selettore sui volt, sulla pila → cortocircuito e fusibile saltato', () => {
  const b = battery('B', '9v', 1), r = read(b.elements, m('vdc', { jack: 'ma' }), { red: 'B.1', black: 'B.2' });
  assert.equal(r.blew, 'ma', '9,6 V su 3,2 Ω fanno 3 A: il fusibile da 400 mA salta'); assert.equal(r.note, 'fuse'); assert.equal(r.display, '0,0');
  const dopo = read(b.elements, m('ma', { jack: 'ma', fuseMaBlown: true }), { red: 'B.1', black: 'B.2' });
  assert.equal(dopo.note, 'fuseBlown'); assert.equal(dopo.value, 0, 'col fusibile saltato legge zero qualunque cosa'); assert.deepEqual(meterElements(m('ma', { jack: 'ma', fuseMaBlown: true }), { red: 'a', black: 'b' }), []);
  const dieci = read(b.elements, m('vdc', { jack: 'a' }), { red: 'B.1', black: 'B.2' });
  assert.equal(dieci.blew, null, 'nella boccola 10 A il fusibile regge'); assert.equal(dieci.note, 'jack'); assert.ok(dieci.solution.current('B.v') > 4, 'ma la pila è in corto: eroga quasi 5 A');
  const stilo = battery('B', 'aa', 1); assert.equal(read(stilo.elements, m('a', { jack: 'a' }), { red: 'B.1', black: 'B.2' }).blew, null); vicino(read(stilo.elements, m('a', { jack: 'a' }), { red: 'B.1', black: 'B.2' }).value, 1.6 / 0.17, 0.01, 'corrente di corto di una stilo');
  const grossa: Element[] = [{ id: 'A', kind: 'V', a: 'p', b: 'gnd', volt: 13.8, rs: 0.05 }];
  assert.equal(read(grossa, m('a', { jack: 'a' }), { red: 'p', black: 'gnd' }).blew, 'a', 'un alimentatore da 13,8 V in corto fa saltare anche il 10 A');
});

test('ohm su un circuito acceso: la lettura non vale, e il multimetro lo dice', () => {
  const rete: Element[] = [...battery('B', '9v', 1).elements, ...resistor('R1', 1000).elements, ...resistor('R2', 1000).elements, wire('w1', 'B.1', 'R1.1'), wire('w2', 'R1.2', 'R2.1'), wire('w3', 'R2.2', 'B.2')];
  const r = read(rete, m('ohm'), { red: 'R2.1', black: 'R2.2' });
  assert.equal(r.note, 'live'); assert.ok(Math.abs(r.value - 1000) > 300, `non legge i 1000 Ω veri: ${r.value}`);
  const uno: Element[] = [...battery('B', '9v', 1).elements, ...resistor('R1', 87).elements, ...resistor('R2', 1).elements, wire('w1', 'B.1', 'R1.1'), wire('w2', 'R1.2', 'R2.1'), wire('w3', 'R2.2', 'B.2')];
  const alContrario = read(uno, m('cont'), { red: 'R2.2', black: 'R2.1' });
  assert.ok(alContrario.value < 50, `coi puntali al contrario su un ohm percorso da corrente il conto dà meno di 50 Ω: ${alContrario.value}`); assert.equal(alContrario.beep, false, 'ma il cicalino non suona: il circuito è acceso'); assert.equal(alContrario.note, 'live');
  assert.equal(read(rete, m('cont'), { red: 'R2.1', black: 'R2.2' }).beep, false); assert.equal(read(rete, m('cap'), { red: 'R2.1', black: 'R2.2' }).note, 'live');
  assert.equal(read(rete, m('diode'), { red: 'R2.1', black: 'R2.2' }).note, 'live');
  const spenta = rete.filter(e => e.kind !== 'V');
  const insieme = read(spenta, m('ohm'), { red: 'R2.1', black: 'R2.2' }); assert.equal(insieme.note, 'ok'); vicino(insieme.value, 1000, 0.5, 'spento e con la pila tolta, R2 si legge giusta');
});

test('in circuito una resistenza si legge in parallelo al resto', () => {
  const rete: Element[] = [...resistor('R1', 1000).elements, ...resistor('R2', 1000).elements, ...resistor('R3', 2200).elements, wire('w1', 'R1.1', 'R3.1'), wire('w2', 'R1.2', 'R2.1'), wire('w3', 'R2.2', 'R3.2')];
  vicino(read(rete, m('ohm'), { red: 'R3.1', black: 'R3.2' }).value, 2200 * 2000 / 4200, 0.5, '2,2 kΩ in parallelo a 1 + 1 kΩ: 1048 Ω');
});

test('potenziometro: fra un estremo e il cursore legge la sua parte, fra gli estremi il totale', () => {
  const p = pot('P', 10000, 0.3);
  vicino(su(p, 'ohm', 0, 1).value, 3000, 0.5, 'primo-cursore'); vicino(su(p, 'ohm', 1, 2).value, 7000, 1, 'cursore-terzo'); vicino(su(p, 'ohm', 0, 2).value, 10000, 1, 'estremi');
});
