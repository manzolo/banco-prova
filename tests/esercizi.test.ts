// Prove degli esercizi. La più importante: ogni esercizio si risolve davvero CON IL MULTIMETRO, senza guardare la
// verità del componente. Per ognuno c'è qui il procedimento che farebbe una persona, scritto come misure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_EN, CHAPTERS, DRAWER, EXERCISES, buildExercise, checkAnswer, feedbackFor, rng, type Exercise } from '../shared/exercises.ts';
import { NEW_METER, read, type Dial, type Jack, type Reading } from '../shared/meter.ts';
import { decodeBands, decodeCapacitorCode } from '../shared/parts.ts';
import { flipSwitch, loop, padPositions, row, sceneElements, scenePads, type Scene } from '../shared/scene.ts';
import { battery, diode, resistor, toggle } from '../shared/parts.ts';
import { cursorReading, scopeFrame, type ScopeState, type ScreenPoint } from '../shared/scope.ts';
import { apply, newBench, tick } from '../shared/game.ts';
import { SCOPE } from '../shared/config.ts';
import { vicino } from './aiuti.ts';

const misura = (s: Scene, dial: Dial, red: string, black: string, jack: Jack = 'v', o: { capV?: Record<string, number>; dt?: number } = {}): Reading => read(sceneElements(s), { ...NEW_METER, dial, jack }, { red, black }, o);
const piedini = (e: Exercise, i: number): string[] => e.scene.parts[i].pads;
const conduce = (s: Scene, a: string, b: string): boolean => misura(s, 'diode', a, b).display !== 'OL';

