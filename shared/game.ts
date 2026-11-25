// Lo stato del banco e le sue azioni: funzioni pure. Il client chiama apply() per ogni gesto e tick() a ogni passo:
// tick fa passare il tempo (i condensatori si caricano attraverso il multimetro) e restituisce la lettura.
import { buildExercise, checkAnswer, DRAWER, feedbackFor, type Exercise } from './exercises.ts';
import { NEW_METER, read, type Dial, type Jack, type MeterState, type Probes, type Reading } from './meter.ts';
import { flipSwitch, row, sceneElements, scenePads, type Scene } from './scene.ts';

export interface Bench {
  exercise: Exercise | null;          // null: banco libero
  variant: number;
  scene: Scene; meter: MeterState; probes: Probes;
  capV: Record<string, number>;       // tensione dei condensatori in questo momento
  fusesBlown: number;                 // fusibili del multimetro bruciati in questa partita
  usedHint: boolean; tries: number; solved: boolean;
}
export type Action =
  | { type: 'dial'; dial: Dial } | { type: 'jack'; jack: Jack }
  | { type: 'probe'; color: 'red' | 'black'; node: string | null }
  | { type: 'switch'; partId: string } | { type: 'replaceFuse'; jack: 'ma' | 'a' } | { type: 'hint' } | { type: 'discharge' };

export function newBench(exerciseId: string | null, variant = 0, drawerId = DRAWER[0].id): Bench {
  const exercise = exerciseId === null ? null : buildExercise(exerciseId, variant);
  const libero = DRAWER.find(d => d.id === drawerId) ?? DRAWER[0];
  return { exercise, variant, scene: exercise ? exercise.scene : row([libero.make()]), meter: { ...NEW_METER }, probes: { red: null, black: null }, capV: {}, fusesBlown: 0, usedHint: false, tries: 0, solved: false };
}

/** Applica un gesto. Un piedino che non esiste, o un ponticello che non è un ponticello, lascia tutto com'è. */
export function apply(b: Bench, a: Action): Bench {
  switch (a.type) {
    case 'dial': return { ...b, meter: { ...b.meter, dial: a.dial } };
    case 'jack': return { ...b, meter: { ...b.meter, jack: a.jack } };
    case 'probe': {
      if (a.node !== null && !scenePads(b.scene).some(p => p.node === a.node)) return b;
      const altro = a.color === 'red' ? 'black' : 'red';
      // i due puntali possono stare sullo stesso piedino: è il modo di «azzerare» lo strumento
      return { ...b, probes: { ...b.probes, [a.color]: a.node, [altro]: b.probes[altro] } };
    }
    case 'switch': return b.scene.parts.some(p => p.id === a.partId && p.type === 'switch') ? { ...b, scene: flipSwitch(b.scene, a.partId) } : b;
    case 'replaceFuse': {
      const era = a.jack === 'ma' ? b.meter.fuseMaBlown : b.meter.fuseABlown;
      return era ? { ...b, meter: { ...b.meter, ...(a.jack === 'ma' ? { fuseMaBlown: false } : { fuseABlown: false }) } } : b;
    }
    case 'hint': return { ...b, usedHint: true };
    case 'discharge': return { ...b, capV: {} };
  }
}

/** Fa passare «dt» secondi e legge il multimetro. Se la misura brucia un fusibile, lo stato lo ricorda. */
export function tick(b: Bench, dt: number): { bench: Bench; reading: Reading } {
  const reading = read(sceneElements(b.scene), b.meter, b.probes, { capV: b.capV, dt });
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
