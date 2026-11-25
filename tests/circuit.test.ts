// Prove del risolutore: circuiti di cui si sa il risultato a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diodeAt, gauss, solve, type Element } from '../shared/circuit.ts';
import { DIODES, VT } from '../shared/config.ts';
import { vicino } from './aiuti.ts';

const pila = (volt: number, rs = 0.001): Element => ({ id: 'B', kind: 'V', a: 'p', b: 'gnd', volt, rs });
const r = (id: string, a: string, b: string, ohm: number): Element => ({ id, kind: 'R', a, b, ohm });

test('Gauss: un sistema due per due, e uno singolare', () => {
  const x = gauss([[2, 1], [1, 3]], [5, 10])!;      // 2x + y = 5; x + 3y = 10 → x = 1, y = 3
  vicino(x[0], 1, 1e-12, 'x'); vicino(x[1], 3, 1e-12, 'y');
  assert.equal(gauss([[1, 2], [2, 4]], [1, 2]), null, 'due righe proporzionali');
  assert.deepEqual(gauss([], []), []);
  vicino(gauss([[0, 1], [1, 0]], [2, 3])![0], 3, 1e-12, 'serve scambiare le righe');
});

test('legge di Ohm: 9 V su 1 kΩ fanno 9 mA', () => {
  const s = solve([pila(9), r('R1', 'p', 'gnd', 1000)]);
  vicino(s.v.p, 9, 1e-4, 'tensione'); vicino(s.current('R1'), 0.009, 1e-7, 'corrente'); vicino(s.current('B'), 0.009, 1e-7, 'la pila eroga la stessa corrente');
  assert.equal(s.v.gnd, 0); assert.equal(s.converged, true); assert.equal(s.current('niente'), 0);
});

test('partitore: 12 V su 10 kΩ e 4,7 kΩ danno 3,837 V al centro', () => {
  const s = solve([pila(12), r('R1', 'p', 'm', 10000), r('R2', 'm', 'gnd', 4700)]);
  vicino(s.v.m, 12 * 4700 / 14700, 1e-4, '12 · 4,7/14,7'); vicino(s.current('R1'), s.current('R2'), 1e-9, 'in serie la corrente è la stessa');
});

test('parallelo: 100 Ω e 150 Ω fanno 60 Ω; le correnti si sommano', () => {
  const s = solve([pila(6), r('R1', 'p', 'gnd', 100), r('R2', 'p', 'gnd', 150)]);
  vicino(s.current('B'), 6 / 60, 1e-5, '6 V su 60 Ω'); vicino(s.current('R1') + s.current('R2'), s.current('B'), 1e-8, 'Kirchhoff al nodo');
});

test('resistenza interna: una pila da 9 V con 2 Ω dentro, caricata con 16 Ω, dà 8 V', () => {
  const s = solve([pila(9, 2), r('R1', 'p', 'gnd', 16)]);
  vicino(s.v.p, 8, 1e-9, '9 · 16/18'); vicino(s.current('B'), 0.5, 1e-9, '9/18');
});

test('il diodo di Shockley: la corrente a 0,6 V, la derivata, e il verso inverso', () => {
  const d = DIODES['1N4148'];
  vicino(diodeAt(d, 0).i, 0, 1e-15, 'a zero volt niente corrente');
  vicino(diodeAt(d, 0.6).i, d.is * (Math.exp(0.6 / (d.n * VT)) - 1), 1e-12, 'Is·(e^(V/nVt) − 1)');
  vicino(diodeAt(d, -5).i, -d.is, 1e-12, 'in inversa solo la corrente di saturazione');
  const h = 1e-6; vicino(diodeAt(d, 0.5).g, (diodeAt(d, 0.5 + h).i - diodeAt(d, 0.5 - h).i) / (2 * h), 1e-6, 'la derivata è quella vera');
  assert.ok(Number.isFinite(diodeAt(d, 100).i), 'non trabocca nemmeno a tensioni assurde');
});

test('LED con la sua resistenza: 9 V, 470 Ω, LED rosso → circa 15 mA e 1,9 V sul LED', () => {
  const led = DIODES['led-red'];
  const s = solve([pila(9), r('R1', 'p', 'a', 470), { id: 'D1', kind: 'D', a: 'a', b: 'k', is: led.is, n: led.n }, r('Rs', 'k', 'gnd', led.rs)]);
  assert.equal(s.converged, true);
  const i = s.current('R1'), vled = s.v.a;
  assert.ok(i > 0.0145 && i < 0.0155, `corrente ${i}`); assert.ok(vled > 1.85 && vled < 2.05, `tensione sul LED ${vled}`);
  vicino(s.current('D1'), i, 1e-8, 'la corrente del diodo è quella della resistenza'); vicino(9 - i * 470, vled, 1e-4, 'Kirchhoff sulla maglia');
});