/** Come si risolve ogni esercizio usando solo ciò che si vede (bande, sigle) e ciò che dice il multimetro. */
// L'oscilloscopio si usa come una persona: sul banco vero (gli stessi passi del gioco), sceglie la scala più piccola che
// tiene la traccia sullo schermo, guarda la traccia disegnata e posa i due cursori. Niente statistiche automatiche.
function schermo(e: Exercise, node: string, ground: string, o: { coupling?: 'dc' | 'ac'; timeDiv?: number; settle?: number } = {}): { scope: ScopeState; punti: ScreenPoint[] } {
  let b = newBench(e.id, 0); b = { ...b, exercise: e, scene: e.scene };
  b = apply(b, { type: 'scopeProbe', channel: 0, lead: 'probe', node }); b = apply(b, { type: 'scopeProbe', channel: 0, lead: 'ground', node: ground });
  let scope: ScopeState = { ...b.scope, timeDiv: o.timeDiv ?? b.scope.timeDiv, channels: [{ ...b.scope.channels[0], coupling: o.coupling ?? 'dc' }, b.scope.channels[1]] };
  b = apply(b, { type: 'scope', scope });
  for (let t = 0; t < (o.settle ?? 0.3); t += 0.05) b = tick(b, 0.05).bench;
  // la scala più piccola con cui tutta la traccia sta dentro lo schermo
  for (const vd of SCOPE.volts) { const prova = { ...scope, channels: [{ ...scope.channels[0], voltDiv: vd }, scope.channels[1]] as ScopeState['channels'] };
    if (scopeFrame(b.samples, prova).traces[0].every(p => p.y >= 0 && p.y <= SCOPE.rows)) { scope = prova; break; } }
  return { scope, punti: scopeFrame(b.samples, scope).traces[0] };
}
/** I due cursori su cresta e valle (o sulla cresta e sulla riga dello zero) della traccia disegnata. */
const alto = (pp: ScreenPoint[]): ScreenPoint => pp.reduce((a, p) => p.y < a.y ? p : a), basso = (pp: ScreenPoint[]): ScreenPoint => pp.reduce((a, p) => p.y > a.y ? p : a);
/** Due creste successive: i due massimi locali più alti, separati da almeno un quarto di schermo. */
function dueCreste(pp: ScreenPoint[]): [ScreenPoint, ScreenPoint] {
  const top = Math.min(...pp.map(p => p.y)), creste = pp.filter((p, i) => i > 0 && i < pp.length - 1 && p.y <= pp[i - 1].y && p.y <= pp[i + 1].y && p.y < top + 0.05);
  const a = creste[0], b = creste.find(p => p.x > a.x + 0.3)!; return [a, b];
}
const PROCEDIMENTI: Record<string, (e: Exercise) => number> = {
  'ac-peak': e => { const s = schermo(e, 'T1.1', 'T1.2'); return cursorReading(s.scope, 0, alto(s.punti), { x: 0, y: SCOPE.rows / 2 }).dv; },
  'ac-frequency': e => { const hz = e.scene.parts[0].elements[0]; void hz;            // la frequenza non si guarda: si prova con tre basi dei tempi
    for (const td of [0.005, 0.002, 0.0005, 0.0002]) { const s = schermo(e, 'G1.1', 'G1.2', { timeDiv: td }); try { const [a, b] = dueCreste(s.punti); const c = cursorReading(s.scope, 0, a, b); if (b.x - a.x > 2) return c.hz!; } catch { /* poche creste: si cambia scala */ } }
    return NaN; },
  'half-wave': e => { const s = schermo(e, 'R1.1', 'R1.2'); return cursorReading(s.scope, 0, alto(s.punti), { x: 0, y: SCOPE.rows / 2 }).dv; },
  'bridge-ripple': e => { const s = schermo(e, 'C1.1', 'C1.2', { coupling: 'ac', settle: 0.5 }); return cursorReading(s.scope, 0, alto(s.punti), basso(s.punti)).dv; },
  colori: e => { const ohm = decodeBands(e.scene.parts[0].view.bands as string[]).ohm; return ohm >= 1e6 ? ohm / 1e6 : ohm >= 1e3 ? ohm / 1e3 : ohm; },
  tolleranza: e => { const nominale = decodeBands(e.scene.parts[0].view.bands as string[]).ohm, [a, b] = piedini(e, 0); return Math.abs(misura(e.scene, 'ohm', a, b).value / nominale - 1) <= 0.05 ? 0 : 1; },
  interrotta: e => e.scene.parts.findIndex(p => misura(e.scene, 'ohm', p.pads[0], p.pads[1]).display === 'OL'),
  'serie-parallelo': e => misura(e.scene, 'ohm', 'R1.1', 'R2.2').value / 1000,
  catodo: e => { const [a, b] = piedini(e, 0); return conduce(e.scene, a, b) ? 1 : 0; },      // conduce col rosso a sinistra: il catodo è a destra
  'tre-diodi': e => e.scene.parts.findIndex(p => conduce(e.scene, p.pads[0], p.pads[1]) !== conduce(e.scene, p.pads[1], p.pads[0])),
  'che-diodo': e => { const [a, b] = piedini(e, 0), v = conduce(e.scene, a, b) ? misura(e.scene, 'diode', a, b).value : misura(e.scene, 'diode', b, a).value; return v < 0.4 ? 1 : v < 1 ? 0 : 2; },
  zener: e => misura(e.scene, 'vdc', 'Z1.1', 'Z1.2').value,
  'codice-condensatore': e => decodeCapacitorCode(e.scene.parts[0].mark) * 1e9,
  elettrolitici: e => { const letti = e.scene.parts.map(p => misura(e.scene, 'cap', p.pads[0], p.pads[1])); const max = Math.max(...letti.map(l => Number.isFinite(l.value) ? l.value : 0)); return letti.findIndex(l => l.value === max); },
  carica: e => { const [a, b] = piedini(e, 0); let capV: Record<string, number> = {}, ultima = misura(e.scene, 'ohm', a, b, 'v', { capV, dt: 0.05 });
    for (let i = 0; i < 400; i++) { ultima = misura(e.scene, 'ohm', a, b, 'v', { capV, dt: 0.05 }); capV = ultima.solution.capV; } return ultima.display === 'OL' ? 0 : 1; },
  bobina: e => e.scene.parts.findIndex(p => !misura(e.scene, 'cont', p.pads[0], p.pads[1]).beep),
  fusibili: e => e.scene.parts.findIndex(p => !misura(e.scene, 'cont', p.pads[0], p.pads[1]).beep),
  pila: e => misura(flipSwitch(e.scene, 'S1'), 'vdc', 'B1.1', 'B1.2').value,
  trasformatore: e => misura(e.scene, 'vac', 'T1.1', 'T1.2').value,
  partitore: e => misura(e.scene, 'vdc', 'R2.1', 'R2.2').value,
  'corrente-led': e => misura(flipSwitch(e.scene, 'S1'), 'ma', 'S1.1', 'S1.2', 'ma').value * 1000,
  guasto: e => { const v = (n: string): number => misura(e.scene, 'vdc', n, 'B1.2').value, alta = (x: number): boolean => x > 4;
    if (alta(v('R1.1')) && !alta(v('R1.2'))) return 0;                       // la tensione si ferma sulla resistenza
    if (alta(v('S1.1')) && !alta(v('S1.2'))) return 3;                       // si ferma sul ponticello
    const spento: Scene = { ...e.scene, parts: e.scene.parts.filter(p => p.type !== 'battery'), wires: e.scene.wires.filter(w => w.id !== 'w.s' && w.id !== 'w.r') };
    return conduce(spento, 'L1.1', 'L1.2') || conduce(spento, 'L1.2', 'L1.1') ? 1 : 2; },   // arriva al LED: se a pila tolta conduce in un verso è montato al contrario, se no è interrotto
  base: e => { const p = piedini(e, 0); return [0, 1, 2].find(i => { const altri = [0, 1, 2].filter(j => j !== i); return altri.every(j => conduce(e.scene, p[i], p[j])) || altri.every(j => conduce(e.scene, p[j], p[i])); })!; },
  'npn-pnp': e => { const p = piedini(e, 0), base = [0, 1, 2].find(i => [0, 1, 2].filter(j => j !== i).every(j => conduce(e.scene, p[i], p[j]))); return base !== undefined ? 0 : 1; },
};

