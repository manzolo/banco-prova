// Valori noti e controlli indipendenti per sorgenti, transitori e oscilloscopio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, sourceVoltage, type Element } from '../shared/circuit.ts';
import { TRANSIENT, SCOPE } from '../shared/config.ts';
import { NEW_TRANSIENT, simulate, timeStep, transientStep, waveformStats } from '../shared/transient.ts';
import { captureScope, wholePeriods, channelVoltage, newScope, risingEdges, scopeElements, scopeFrame } from '../shared/scope.ts';
import { rectifier, sceneElements, updateFilter } from '../shared/scene.ts';
import { NEW_METER, read } from '../shared/meter.ts';
import { apply, newBench, tick } from '../shared/game.ts';
import { vicino, vicinoRel } from './aiuti.ts';

const source = (volt = 10, hz?: number): Extract<Element, { kind: 'V' }> => ({ id: 'V', kind: 'V', a: 'p', b: 'gnd', volt, rs: 1, ac: true, hz });
const resistance = (ohm: number): Element => ({ id: 'R', kind: 'R', a: 'p', b: 'gnd', ohm });
const connected = (probe = 'p', ground = 'gnd') => { const s = newScope(); s.channels[0].probe = probe; s.channels[0].ground = ground; return s; };

test('sinusoide: 10 V efficaci, picchi ±14,142 V, periodo 20 ms e frequenza esplicita', () => {
  const e = source();
  vicino(solve([e]).v.p, 0, 1e-12, 'senza tempo il generatore alternato vale zero in continua');
  vicino(solve([e], { ac: true }).v.p, 10, 1e-8, 'compatibilità della soluzione statica efficace');
  vicino(sourceVoltage(e, 0), 0, 1e-12, 'origine'); vicino(sourceVoltage(e, .005), 10 * Math.SQRT2, 1e-12, 'picco positivo');
  vicino(sourceVoltage(e, .015), -10 * Math.SQRT2, 1e-12, 'picco negativo');
  vicino(sourceVoltage(source(10, 1000), .00025), 10 * Math.SQRT2, 1e-12, '1 kHz');
  vicino(sourceVoltage({ ...e, ac: false }, .005), 10, 1e-12, 'la continua resta continua');
  vicino(solve([e], { time: .005 }).v.p, Math.SQRT2 * 10, 1e-8, 'il risolutore usa la sorgente istantanea');
  assert.ok(timeStep([source(10, 1000)]) <= 1 / 128000, 'il passo segue la frequenza');
});

test('quadra simmetrica: il picco coincide con il valore efficace', () => {
  const e = { ...source(3, 1000), wave: 'square' as const };
  assert.equal(sourceVoltage(e, .00025), 3); assert.equal(sourceVoltage(e, .00075), -3);
  const stats = waveformStats(simulate([e], .02).samples.map(s => s.v.p));
  vicino(stats.rms, 3, 1e-8, 'efficace della quadra'); vicino(stats.mean, 0, .04, 'media della quadra');
});

test('statistiche dei campioni: media, efficace totale, efficace alternato e picco-picco', () => {
  const s = waveformStats([1, 3]);
  assert.equal(s.mean, 2); assert.equal(s.rms, Math.sqrt(5)); assert.equal(s.acRms, 1); assert.equal(s.ripple, 2);
  assert.deepEqual(waveformStats([]), { min: 0, max: 0, mean: 0, rms: 0, acRms: 0, ripple: 0 });
});

test('Eulero: primo passo RC noto, carica conservata fra registrazioni e determinismo', () => {
  const circuit: Element[] = [{ ...source(10), ac: false, rs: 1000 }, { id: 'C', kind: 'C', a: 'p', b: 'gnd', farad: .001 }];
  const first = transientStep(circuit, NEW_TRANSIENT, .1);
  vicino(first.state.capV.C, 10 / 11, 1e-8, 'C/dt in parallelo al generatore con memoria nulla');
  const a = simulate(circuit, .1), b = simulate(circuit, .1, a.state), all = simulate(circuit, .2);
  vicino(b.state.capV.C, all.state.capV.C, 1e-9, 'due registrazioni proseguono la stessa carica');
  assert.deepEqual(a, simulate(circuit, .1)); assert.deepEqual(NEW_TRANSIENT, { time: 0, capV: {}, v: {} });
  assert.throws(() => transientStep(circuit, NEW_TRANSIENT, 0));
});

