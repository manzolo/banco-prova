// Lo stato del banco e le sue azioni: funzioni pure. Il client chiama apply() per ogni gesto e tick() a ogni passo:
// tick fa passare il tempo (i condensatori si caricano attraverso il multimetro) e restituisce la lettura.
import { buildExercise, checkAnswer, DRAWER, feedbackFor, type Exercise, type Lang } from './exercises.ts';
import { NEW_METER, read, meterElements, type Dial, type Jack, type MeterState, type Probes, type Reading } from './meter.ts';
import { updateFilter, flipSwitch, row, sceneElements, scenePads, type Scene } from './scene.ts';

import { newScope, scopeElements, type ScopeState } from './scope.ts';
import { measurementWindow, timeStep, transientStep, type Sample } from './transient.ts';
import { METER, SCOPE } from './config.ts';

export interface Bench {
  exercise: Exercise | null;          // null: banco libero
  variant: number;
  scope: ScopeState; time: number; samples: Sample[];
  scene: Scene; meter: MeterState; probes: Probes;
  capV: Record<string, number>;       // tensione dei condensatori in questo momento
  fusesBlown: number;                 // fusibili del multimetro bruciati in questa partita
  usedHint: boolean; tries: number; solved: boolean;
}
export type Action =
  | { type: 'scope'; scope: ScopeState }
  | { type: 'scopeProbe'; channel: 0 | 1; lead: 'probe' | 'ground'; node: string | null }
  | { type: 'filter'; setting: 'capacity' | 'load' | 'reset' }
  | { type: 'dial'; dial: Dial } | { type: 'jack'; jack: Jack }
  | { type: 'probe'; color: 'red' | 'black'; node: string | null }
  | { type: 'switch'; partId: string } | { type: 'replaceFuse'; jack: 'ma' | 'a' } | { type: 'hint' } | { type: 'discharge' };

export function newBench(exerciseId: string | null, variant = 0, drawerId = DRAWER[0].id, lang: Lang = 'it'): Bench {
  const exercise = exerciseId === null ? null : buildExercise(exerciseId, variant, lang);
  const libero = DRAWER.find(d => d.id === drawerId) ?? DRAWER[0];
  return { exercise, variant, scope: newScope(), time: 0, samples: [], scene: exercise ? exercise.scene : row([libero.make()]), meter: { ...NEW_METER }, probes: { red: null, black: null }, capV: {}, fusesBlown: 0, usedHint: false, tries: 0, solved: false };
}

/** Applica un gesto. Un piedino che non esiste, o un ponticello che non è un ponticello, lascia tutto com'è. */
export function apply(b: Bench, a: Action): Bench {
  switch (a.type) {
    case 'scope': return { ...b, scope: a.scope };
    case 'scopeProbe': {
      if (a.node !== null && !scenePads(b.scene).some(p => p.node === a.node)) return b;      // la sonda dell'oscilloscopio non si posa nel vuoto
      const scope = { ...b.scope, channels: b.scope.channels.map((c, i) => i === a.channel ? { ...c, [a.lead]: a.node } : c) as ScopeState['channels'] };
      return { ...b, scope, samples: [] };
    }
    case 'filter': {
      const original = b.exercise?.scene;
      if (!original?.parts.some(p => p.type === 'bridge')) return b;
      const capacity = Number(original.parts.find(p => p.id === 'C1')!.truth.farad) * (a.setting === 'capacity' ? 2 : 1);
      const load = Number(original.parts.find(p => p.id === 'R1')!.truth.ohm) / (a.setting === 'load' ? 2 : 1);
      return { ...b, scene: updateFilter(b.scene, capacity, load), samples: [] };
    }

    case 'dial': return { ...b, meter: { ...b.meter, dial: a.dial } };
    case 'jack': return { ...b, meter: { ...b.meter, jack: a.jack } };
    case 'probe': {
      if (a.node !== null && !scenePads(b.scene).some(p => p.node === a.node)) return b;
      const altro = a.color === 'red' ? 'black' : 'red';
      // i due puntali possono stare sullo stesso piedino: è il modo di «azzerare» lo strumento
      return { ...b, probes: { ...b.probes, [a.color]: a.node, [altro]: b.probes[altro] } };
    }
    case 'switch': return b.scene.parts.some(p => p.id === a.partId && p.type === 'switch') ? { ...b, samples: [], scene: flipSwitch(b.scene, a.partId) } : b;
    case 'replaceFuse': {
      const era = a.jack === 'ma' ? b.meter.fuseMaBlown : b.meter.fuseABlown;
      return era ? { ...b, meter: { ...b.meter, ...(a.jack === 'ma' ? { fuseMaBlown: false } : { fuseABlown: false }) } } : b;
    }
    case 'hint': return { ...b, usedHint: true };
    case 'discharge': return { ...b, capV: {}, samples: [] };
  }
}