test('gli esercizi sono ventiquattro, con identificativi unici, in sette capitoli', () => {
  assert.equal(EXERCISES.length, 24); assert.equal(new Set(EXERCISES.map(e => e.id)).size, 24); assert.equal(CHAPTERS.length, 7);
  assert.deepEqual(Object.keys(PROCEDIMENTI).sort(), EXERCISES.map(e => e.id).sort(), 'ogni esercizio ha il suo procedimento');
  assert.throws(() => buildExercise('niente', 0));
});

test('ogni esercizio, in venti varianti, si risolve con le misure degli strumenti', () => {
  for (const d of EXERCISES) for (let variante = 0; variante < 20; variante++) {
    const e = d.build(variante), risposta = PROCEDIMENTI[d.id](e);
    assert.equal(checkAnswer(e.question, risposta), true, `${d.id}, variante ${variante}: il procedimento dà ${risposta}, attesa ${JSON.stringify(e.question)}`);
    assert.ok(e.text.length > 30 && e.hint.length > 30 && e.explain.length > 30, `${d.id}: testi presenti`);
  }
});

test('le varianti cambiano davvero, e la stessa variante è sempre uguale', () => {
  for (const d of EXERCISES) {
    assert.deepEqual(d.build(3), d.build(3), `${d.id}: ripetibile`);
    const risposte = new Set(Array.from({ length: 20 }, (_, v) => { const q = d.build(v).question; return q.kind === 'choice' ? q.correct : q.expected; }));
    assert.ok(risposte.size >= 2, `${d.id}: in venti varianti la risposta cambia almeno una volta (${[...risposte].join(', ')})`);
  }
  const a = rng(42), b = rng(42); for (let i = 0; i < 5; i++) assert.equal(a(), b()); assert.notEqual(rng(1)(), rng(2)()); const x = rng(7)(); assert.ok(x >= 0 && x < 1);
});