test('filtro RC in alternata: a 50 Hz attenua secondo 1/√(1+(ωRC)²)', () => {
  const circuit: Element[] = [{ ...source(10), rs: 1000 }, { id: 'C', kind: 'C', a: 'p', b: 'gnd', farad: 1e-6 }];
  const frame = captureScope(circuit, connected()).frame;
  vicinoRel(frame.stats[0].acRms, 10 / Math.sqrt(1 + (2 * Math.PI * 50 * .001) ** 2), .008, 'attenuazione RC con ingresso da 1 MΩ');
});

test('i due ingressi da 1 MΩ caricano il circuito e misurano tensioni differenziali', () => {
  const s = connected(), e = { ...source(10), ac: false, rs: 1e6 };
  const one = captureScope([e], s).frame.stats[0]; vicino(one.mean, 5, .0001, 'partitore 1 MΩ + 1 MΩ');
  s.channels[1] = { ...s.channels[1], probe: 'p', ground: s.channels[0].ground };
  const two = captureScope([e], s).frame;
  vicino(two.stats[0].mean, 10 / 3, .0001, 'due ingressi in parallelo, stessa massa'); vicino(two.stats[1].mean, 10 / 3, .0001, 'il secondo canale vede lo stesso punto');
  assert.equal(scopeElements(s).length, 2, 'stessa massa: nessun collegamento in più'); assert.equal(scopeElements(newScope()).length, 0);
  s.channels[1] = { ...s.channels[1], probe: 'gnd', ground: 'p' };
  const corto = captureScope([e], s).frame;
  vicino(corto.stats[0].mean, 0, 1e-4, 'le masse sono in comune: massa 2 sul punto alto lo cortocircuita a massa 1'); assert.equal(scopeElements(s).length, 3, 'due ingressi più il collegamento fra le masse');
  assert.equal(channelVoltage({ time: 0, v: { a: 15, b: 10 } }, { ...s.channels[0], probe: 'a', ground: 'b' }), 5);
});

test('accoppiamento AC: rimuove la media, conserva il ripple e non cambia il carico', () => {
  const s = connected(), samples = [1, 3, 1, 3].map((v, i) => ({ time: i * .01, v: { p: v, gnd: 0 } }));
  s.timeDiv = .01;
  const dc = scopeFrame(samples, s); s.channels[0].coupling = 'ac'; const ac = scopeFrame(samples, s);
  vicino(dc.traces[0][0].y, 3.8, 1e-12, 'DC: 1 V sopra il centro'); vicino(ac.traces[0][0].y, 4.2, 1e-12, 'AC: −1 V sotto il centro');
  assert.equal(ac.stats[0].ripple, dc.stats[0].ripple); assert.equal(scopeElements(s)[0].kind, 'R');
});

test('trigger: solo fronte crescente, interpolazione del livello, corsa libera se manca', () => {
  assert.deepEqual(risingEdges([0, 1, 2, 3], [-1, 1, -1, 1], 0), [.5, 2.5]);
  const s = connected(); s.timeDiv = .001;
  const samples = simulate([source()], .06).samples;
  const f = scopeFrame(samples, s); assert.equal(f.triggered, true); vicino(f.start, .04, .00001, 'ultimo fronte con schermata completa');
  vicino(f.periods[0]!, .02, 1e-8, 'periodo dai fronti misurati');
  s.triggerLevel = 100; assert.equal(scopeFrame(samples, s).triggered, false);
  s.triggerChannel = 1; s.triggerLevel = 0; assert.equal(scopeFrame(samples, s).triggered, false, 'il trigger segue il canale scelto');
});

test('scale: tempo e volt per divisione cambiano solo le coordinate della traccia', () => {
  const s = connected(), samples = simulate([source()], .06).samples, a = scopeFrame(samples, s);
  s.channels[0].voltDiv *= 2; const b = scopeFrame(samples, s);
  vicino(b.traces[0][20].y - 4, (a.traces[0][20].y - 4) / 2, 1e-10, 'scala verticale');
  s.timeDiv *= 2; const c = scopeFrame(samples, s);
  vicino(c.traces[0][1].x - c.traces[0][0].x, (b.traces[0][1].x - b.traces[0][0].x) / 2, 1e-10, 'scala orizzontale');
  assert.equal(SCOPE.columns, 10); assert.equal(SCOPE.rows, 8);
});