test('diodo al contrario: non passa niente', () => {
  const d = DIODES['1N4007'];
  const s = solve([pila(9), r('R1', 'p', 'k', 1000), { id: 'D1', kind: 'D', a: 'gnd', b: 'k', is: d.is, n: d.n }]);
  assert.ok(Math.abs(s.current('R1')) < 1e-7, `corrente inversa ${s.current('R1')}`); vicino(s.v.k, 9, 1e-3, 'tutta la tensione resta sul diodo');
});

test('zener da 5,1 V: stabilizza a 5,1 V con 12 V in ingresso e resta chiuso a 3 V', () => {
  const z: Element = { id: 'Z', kind: 'D', a: 'gnd', b: 'k', is: 1e-12, n: 1.2, zener: 5.1 };
  const s = solve([pila(12), r('R1', 'p', 'k', 330), z]);
  assert.equal(s.converged, true); assert.ok(s.v.k > 5.05 && s.v.k < 5.35, `tensione sullo zener ${s.v.k}`);
  vicino(s.current('R1'), (12 - s.v.k) / 330, 1e-6, 'corrente nella resistenza'); vicino(-s.current('Z'), s.current('R1'), 1e-6, 'e la stessa attraversa lo zener, al contrario');
  const basso = solve([pila(3), r('R1', 'p', 'k', 330), z]); vicino(basso.v.k, 3, 0.01, 'sotto la tensione di zener non conduce');
  const diretto = solve([pila(12), r('R1', 'p', 'a', 330), { ...z, a: 'a', b: 'gnd' }]); assert.ok(diretto.v.a > 0.55 && diretto.v.a < 0.9, `in diretta è un diodo: ${diretto.v.a}`);
});

test('condensatore: in continua è aperto; col tempo si carica come dice e^(−t/RC)', () => {
  const c: Element = { id: 'C1', kind: 'C', a: 'c', b: 'gnd', farad: 100e-6 }, rete = [pila(10), r('R1', 'p', 'c', 10000), c];
  const fermo = solve(rete); vicino(fermo.v.c, 10, 1e-3, 'a regime tutta la tensione è sul condensatore'); vicino(fermo.current('R1'), 0, 1e-9, 'e non passa corrente');
  let capV: Record<string, number> = { C1: 0 }; const dt = 0.001;      // τ = 10 kΩ · 100 µF = 1 s
  for (let i = 0; i < 1000; i++) capV = solve(rete, { dt, capV }).capV;
  vicino(capV.C1, 10 * (1 - Math.exp(-1)), 0.01, 'dopo una costante di tempo il 63,2%');
  for (let i = 0; i < 4000; i++) capV = solve(rete, { dt, capV }).capV;
  vicino(capV.C1, 10 * (1 - Math.exp(-5)), 0.01, 'dopo cinque costanti di tempo è carico');
  const primo = solve(rete, { dt, capV: { C1: 0 } }); vicino(primo.current('C1'), primo.current('R1'), 1e-12, 'la corrente di carica passa dal condensatore');
});

test('un pezzo di circuito lasciato in aria non blocca il conto', () => {
  const s = solve([pila(9), r('R1', 'p', 'gnd', 1000), r('Rx', 'x', 'y', 100)]);
  vicino(s.v.p, 9, 1e-4, 'il resto funziona'); assert.ok(Number.isFinite(s.v.x) && Number.isFinite(s.v.y));
  assert.equal(solve([]).converged, true, 'anche un circuito vuoto non rompe');
});

test('il riferimento si può scegliere: le differenze di tensione non cambiano', () => {
  const rete = [pila(12), r('R1', 'p', 'm', 10000), r('R2', 'm', 'gnd', 4700)];
  const a = solve(rete), b = solve(rete, { ground: 'm' });
  assert.equal(b.v.m, 0); vicino(b.v.p - b.v.gnd, a.v.p - a.v.gnd, 1e-9, 'p − gnd'); vicino(b.v.p, a.v.p - a.v.m, 1e-6, 'p rispetto a m');
});