test('nelle domande a scelta la risposta giusta non è sempre nello stesso posto', () => {
  for (const d of EXERCISES) { const q0 = d.build(0).question; if (q0.kind !== 'choice') continue;
    const posti = new Set(Array.from({ length: 30 }, (_, v) => (d.build(v).question as { correct: number }).correct));
    assert.equal(posti.size, q0.options.length, `${d.id}: in trenta varianti escono tutte le ${q0.options.length} risposte`); }
});

test('la correzione: tolleranza sui numeri, esattezza sulle scelte, niente NaN', () => {
  const n = { kind: 'number' as const, unit: 'V', expected: 5, tolerancePct: 2 };
  assert.equal(checkAnswer(n, 5.1), true); assert.equal(checkAnswer(n, 4.9), true); assert.equal(checkAnswer(n, 5.11), false); assert.equal(checkAnswer(n, NaN), false); assert.equal(checkAnswer(n, Infinity), false);
  const c = { kind: 'choice' as const, options: ['a', 'b'], correct: 1 }; assert.equal(checkAnswer(c, 1), true); assert.equal(checkAnswer(c, 0), false); assert.equal(checkAnswer(c, NaN), false);
  assert.equal(checkAnswer({ ...n, expected: -5 }, -5.05), true, 'vale anche per i valori negativi');
});

test('un LED blu, il diodo girato e le unità: tre trappole degli esercizi', () => {
  for (let v = 0; v < 20; v++) { const e = buildExercise('colori', v), q = e.question as { unit: string; expected: number }; assert.ok(q.expected >= 1 && q.expected < 1000, `colori: il numero da scrivere sta fra 1 e 999 ${q.unit}`); }
  for (let v = 0; v < 20; v++) { const e = buildExercise('corrente-led', v); assert.ok((e.question as { expected: number }).expected > 5 && (e.question as { expected: number }).expected < 25, 'correnti da LED'); }
  for (let v = 0; v < 20; v++) { const e = buildExercise('guasto', v); assert.ok(Math.abs(misura(e.scene, 'vdc', 'L1.1', 'L1.2').solution.current('L1.d')) < 1e-4, 'nel circuito guasto il LED è davvero spento'); }
  for (let v = 0; v < 20; v++) { const e = buildExercise('pila', v); assert.equal(e.scene.parts.find(p => p.id === 'S1')!.truth.closed, false, 'la pila parte col carico staccato'); }
});

test('la fila: pezzi sciolti, non collegati, ognuno coi suoi piedini', () => {
  const s = row([resistor('R1', 100), resistor('R2', 220), diode('D1', '1N4148')]);
  assert.equal(s.wires.length, 0); assert.equal(scenePads(s).length, 6); assert.deepEqual(s.place.R2, { x: 310, y: 110, vertical: false });
  assert.deepEqual(padPositions(s.parts[0], s.place.R1).map(p => [p.x, p.y]), [[70, 110], [170, 110]]);
  assert.equal(row([resistor('R1', 100)]).place.R1.x, 210, 'un pezzo solo sta al centro di una scena larga 420'); assert.equal(row([resistor('R1', 100)]).width, 420);
  assert.equal(misura(s, 'ohm', 'R1.1', 'R2.2').display, 'OL', 'fra due pezzi diversi non c\'è collegamento');
});

test('l\'anello: il generatore, i pezzi in serie, quelli in parallelo e la chiusura', () => {
  const s = loop(battery('B1', '9v', 1), [resistor('R1', 1000), toggle('S1', true), resistor('R2', 1000)], { closed: true });
  vicino(misura(s, 'vdc', 'R2.1', 'R2.2').value, 9.6 * 1000 / 2002.02, 0.005, 'metà della pila su R2');
  assert.equal(s.place.B1.vertical, true); assert.equal(s.place.R1.vertical, false); assert.ok(s.lines.length >= 5);
  const aperto = flipSwitch(s, 'S1'); assert.ok(Math.abs(misura(aperto, 'vdc', 'R2.1', 'R2.2').value) < 0.01, 'ponticello aperto: su R2 non c\'è più tensione');
  vicino(misura(aperto, 'vdc', 'S1.1', 'S1.2').value, 9.6, 0.01, 'e tutta la tensione sta ai capi del ponticello');
  assert.equal(flipSwitch(s, 'R1').parts.find(p => p.id === 'R1')!.type, 'resistor', 'una resistenza non è un ponticello');
  const par = loop(null, [resistor('R1', 1000)], { shunts: [{ after: 0, part: resistor('R2', 2200) }, { after: 0, part: resistor('R3', 3300) }] });
  vicino(misura(par, 'ohm', 'R1.1', 'R2.2').value, 1000 + 2200 * 3300 / 5500, 0.5, 'R1 + R2∥R3 = 2320 Ω'); assert.notEqual(par.place.R2.x, par.place.R3.x, 'i due pezzi in parallelo non si sovrappongono');
  assert.equal(par.parts.length, 3); assert.equal(scenePads(par).length, 6);
});