test('V~ coincide con il picco diviso √2 e mantiene il carico da 10 MΩ', () => {
  const circuit = [source(6)], probes = { red: 'p', black: 'gnd' };
  const r = read(circuit, { ...NEW_METER, dial: 'vac' }, probes);
  vicino(r.value, 6, 1e-5, '6 V efficaci');
  vicino(read([source(6, 60)], { ...NEW_METER, dial: 'vac' }, probes).value, 6, 1e-5, 'un periodo completo anche a 60 Hz');
  const peak = captureScope(circuit, connected()).frame.stats[0].max;
  vicino(r.value, peak / Math.SQRT2, .0001, 'accordo tra strumenti');
  vicino(read(circuit, { ...NEW_METER, dial: 'vdc' }, probes).value, 0, 1e-8, 'media della sinusoide');
  vicino(read([{ ...source(6), rs: 1e7 }], { ...NEW_METER, dial: 'vac' }, probes).value, 3, .0001, 'carico da 10 MΩ');
  assert.equal(read(circuit, { ...NEW_METER, dial: 'ohm' }, probes).note, 'live', 'alternata presente anche attraversando zero');
});

test('semionda: negativo bloccato, una cresta ogni 20 ms, efficace e media diversi', () => {
  const circuit = sceneElements(rectifier(false, 9, 0, 1000));
  const frame = captureScope(circuit, connected('R1.1', 'R1.2')).frame;
  vicino(frame.stats[0].min, 0, .001, 'semionda negativa bloccata'); const T = rectifier(false, 9, 0, 1000).parts.find(p => p.id === 'T1')!, picco = 9 * 1.12 * Math.SQRT2;
  vicinoRel(frame.stats[0].max, picco - .68 - (picco / 1000) * Number(T.truth.rs), .015, 'picco a vuoto, meno il diodo, meno la caduta sul secondario (resistenza per corrente)');
  vicino(frame.periods[0]!, .02, .0001, 'una cresta per periodo');
  const probes = { red: 'R1.1', black: 'R1.2' };
  vicino(read(circuit, { ...NEW_METER, dial: 'vdc' }, probes).value, frame.stats[0].mean, .001, 'V⎓ legge la media');
  vicino(read(circuit, { ...NEW_METER, dial: 'vac' }, probes).value, frame.stats[0].acRms, .001, 'V~ legge la componente alternata');
});

test('ponte filtrato: picco meno due diodi, ricarica a 100 Hz, ripple e scarica RC', () => {
  const circuit = sceneElements(rectifier(true, 12, 470e-6, 1000)), scope = connected('C1.1', 'C1.2');
  const capture = captureScope(circuit, scope), s = capture.frame.stats[0];
  assert.ok(s.max > 12 * Math.SQRT2 && s.max < 12 * 1.12 * Math.SQRT2 - 1.2, `fra il picco di targa e quello a vuoto meno due diodi: ${s.max}`); vicino(capture.frame.periods[0]!, .01, .0002, '100 Hz');
  // La formula a piccolo ripple trascura la durata finita della ricarica e dà un limite superiore utile.
  const estimate = s.mean / (1000 * 100 * 470e-6);
  assert.ok(s.ripple > estimate * .7 && s.ripple < estimate * 1.05, `ripple ${s.ripple}, stima ${estimate}`);
  const a = capture.samples.find(p => p.time >= .207)!, b = capture.samples.find(p => p.time >= .209)!;
  vicinoRel(channelVoltage(b, scope.channels[0]), channelVoltage(a, scope.channels[0]) * Math.exp(-(b.time - a.time) / .47), .001, 'scarica fra le ricariche');
  const fineInitial = simulate([...circuit, ...scopeElements(scope)], .2, NEW_TRANSIENT, .00005).state;
  const fine = simulate([...circuit, ...scopeElements(scope)], .04, fineInitial, .00005);
  const fineRipple = scopeFrame(fine.samples, scope).stats[0].ripple;
  vicinoRel(s.ripple, fineRipple, .02, 'dimezzare il passo cambia il ripple meno del 2%');
});

test('più capacità riduce il ripple; dimezzare il carico lo aumenta', () => {
  const scene = rectifier(true, 9, 220e-6, 1000), scope = connected('C1.1', 'C1.2');
  const base = captureScope(sceneElements(scene), scope).frame.stats[0].ripple;
  const moreC = captureScope(sceneElements(updateFilter(scene, 440e-6, 1000)), scope).frame.stats[0].ripple;
  const moreLoad = captureScope(sceneElements(updateFilter(scene, 220e-6, 500)), scope).frame.stats[0].ripple;
  assert.ok(moreC < base * .6 && moreC > base * .4); assert.ok(moreLoad > base * 1.6 && moreLoad < base * 2.1);
  assert.equal(updateFilter(scene, -1, 1000), scene);
});