/** Fa passare «dt» secondi e legge il multimetro. Se la misura brucia un fusibile, lo stato lo ricorda. */
export function tick(b: Bench, dt: number): { bench: Bench; reading: Reading } {
  const scene = [...sceneElements(b.scene), ...scopeElements(b.scope)];
  const moving = scene.some(e => e.kind === 'V' && e.ac) || b.scope.channels.some(c => c.probe && c.ground);
  let reading: Reading;
  if (moving) {
    const count = Math.ceil(dt / timeStep(scene)), step = dt / count;
    let state = { time: b.time, capV: b.capV, v: b.samples.at(-1)?.v ?? {} }, meter = b.meter;
    const samples: Sample[] = [], blown: Jack[] = [];
    let solution;
    for (let i = 0; i < count; i++) {
      const t = transientStep([...scene, ...meterElements(meter, b.probes)], state, step);
      state = t.state; solution = t.solution;
      if (Math.abs(solution.current('M.shunt')) > (meter.jack === 'ma' ? METER.fuseMaAmp : METER.fuseAAmp)) {
        blown.push(meter.jack);
        meter = { ...meter, fuseMaBlown: meter.fuseMaBlown || meter.jack === 'ma', fuseABlown: meter.fuseABlown || meter.jack === 'a' };
      }
      samples.push({ time: state.time, v: state.v });
    }
    const keep = Math.max(2.2 * measurementWindow(scene), b.scope.timeDiv * SCOPE.columns * 3);   // più di due periodi: media e AC su periodi interi
    const history = [...b.samples, ...samples].filter(s => s.time > state.time - keep);
    const values = history.filter(s => s.time > state.time - measurementWindow(scene) + step / 2).map(s => b.probes.red && b.probes.black ? (s.v[b.probes.red] ?? 0) - (s.v[b.probes.black] ?? 0) : 0);
    b = { ...b, meter, time: state.time, samples: history };
    reading = read(scene, meter, b.probes, { time: state.time, dt: step, capV: state.capV, solution, values });
    if (blown.length) reading = { ...reading, note: 'fuse', blew: blown[0] };      // come in continua: il client fa il botto e mostra il cambio
  } else reading = read(scene, b.meter, b.probes, { capV: b.capV, dt });
  const meter = reading.blew ? { ...b.meter, fuseMaBlown: b.meter.fuseMaBlown || reading.blew === 'ma', fuseABlown: b.meter.fuseABlown || reading.blew === 'a' } : b.meter;
  return { bench: { ...b, meter, capV: reading.solution.capV, fusesBlown: b.fusesBlown + (reading.blew ? 1 : 0) }, reading };
}

/** Quanta corrente passa in un componente della scena, col multimetro com'è adesso (serve a far brillare i LED). */
export function partCurrent(reading: Reading, partId: string): number {
  return Math.abs(reading.solution.current(`${partId}.d`));
}

export interface Verdict { correct: boolean; stars: 0 | 1 | 2 | 3; bench: Bench; feedback: string | null }
/** Dà la risposta all'esercizio. Tre stelle al primo colpo senza aiuto; una in meno con l'aiuto, una in meno dal secondo tentativo, una in meno se si è bruciato un fusibile; mai meno di una se è giusta. */
export function answer(b: Bench, value: number): Verdict {
  if (!b.exercise || b.solved) return { correct: false, stars: 0, bench: b, feedback: null };
  const correct = checkAnswer(b.exercise.question, value), tries = b.tries + 1;
  const stars = correct ? Math.max(1, 3 - (b.usedHint ? 1 : 0) - (tries > 1 ? 1 : 0) - (b.fusesBlown > 0 ? 1 : 0)) as 1 | 2 | 3 : 0;
  return { correct, stars, bench: { ...b, tries, solved: correct }, feedback: correct ? null : feedbackFor(b.exercise.question, value) };
}