test('il cassetto del banco libero: sedici pezzi, tutti misurabili', () => {
  assert.equal(DRAWER.length, 16); assert.equal(new Set(DRAWER.map(d => d.id)).size, 16);
  for (const d of DRAWER) { const s = row([d.make()]); assert.ok(scenePads(s).length >= 2, d.name); assert.ok(Number.isFinite(misura(s, 'vdc', s.parts[0].pads[0], s.parts[0].pads[1]).value), d.name); }
});

test('chi scrive il valore misurato al posto del nominale viene corretto con una spiegazione, non con un «no» e basta', () => {
  for (let v = 0; v < 20; v++) {
    const e = buildExercise('colori', v), q = e.question as { expected: number; unit: string; tolerancePct: number }, [a, b] = e.scene.parts[0].pads;
    const scala = q.unit === 'MΩ' ? 1e6 : q.unit === 'kΩ' ? 1e3 : 1, letto = misura(e.scene, 'ohm', a, b).value / scala;
    if (checkAnswer(e.question, letto)) continue;                       // il pezzo è quasi esatto: il valore letto va bene anche come risposta
    assert.match(feedbackFor(e.question, letto) ?? '', /valore misurato/, `variante ${v}: ${letto} invece di ${q.expected}`);
    assert.equal(feedbackFor(e.question, q.expected * 3), null, 'uno sbaglio qualunque non ha spiegazioni');
  }
  const e = buildExercise('colori', 0), q = e.question as { expected: number };
  assert.equal(feedbackFor(e.question, q.expected), null, 'una risposta giusta non ha bisogno di spiegazioni');
  assert.equal(feedbackFor(buildExercise('interrotta', 0).question, 0), null, 'le domande a scelta non ne hanno');
  const vicinissimo = { kind: 'number' as const, unit: 'V', expected: 5, tolerancePct: 2, near: { value: 5.05, tolerancePct: 1, message: 'misurato' } };
  assert.equal(feedbackFor(vicinissimo, 5.04), null, 'una risposta giusta che è anche vicina al misurato non riceve la spiegazione dello sbaglio');
  for (let v = 0; v < 20; v++) {
    const c = buildExercise('codice-condensatore', v), real = (c.scene.parts[0].truth.real as number) * 1e9;
    if (!checkAnswer(c.question, real)) assert.match(feedbackFor(c.question, real) ?? '', /capacimetro/, `condensatore, variante ${v}`);
  }
  assert.match(buildExercise('colori', 0).text, /nominale/, 'il testo dice che si vuole il nominale');
});