test('banco: gli strumenti condividono il circuito, i sottopassi e la memoria; il fusibile reagisce ai picchi', () => {
  let b = newBench('ac-peak');
  b = apply(b, { type: 'scopeProbe', channel: 0, lead: 'probe', node: 'T1.1' });
  b = apply(b, { type: 'scopeProbe', channel: 0, lead: 'ground', node: 'T1.2' });
  assert.equal(apply(b, { type: 'scopeProbe', channel: 1, lead: 'probe', node: 'inesistente' }), b);
  b = apply(apply(apply(b, { type: 'probe', color: 'red', node: 'T1.1' }), { type: 'probe', color: 'black', node: 'T1.2' }), { type: 'dial', dial: 'vac' });
  const t = tick(b, .05); vicino(t.bench.time, .05, 1e-12, 'tempo elettrico'); assert.ok(t.bench.samples.length >= 500);
  vicino(t.reading.value, scopeFrame(t.bench.samples.slice(-200), b.scope).stats[0].acRms, .001, 'gli stessi campioni');
  const blown = tick(apply(t.bench, { type: 'jack', jack: 'ma' }), .05).bench;
  const botto = tick(apply(t.bench, { type: 'jack', jack: 'ma' }), .05);
  assert.equal(botto.reading.blew, 'ma', 'anche in alternata il fusibile che salta si annuncia (suono e pulsante)'); assert.equal(botto.reading.note, 'fuse');
  assert.equal(blown.meter.fuseMaBlown, true); assert.equal(blown.fusesBlown, 1); assert.equal(tick(blown, .05).bench.fusesBlown, 1);
  assert.equal(tick(blown, .05).reading.blew, null, 'salta una volta sola');
});

test('comandi del filtro: varianti esplorabili e ripristino, senza perdere la tensione di C', () => {
  let b = newBench('bridge-ripple', 1); b = tick(b, .05).bench;
  const original = b.scene.parts.find(p => p.id === 'C1')!.truth.farad;
  const loaded = apply(b, { type: 'filter', setting: 'load' });
  assert.equal(loaded.scene.parts.find(p => p.id === 'R1')!.truth.ohm, Number(b.scene.parts.find(p => p.id === 'R1')!.truth.ohm) / 2);
  const doubled = apply(b, { type: 'filter', setting: 'capacity' });
  assert.equal(doubled.scene.parts.find(p => p.id === 'C1')!.truth.farad, Number(original) * 2);
  assert.deepEqual(doubled.capV, b.capV); assert.deepEqual(doubled.samples, []);
  assert.deepEqual(apply(doubled, { type: 'filter', setting: 'reset' }).scene, b.scene);
  assert.equal(TRANSIENT.defaultHz, 50);
});


test('banco: multimetro e oscilloscopio caricano insieme una sorgente ad alta resistenza', () => {
  let b = newBench(null, 0, 'b-9v');
  b = { ...b, scene: { ...b.scene, parts: b.scene.parts.map(p => ({ ...p, elements: [{ ...source(10), ac: false, a: 'X1.1', b: 'X1.2', rs: 1e6 }] })) } };
  b = apply(apply(b, { type: 'scopeProbe', channel: 0, lead: 'probe', node: 'X1.1' }), { type: 'scopeProbe', channel: 0, lead: 'ground', node: 'X1.2' });
  b = apply(apply(apply(b, { type: 'probe', color: 'red', node: 'X1.1' }), { type: 'probe', color: 'black', node: 'X1.2' }), { type: 'dial', dial: 'vdc' });
  const t = tick(b, .05);
  vicino(t.reading.value, 10 / 2.1, .0001, '1 MΩ di sorgente su 1 MΩ ∥ 10 MΩ');
  vicino(scopeFrame(t.bench.samples, b.scope).stats[0].mean, t.reading.value, 1e-10, 'i due strumenti vedono lo stesso circuito');
});

// ---- dalla revisione critica (2026-11-25)

test('accoppiamento AC: media ed efficace su un numero intero di periodi, qualunque sia la finestra', () => {
  for (const [hz, td] of [[50, 0.001], [100, 0.0005], [50, 0.002], [50, 0.0005]] as const) {
    const g: Element = { id: 'G', kind: 'V', a: 'p', b: 'gnd', volt: 3, rs: 1, ac: true, hz };
    const s = connected('p', 'gnd'); s.timeDiv = td; s.channels[0] = { ...s.channels[0], coupling: 'ac' };
    const f = captureScope([g], s).frame;
    vicino(f.stats[0].mean, 0, 0.02, `${hz} Hz a ${td * 1000} ms/div: media zero`); vicinoRel(f.stats[0].acRms, 3, 0.01, `${hz} Hz a ${td * 1000} ms/div: efficace giusto`);
  }
  assert.deepEqual(wholePeriods([0, 1], [1, 2]), [1, 2], 'troppo pochi campioni: tutti');
});