test('gli esercizi in inglese: stessa scena e stessa risposta, testi tradotti, numeri col punto', () => {
  const ITALIANO = /(?<![\p{L}])(il|della|è|puntale|puntali|misura|resistenza|selettore|quale|sinistra)(?![\p{L}])/iu;
  const testi = (e: Exercise): string[] => [e.title, e.text, e.hint, e.explain, ...(e.question.kind === 'choice' ? e.question.options : []), ...(e.question.kind === 'number' && e.question.near ? [e.question.near.message] : [])];
  for (const d of EXERCISES) for (let v = 0; v < 5; v++) {
    const it = d.build(v, 'it'), en = d.build(v, 'en'), dove = `${d.id}, variante ${v}`;
    assert.deepEqual(en, buildExercise(d.id, v, 'en'), `${dove}: build e buildExercise danno lo stesso esercizio`);
    assert.deepEqual(it, d.build(v), `${dove}: l'italiano è la lingua di default`);
    assert.deepEqual(en.scene, it.scene, `${dove}: la scena non dipende dalla lingua`);
    const qi = it.question, qe = en.question;
    if (qi.kind === 'number' && qe.kind === 'number') {
      assert.deepEqual([qe.unit, qe.expected, qe.tolerancePct, qe.near?.value, qe.near?.tolerancePct], [qi.unit, qi.expected, qi.tolerancePct, qi.near?.value, qi.near?.tolerancePct], `${dove}: stessa domanda numerica`);
    } else if (qi.kind === 'choice' && qe.kind === 'choice') {
      assert.equal(qe.correct, qi.correct, `${dove}: stessa risposta giusta`); assert.equal(qe.options.length, qi.options.length, `${dove}: stesse scelte`);
    } else assert.fail(`${dove}: il tipo di domanda cambia con la lingua`);
    const ti = testi(it), te = testi(en);
    te.forEach((s, i) => {
      if (!/^[A-Z]+$/.test(s)) assert.notEqual(s, ti[i], `${dove}: «${s}» non è tradotto`);      // NPN e PNP restano uguali
      assert.doesNotMatch(s, ITALIANO, `${dove}: parola italiana in «${s}»`);
      assert.doesNotMatch(s, /\d,\d/, `${dove}: virgola decimale in «${s}»`);
    });
  }
  for (const c of CHAPTERS) assert.ok(CHAPTER_EN[c] && CHAPTER_EN[c] !== c, `capitolo ${c} senza nome inglese`);
  for (const d of DRAWER) { assert.ok(d.nameEn && d.nameEn !== d.name, `cassetto ${d.id}`); assert.doesNotMatch(d.nameEn, /\d,\d/, d.nameEn); }
  for (const d of EXERCISES) assert.ok(d.titleEn && d.titleEn !== d.title, `titolo inglese di ${d.id}`);
});

test('chi scrive l\'efficace al posto del picco, o la targa al posto del misurato, riceve la spiegazione', () => {
  for (let v = 0; v < 8; v++) {
    const e = buildExercise('ac-peak', v), q = e.question as { expected: number };
    assert.match(feedbackFor(e.question, q.expected / Math.SQRT2) ?? '', /valore efficace/, `picco, variante ${v}`);
    const t = buildExercise('trasformatore', v), targa = Number(t.scene.parts[0].truth.voltRms);
    assert.match(feedbackFor(t.question, targa) ?? '', /targa/, `trasformatore, variante ${v}`);
    assert.equal(checkAnswer(t.question, targa), false, 'la targa non è la risposta: a vuoto dà di più');
  }
});

test('i cursori: la riga centrale è lo zero, in su positivo, e la scala è quella del canale 1', () => {
  const s = newBench('ac-peak').scope; s.channels[0] = { ...s.channels[0], voltDiv: 5 }; s.timeDiv = 0.002;
  const c = cursorReading(s, 0, { x: 1, y: 2 }, { x: 6, y: 4 });
  vicino(c.va, 10, 1e-9, 'due divisioni sopra il centro, a 5 V/div: +10 V'); vicino(c.vb, 0, 1e-9, 'sulla riga centrale: 0 V');
  vicino(c.dv, 10, 1e-9, 'ΔV'); vicino(c.dt, 0.01, 1e-12, 'cinque divisioni a 2 ms/div'); vicino(c.hz!, 100, 1e-9, '1/Δt');
  vicino(cursorReading(s, 0, { x: 0, y: 6 }, { x: 0, y: 6 }).va, -10, 1e-9, 'sotto il centro: negativo'); assert.equal(cursorReading(s, 0, { x: 3, y: 1 }, { x: 3, y: 2 }).hz, null, 'Δt zero: niente frequenza');
});
