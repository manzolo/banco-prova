// Gli esercizi. Ognuno costruisce la sua scena (con una variante: i valori e i guasti cambiano a ogni tentativo, ma
// in modo ripetibile), fa una domanda e sa qual è la risposta giusta. Le risposte «misurate» non sono scritte a mano:
// si ottengono chiedendo al multimetro del modello, messo nel modo giusto.
import { E12 } from './config.ts';
import { read, type Dial, type Jack, type MeterState } from './meter.ts';
import { battery, bjt, capacitor, diode, fuse, generator, inductor, resistor, si, toggle, transformer, type Part } from './parts.ts';
import { rectifier, loop, row, sceneElements, type Scene } from './scene.ts';

import { captureScope, newScope } from './scope.ts';

export type Question =
  | { kind: 'number'; unit: string; expected: number; tolerancePct: number;      // expected nell'unità indicata
      /** Una risposta sbagliata ma prevedibile (per esempio il valore misurato al posto del nominale), con cosa dire. */
      near?: { value: number; tolerancePct: number; message: string } }
  | { kind: 'choice'; options: string[]; correct: number };
export interface Exercise {
  id: string; chapter: string; title: string; text: string;
  hint: string;        // come si imposta la misura
  explain: string;     // cosa si è imparato, detto dopo la risposta
  scene: Scene; question: Question;
}
export interface ExerciseDef { id: string; chapter: string; title: string; titleEn: string; build(variant: number, lang?: Lang): Exercise }

/** La lingua dei testi: italiano di default, inglese a scelta. Cambiano solo i testi, mai la scena o la risposta. */
export type Lang = 'it' | 'en';
/** Quello che il costruttore di un esercizio usa per scrivere: t(italiano, inglese) sceglie la lingua, si() scrive un valore
 *  come si() di parts.ts, ma in inglese col punto decimale (4.7 kΩ). */
export interface LangTools { t(it: string, en: string): string; si(value: number, unit: string): string }
const langTools = (lang: Lang): LangTools => ({
  t: (it, en) => lang === 'en' ? en : it,
  si: (value, unit) => lang === 'en' ? si(value, unit).replace(/(\d),(\d)/, '$1.$2') : si(value, unit),
});

/** Generatore pseudo-casuale ripetibile (mulberry32): la stessa variante dà sempre lo stesso esercizio. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = (id: string, variant: number): number => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7) + variant * 7919;
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const shuffle = <T>(r: () => number, xs: T[]): T[] => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const meter = (dial: Dial, jack: Jack = 'v'): MeterState => ({ dial, jack, fuseMaBlown: false, fuseABlown: false });
const e12 = (r: () => number, decMin: number, decMax: number): number => pick(r, E12) * 10 ** (decMin + Math.floor(r() * (decMax - decMin + 1)));
const POSTO = ['primo', 'secondo', 'terzo'];
const posti = (n: number): string[] => POSTO.slice(0, n).map(p => `il ${p} da sinistra`);
const PLACES_EN = ['first from the left', 'second from the left', 'third from the left'];
const places = (L: LangTools, n: number): string[] => posti(n).map((p, i) => L.t(p, PLACES_EN[i]));
/** I colori delle bande in inglese, per le spiegazioni. */
const BANDS_EN: Record<string, string> = { nero: 'black', marrone: 'brown', rosso: 'red', arancio: 'orange', giallo: 'yellow', verde: 'green', blu: 'blue', viola: 'violet', grigio: 'grey', bianco: 'white', oro: 'gold', argento: 'silver' };
const bandsEn = (mark: string): string => mark.split(' · ').map(c => BANDS_EN[c] ?? c).join(' · ');

function def(id: string, chapter: string, title: string, titleEn: string, build: (r: () => number, L: LangTools) => Omit<Exercise, 'id' | 'chapter' | 'title'>): ExerciseDef {
  return { id, chapter, title, titleEn, build: (variant, lang = 'it') => ({ id, chapter, title: lang === 'en' ? titleEn : title, ...build(rng(seedOf(id, variant)), langTools(lang)) }) };
}

export const EXERCISES: ExerciseDef[] = [
  // ------------------------------------------------------------ resistenze
  def('colori', 'Resistenze', 'Il codice colori', 'The colour code', (r, L) => {
    const ohm = e12(r, 1, 5), p = resistor('R1', ohm, 5, { factor: 1 + (r() - 0.5) * 0.06 });
    const unit = ohm >= 1e6 ? 'MΩ' : ohm >= 1e3 ? 'kΩ' : 'Ω', scala = ohm >= 1e6 ? 1e6 : ohm >= 1e3 ? 1e3 : 1;
    const vero = (p.truth.real as number) / scala;
    return { text: L.t(`Leggi le bande della resistenza: qual è il suo valore nominale, cioè quello scritto dai colori? Scrivilo in ${unit}. Il multimetro serve a controllare: il pezzo vero si scosta un po' dal nominale, dentro la tolleranza.`, `Read the bands on the resistor: what is its nominal value, the one given by the colours? Enter it in ${unit}. The multimeter is there to check: the real part differs a little from the nominal value, within the tolerance.`),
      hint: L.t('Le prime due bande sono le cifre, la terza dice quanti zeri aggiungere, la quarta (staccata) è la tolleranza. Per controllare: selettore su Ω, un puntale per piedino.', 'The first two bands are the digits, the third says how many zeros to add, the fourth (set apart) is the tolerance. To check: dial on Ω, one lead on each pin.'),
      explain: L.t(`${p.mark}: ${si(ohm, 'Ω')}, tolleranza 5%. Il multimetro legge il valore vero di questo pezzo, ${si(p.truth.real as number, 'Ω')}: dentro la tolleranza non è mai identico al nominale.`, `${bandsEn(p.mark)}: ${L.si(ohm, 'Ω')}, 5% tolerance. The multimeter reads the real value of this part, ${L.si(p.truth.real as number, 'Ω')}: within the tolerance it is never exactly the nominal value.`),
      scene: row([p]), question: { kind: 'number', unit, expected: ohm / scala, tolerancePct: 0.5,
        near: { value: vero, tolerancePct: 1, message: L.t('Questo è il valore misurato, quello vero di questo pezzo. La domanda chiede il nominale: quello che dicono le bande, un numero tondo della serie E12.', 'This is the measured value, the real value of this part. The question asks for the nominal value: the one the bands give, a round number from the E12 series.') } } };
  }),
  def('tolleranza', 'Resistenze', 'È in tolleranza?', 'Is it within tolerance?', (r, L) => {
    const ohm = e12(r, 1, 4), buona = r() < 0.5, p = resistor('R1', ohm, 5, buona ? { factor: 1 + (r() - 0.5) * 0.07 } : { fault: 'drift' });
    return { text: L.t('Questa resistenza ha la banda oro: 5%. Misurala e decidi se è ancora dentro la sua tolleranza.', 'This resistor has a gold band: 5%. Measure it and decide whether it is still within its tolerance.'),
      hint: L.t('Leggi il valore dalle bande, misura in Ω e calcola di quanto si scosta: (misurato − nominale) / nominale. Entro il 5% è buona.', 'Read the value from the bands, measure in Ω and work out how far off it is: (measured − nominal) / nominal. Within 5% it is good.'),
      explain: L.t(`Nominale ${si(ohm, 'Ω')}, misurata ${si(p.truth.real as number, 'Ω')}: scarto del ${(((p.truth.real as number) / ohm - 1) * 100).toFixed(1).replace('.', ',')}%. ${buona ? 'È buona.' : 'È fuori: una resistenza che ha scaldato troppo sale di valore.'}`, `Nominal ${L.si(ohm, 'Ω')}, measured ${L.si(p.truth.real as number, 'Ω')}: off by ${(((p.truth.real as number) / ohm - 1) * 100).toFixed(1)}%. ${buona ? 'It is good.' : 'It is out: a resistor that has overheated drifts up in value.'}`),
      scene: row([p]), question: { kind: 'choice', options: [L.t('Sì, è in tolleranza', 'Yes, it is within tolerance'), L.t('No, è fuori tolleranza', 'No, it is out of tolerance')], correct: buona ? 0 : 1 } };
  }),
  def('interrotta', 'Resistenze', 'Quale è interrotta?', 'Which one is open?', (r, L) => {
    const rotta = Math.floor(r() * 3), parts = [0, 1, 2].map(i => resistor(`R${i + 1}`, e12(r, 1, 4), 5, i === rotta ? { fault: 'open' } : { factor: 1 + (r() - 0.5) * 0.06 }));
    return { text: L.t('Tre resistenze uguali a vedersi. Una è interrotta dentro: trovala.', 'Three resistors that look the same. One is open inside: find it.'), hint: L.t('Selettore su Ω: quella interrotta fa scrivere OL (fuori scala), le altre danno il loro valore.', 'Dial on Ω: the open one makes the display show OL (overload), the others give their value.'),
      explain: L.t(`Era ${posti(3)[rotta]}: OL vuol dire «resistenza più alta di quanto so misurare», cioè circuito aperto. A occhio non si vede.`, `It was the ${PLACES_EN[rotta]}: OL means “a resistance higher than I can measure”, that is, an open circuit. You cannot see it by eye.`),
      scene: row(parts), question: { kind: 'choice', options: places(L, 3), correct: rotta } };
  }),
  def('serie-parallelo', 'Resistenze', 'Serie e parallelo', 'Series and parallel', (r, L) => {
    const a = e12(r, 2, 3), b = e12(r, 2, 3), c = e12(r, 2, 3), totale = a + b * c / (b + c);
    return { text: L.t('Tre resistenze saldate insieme: R1 in alto, poi R2 e R3 affiancate in verticale. Quanto vale la resistenza fra il piedino libero di R1 (a sinistra) e il filo in basso?', 'Three resistors soldered together: R1 at the top, then R2 and R3 side by side, standing upright. What is the resistance between the free pin of R1 (on the left) and the wire at the bottom?'),
      hint: L.t('R2 e R3 sono in parallelo fra loro: (R2 · R3) / (R2 + R3), sempre meno della più piccola. R1 è in serie a quel parallelo: si somma. Poi controlla in Ω fra il piedino sinistro di R1 e il piedino basso di R2.', 'R2 and R3 are in parallel: (R2 · R3) / (R2 + R3), always less than the smaller of the two. R1 is in series with that pair: it adds up. Then check in Ω between the left pin of R1 and the bottom pin of R2.'),
      explain: L.t(`Parallelo: ${si(b, 'Ω')} e ${si(c, 'Ω')} fanno ${si(b * c / (b + c), 'Ω')}. In serie con ${si(a, 'Ω')}: ${si(totale, 'Ω')}.`, `Parallel: ${L.si(b, 'Ω')} and ${L.si(c, 'Ω')} make ${L.si(b * c / (b + c), 'Ω')}. In series with ${L.si(a, 'Ω')}: ${L.si(totale, 'Ω')}.`),
      scene: loop(null, [resistor('R1', a)], { shunts: [{ after: 0, part: resistor('R2', b) }, { after: 0, part: resistor('R3', c) }] }),
      question: { kind: 'number', unit: 'kΩ', expected: totale / 1000, tolerancePct: 2 } };
  }),
  // ------------------------------------------------------------ diodi
  def('catodo', 'Diodi', 'Dov\'è il catodo?', 'Where is the cathode?', (r, L) => {
    const girato = r() < 0.5, p = diode('D1', '1N4148', { flipped: girato, unmarked: true });
    return { text: L.t('A questo diodo si è cancellata la fascia. Trova da che parte sta il catodo.', 'The stripe on this diode has worn off. Find which side the cathode is on.'), hint: L.t('Selettore sulla prova diodi (il simbolo del diodo). Quando il display mostra circa 0,6 V, il puntale nero sta sul catodo. Se scrive OL, scambia i puntali.', 'Dial on diode test (the diode symbol). When the display shows about 0.6 V, the black lead is on the cathode. If it shows OL, swap the leads.'),
      explain: L.t('Il diodo conduce quando l\'anodo è più positivo del catodo: il rosso (positivo) sull\'anodo, il nero sul catodo. La fascia sul corpo segna il catodo.', 'A diode conducts when the anode is more positive than the cathode: red (positive) on the anode, black on the cathode. The stripe on the body marks the cathode.'),
      scene: row([p]), question: { kind: 'choice', options: [L.t('a sinistra', 'on the left'), L.t('a destra', 'on the right')], correct: girato ? 0 : 1 } };
  }),
  def('tre-diodi', 'Diodi', 'Uno solo è buono', 'Only one is good', (r, L) => {
    const ordine = shuffle(r, ['good', 'short', 'open'] as const), parts = ordine.map((f, i) => diode(`D${i + 1}`, '1N4007', f === 'good' ? {} : { fault: f }));
    return { text: L.t('Tre diodi tolti da un alimentatore guasto: uno è in corto, uno è interrotto, uno è buono. Qual è quello buono?', 'Three diodes pulled from a broken power supply: one is shorted, one is open, one is good. Which one is good?'),
      hint: L.t('Prova diodi nei due versi su ognuno. Buono: circa 0,6 V in un verso e OL nell\'altro. In corto: zero (e cicalino) nei due versi. Interrotto: OL nei due versi.', 'Diode test in both directions on each one. Good: about 0.6 V one way and OL the other. Shorted: zero (and a beep) both ways. Open: OL both ways.'),
      explain: L.t('Un diodo va provato sempre nei due versi: è la differenza fra i due versi che dice che funziona.', 'Always test a diode in both directions: it is the difference between the two directions that tells you it works.'),
      scene: row(parts), question: { kind: 'choice', options: places(L, 3), correct: ordine.indexOf('good') } };
  }),
  def('che-diodo', 'Diodi', 'Che diodo è?', 'What kind of diode?', (r, L) => {
    const tipi = [['1N4148', L.t('al silicio (circa 0,6 V)', 'silicon (about 0.6 V)')], ['schottky', L.t('Schottky (circa 0,2 V)', 'Schottky (about 0.2 V)')], ['led-red', L.t('un LED (quasi 2 V)', 'an LED (almost 2 V)')]] as const, k = Math.floor(r() * 3);
    return { text: L.t('Un diodo senza sigla. Dalla caduta di tensione in diretta, che tipo è?', 'A diode with no part number. From its forward voltage drop, what kind is it?'), hint: L.t('Prova diodi, nel verso in cui conduce: il numero sul display è la caduta in volt.', 'Diode test, in the direction it conducts: the number on the display is the drop in volts.'),
      explain: L.t('Ogni tecnologia ha la sua caduta: silicio 0,6–0,7 V, Schottky 0,15–0,3 V, germanio circa 0,2–0,3 V, LED da 1,7 V in su secondo il colore.', 'Each technology has its own drop: silicon 0.6–0.7 V, Schottky 0.15–0.3 V, germanium about 0.2–0.3 V, LEDs from 1.7 V up depending on the colour.'),
      scene: row([diode('D1', tipi[k][0], { flipped: r() < 0.5, unmarked: true })]), question: { kind: 'choice', options: tipi.map(t => t[1]), correct: k } };
  }),
  def('zener', 'Diodi', 'Lo zener al lavoro', 'The Zener at work', (r, L) => {
    const vz = pick(r, [3.3, 5.1, 6.2]), z = diode('Z1', '1N4148', { zenerVolt: vz, flipped: true }), s = loop(battery('B1', '9v', 1), [resistor('R1', 330)], { shunts: [{ after: 0, part: z }] });
    const v = read(sceneElements(s), meter('vdc'), { red: z.pads[0], black: z.pads[1] }).value;
    return { text: L.t('Una pila da 9 V, una resistenza e uno zener montato al contrario (catodo verso il positivo). Che tensione c\'è ai capi dello zener?', 'A 9 V battery, a resistor and a Zener fitted the other way round (cathode towards the positive). What voltage is there across the Zener?'),
      hint: L.t('Selettore su V in continua, puntale rosso sul piedino alto dello zener e nero su quello basso. Il circuito è acceso: non usare gli ohm.', 'Dial on DC volts, red lead on the top pin of the Zener and black on the bottom one. The circuit is powered: do not use the ohms range.'),
      explain: L.t(`Uno zener in inversa tiene la sua tensione (qui ${String(vz).replace('.', ',')} V nominali) qualunque sia la corrente, entro certi limiti: è lo stabilizzatore più semplice. Il resto dei 9 V cade sulla resistenza.`, `A reverse-biased Zener holds its voltage (here ${vz} V nominal) whatever the current, within limits: it is the simplest voltage regulator. The rest of the 9 V drops across the resistor.`),
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 3 } };
  }),
  // ------------------------------------------------------------ condensatori e bobine
  def('codice-condensatore', 'Condensatori e bobine', 'Il codice a tre cifre', 'The three-digit code', (r, L) => {
    const farad = pick(r, [1, 2.2, 4.7, 10, 22, 47, 100, 220, 470]) * 1e-9, p = capacitor('C1', farad, 'ceramic', { factor: 1 + (r() - 0.5) * 0.12 });
    return { text: L.t(`Sul condensatore ceramico c'è scritto ${p.mark}. Quanti nanofarad vale secondo il codice? Il capacimetro serve a controllare: il pezzo vero si scosta dal valore scritto.`, `The ceramic capacitor is marked ${p.mark}. How many nanofarads is it according to the code? The capacitance meter is there to check: the real part differs from the marked value.`),
      hint: L.t('Le prime due cifre sono il valore, la terza il numero di zeri: il risultato è in picofarad. Mille picofarad fanno un nanofarad. Per controllare: selettore su ⊣⊢ (capacità).', 'The first two digits are the value, the third is the number of zeros: the result is in picofarads. A thousand picofarads make one nanofarad. To check: dial on ⊣⊢ (capacitance).'),
      explain: L.t(`${p.mark}: ${p.mark.slice(0, 2)} seguito da ${p.mark[2]} zeri, in picofarad, cioè ${si(farad, 'F')}. Il capacimetro legge ${si(p.truth.real as number, 'F')}: i ceramici hanno tolleranze larghe.`, `${p.mark}: ${p.mark.slice(0, 2)} followed by ${p.mark[2]} zeros, in picofarads, that is ${L.si(farad, 'F')}. The capacitance meter reads ${L.si(p.truth.real as number, 'F')}: ceramic capacitors have wide tolerances.`),
      scene: row([p]), question: { kind: 'number', unit: 'nF', expected: farad * 1e9, tolerancePct: 0.5,
        near: { value: (p.truth.real as number) * 1e9, tolerancePct: 1, message: L.t('Questo è il valore misurato dal capacimetro. La domanda chiede quello scritto dal codice a tre cifre.', 'This is the value measured by the capacitance meter. The question asks for the one given by the three-digit code.') } } };
  }),
  def('elettrolitici', 'Condensatori e bobine', 'Tre elettrolitici', 'Three electrolytics', (r, L) => {
    const ordine = shuffle(r, ['good', 'short', 'dry'] as const), farad = pick(r, [100e-6, 220e-6, 470e-6]);
    const parts = ordine.map((f, i) => capacitor(`C${i + 1}`, farad, 'electrolytic', f === 'good' ? { factor: 0.93 } : { fault: f }));
    return { text: L.t(`Tre elettrolitici da ${si(farad, 'F')} recuperati da una scheda: uno è in corto, uno si è seccato (ha perso capacità), uno è buono. Qual è quello buono?`, `Three ${L.si(farad, 'F')} electrolytic capacitors salvaged from a board: one is shorted, one has dried out (it has lost capacitance), one is good. Which one is good?`),
      hint: L.t('Selettore su capacità: quello buono legge un valore vicino a quello scritto, quello secco molto meno. Quello in corto dà OL in capacità e pochi decimi di ohm in Ω.', 'Dial on capacitance: the good one reads close to its marked value, the dried-out one much less. The shorted one shows OL on capacitance and a few tenths of an ohm on Ω.'),
      explain: L.t('Un elettrolitico invecchiando si asciuga e perde capacità: sembra sano, ma non filtra più. In corto invece fa saltare il fusibile dell\'alimentatore.', 'As an electrolytic ages it dries out and loses capacitance: it looks fine, but it no longer filters. A shorted one, instead, blows the power supply fuse.'),
      scene: row(parts), question: { kind: 'choice', options: places(L, 3), correct: ordine.indexOf('good') } };
  }),
  def('carica', 'Condensatori e bobine', 'Il condensatore che si carica', 'The capacitor that charges', (r, L) => {
    const perde = r() < 0.5, p = capacitor('C1', 1000e-6, 'electrolytic', perde ? { fault: 'leak' } : {});
    return { text: L.t('Un elettrolitico da 1000 µF. Mettilo sotto l\'ohmetro e guarda cosa fa la lettura nel tempo: è buono o perde?', 'A 1000 µF electrolytic. Put it on the ohmmeter and watch what the reading does over time: is it good or leaky?'),
      hint: L.t('Selettore su Ω e puntali sui piedini. Buono: la lettura parte bassa, sale da sola e finisce in OL. Se perde: si ferma su un valore e non sale più.', 'Dial on Ω and leads on the pins. Good: the reading starts low, rises by itself and ends at OL. Leaky: it stops at a value and rises no further.'),
      explain: L.t('L\'ohmetro carica il condensatore: all\'inizio assorbe corrente (sembra un corto), poi sempre meno. Se resta un valore fisso, quella è la resistenza di perdita.', 'The ohmmeter charges the capacitor: at first it draws current (it looks like a short), then less and less. If a fixed value remains, that is the leakage resistance.'),
      scene: row([p]), question: { kind: 'choice', options: [L.t('È buono: sale fino a OL', 'Good: it rises to OL'), L.t('Perde: si ferma su un valore', 'Leaky: it stops at a value')], correct: perde ? 1 : 0 } };
  }),
  def('bobina', 'Condensatori e bobine', 'La bobina interrotta', 'The open inductor', (r, L) => {
    const rotta = Math.floor(r() * 2), parts = [0, 1].map(i => inductor(`L${i + 1}`, 100e-6, 1.6 + r(), i === rotta ? { fault: 'open' } : {}));
    return { text: L.t('Due bobine uguali. In una il filo si è spezzato sotto lo smalto. Quale?', 'Two identical inductors. In one, the wire has broken under the enamel. Which one?'), hint: L.t('Selettore sulla continuità (il simbolo del suono): una bobina buona è un filo, quindi suona. Quella interrotta tace.', 'Dial on continuity (the sound symbol): a good inductor is just a wire, so it beeps. The open one stays silent.'),
      explain: L.t('In continua una bobina è solo il suo filo: pochi ohm. L\'induttanza non si misura col multimetro: serve un LCR-metro o un analizzatore.', 'At DC an inductor is just its wire: a few ohms. A multimeter cannot measure inductance: you need an LCR meter or an analyser.'),
      scene: row(parts), question: { kind: 'choice', options: places(L, 2), correct: rotta } };
  }),
  // ------------------------------------------------------------ alimentazione e protezioni
  def('fusibili', 'Alimentazione e protezioni', 'Il fusibile saltato', 'The blown fuse', (r, L) => {
    const saltato = Math.floor(r() * 3);
    return { text: L.t('Tre fusibili in ceramica: dentro non si vede. Uno è saltato.', 'Three ceramic fuses: you cannot see inside. One is blown.'), hint: L.t('Continuità: quello buono suona, quello saltato no.', 'Continuity: the good one beeps, the blown one does not.'),
      explain: L.t('Un fusibile si prova sempre con lo strumento e fuori dal portafusibile: in circuito un\'altra via può far suonare il cicalino lo stesso.', 'Always test a fuse with the meter and out of its holder: in a circuit, another path can make the buzzer sound anyway.'),
      scene: row([0, 1, 2].map(i => fuse(`F${i + 1}`, i === saltato))), question: { kind: 'choice', options: places(L, 3), correct: saltato } };
  }),
  def('pila', 'Alimentazione e protezioni', 'La pila sotto carico', 'The battery under load', (r, L) => {
    const carica = pick(r, [1, 0.6, 0.25, 0.1]), s = loop(battery('B1', '9v', carica), [toggle('S1', false), resistor('R1', 100)], { closed: true });
    const chiusa: Scene = { ...s, parts: s.parts.map(p => p.id === 'S1' ? toggle('S1', true) : p) };
    const v = read(sceneElements(chiusa), meter('vdc'), { red: 'B1.1', black: 'B1.2' }).value;
    return { text: L.t('Una pila da 9 V con un carico da 100 Ω dietro un ponticello aperto. Chiudi il ponticello (cliccalo) e misura: quanti volt dà la pila sotto carico?', 'A 9 V battery with a 100 Ω load behind an open jumper. Close the jumper (click it) and measure: how many volts does the battery give under load?'),
      hint: L.t('Selettore su V in continua, rosso sul + della pila (in alto) e nero sul −. Misura prima a vuoto, poi chiudi il ponticello: guarda di quanto scende.', 'Dial on DC volts, red on the battery + (at the top) and black on the −. Measure first with no load, then close the jumper: see how far it drops.'),
      explain: L.t('A vuoto anche una pila scarica segna quasi la sua tensione. È la resistenza interna che cresce: appena le chiedi corrente la tensione crolla. Una pila si giudica sotto carico.', 'With no load even a flat battery shows almost its full voltage. It is the internal resistance that grows: as soon as you draw current the voltage collapses. A battery is judged under load.'),
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 3 } };
  }),
  def('trasformatore', 'Alimentazione e protezioni', 'Continua o alternata?', 'DC or AC?', (r, L) => {
    const v = pick(r, [6, 9, 12, 15, 24]), p = transformer('T1', v), letto = read(p.elements, meter('vac'), { red: p.pads[0], black: p.pads[1] }).value;
    return { text: L.t(`Il secondario di un piccolo trasformatore da rete: sulla targa c'è scritto ${v} V. Misura quanto dà davvero, così, senza niente collegato. In volt.`, `The secondary of a small mains transformer: the label says ${v} V. Measure what it really gives, as it is, with nothing connected. In volts.`),
      hint: L.t('È alternata: selettore su V~. Con il selettore sulla continua leggeresti zero, pur essendoci tensione. E non fidarti della targa: misura.', 'It is AC: dial on V~. With the dial on DC you would read zero, even though the voltage is there. And do not trust the label: measure.'),
      explain: L.t(`A vuoto ne dà ${String(letto.toFixed(2)).replace('.', ',')} V: un trasformatore piccolo, senza carico, dà il 10–15% più della targa, che vale a pieno carico. E una tensione alternata ha media zero: il voltmetro in continua non la vede.`, `With no load it gives ${letto.toFixed(2)} V: a small transformer with no load gives 10–15% more than its rating, which applies at full load. And an AC voltage averages zero: a voltmeter set to DC does not see it.`),
      scene: row([p]), question: { kind: 'number', unit: 'V', expected: letto, tolerancePct: 3,
        near: { value: v, tolerancePct: 0.5, message: L.t('Questo è il valore di targa, che vale a pieno carico. A vuoto un trasformatore piccolo dà di più: misuralo.', 'This is the rated value, which applies at full load. With no load a small transformer gives more: measure it.') } } };
  }),
  // ------------------------------------------------------------ circuiti
  def('partitore', 'Circuiti', 'Il partitore di tensione', 'The voltage divider', (r, L) => {
    const a = e12(r, 3, 3), b = e12(r, 3, 3), s = loop(battery('B1', '9v', 1), [resistor('R1', a)], { shunts: [{ after: 0, part: resistor('R2', b) }] });
    const v = read(sceneElements(s), meter('vdc'), { red: 'R2.1', black: 'R2.2' }).value;
    return { text: L.t('Una pila e due resistenze in serie. Che tensione c\'è ai capi di R2 (quella in verticale)?', 'A battery and two resistors in series. What voltage is there across R2 (the upright one)?'), hint: L.t('Selettore su V in continua, puntali ai due capi di R2. Puoi anche calcolarla: V · R2 / (R1 + R2), con V misurata sulla pila.', 'Dial on DC volts, leads on the two ends of R2. You can also calculate it: V · R2 / (R1 + R2), with V measured on the battery.'),
      explain: L.t(`La tensione si divide in proporzione alle resistenze: su R2 cade la frazione R2 / (R1 + R2) = ${(b / (a + b) * 100).toFixed(0)}% del totale.`, `The voltage divides in proportion to the resistances: R2 gets the fraction R2 / (R1 + R2) = ${(b / (a + b) * 100).toFixed(0)}% of the total.`),
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 2 } };
  }),
  def('corrente-led', 'Circuiti', 'La corrente nel LED', 'The current in the LED', (r, L) => {
    const ohm = pick(r, [330, 470, 680, 1000]), colore = pick(r, ['led-red', 'led-green'] as const);
    const s = loop(battery('B1', '9v', 1), [resistor('R1', ohm), toggle('S1', true), diode('L1', colore)], { closed: true });
    const aperta: Scene = { ...s, parts: s.parts.map(p => p.id === 'S1' ? toggle('S1', false) : p) };
    const i = read(sceneElements(aperta), meter('ma', 'ma'), { red: 'S1.1', black: 'S1.2' }).value;
    return { text: L.t('Un LED acceso con la sua resistenza. Quanta corrente lo attraversa?', 'An LED lit through its resistor. How much current flows through it?'),
      hint: L.t('L\'amperometro va in serie: apri il ponticello (cliccalo), sposta il puntale rosso nella boccola mA, selettore su mA, e metti i puntali ai due capi del ponticello aperto. Oppure, senza aprire niente: misura la tensione su R1 e dividi per il suo valore.', 'The ammeter goes in series: open the jumper (click it), move the red lead to the mA jack, set the dial to mA, and put the leads on the two ends of the open jumper. Or, without opening anything: measure the voltage across R1 and divide by its value.'),
      explain: L.t('La corrente si misura interrompendo il circuito e facendola passare dallo strumento. Mai mettere l\'amperometro in parallelo: è quasi un cortocircuito. A misura finita, rimetti il puntale nella boccola VΩ.', 'Current is measured by breaking the circuit and making it flow through the meter. Never put the ammeter in parallel: it is almost a short circuit. When you are done, put the lead back in the VΩ jack.'),
      scene: s, question: { kind: 'number', unit: 'mA', expected: i * 1000, tolerancePct: 4 } };
  }),
  def('guasto', 'Circuiti', 'Il LED che non si accende', 'The LED that won\'t light', (r, L) => {
    const guasti = [L.t('la resistenza è interrotta', 'the resistor is open'), L.t('il LED è montato al contrario', 'the LED is fitted the wrong way round'), L.t('il LED è interrotto', 'the LED is open'), L.t('il ponticello è aperto', 'the jumper is open')], k = Math.floor(r() * 4);
    const s = loop(battery('B1', '9v', 1), [resistor('R1', 470, 5, k === 0 ? { fault: 'open' } : {}), toggle('S1', k !== 3), diode('L1', 'led-red', { flipped: k === 1, fault: k === 2 ? 'open' : undefined, unmarked: true })], { closed: true });
    return { text: L.t('Pila, resistenza, ponticello e LED: il LED resta spento. Trova il guasto misurando, senza smontare niente.', 'Battery, resistor, jumper and LED: the LED stays off. Find the fault by measuring, without taking anything apart.'),
      hint: L.t('Selettore su V in continua e nero sul − della pila. Segui la tensione col rosso, punto per punto, dal + in avanti: dove sparisce, lì c\'è l\'interruzione. Se arriva fino al LED e lui non si accende, guarda quanta ne cade sul LED.', 'Dial on DC volts and black on the battery −. Follow the voltage with the red lead, point by point, from the + onwards: where it disappears, that is where the break is. If it reaches the LED and the LED does not light, look at how much voltage drops across the LED.'),
      explain: L.t('In un circuito in serie interrotto, tutta la tensione della pila si ritrova ai capi del punto aperto. Con la resistenza interrotta i 9 V stanno su di lei; col LED interrotto o al contrario stanno sul LED (e per distinguerli lo si prova con la prova diodi, a circuito spento).', 'In a broken series circuit, the whole battery voltage appears across the open point. With the resistor open the 9 V is across the resistor; with the LED open or reversed it is across the LED (and to tell those two apart you check it with diode test, with the circuit off).'),
      scene: s, question: { kind: 'choice', options: guasti, correct: k } };
  }),
  // ------------------------------------------------------------ transistor
  def('base', 'Transistor', 'Trova la base', 'Find the base', (r, L) => {
    const pins = pick(r, ['EBC', 'BCE', 'CBE', 'ECB', 'BEC', 'CEB']), pol = pick(r, ['npn', 'pnp'] as const), q = bjt('Q1', pol, pins);
    return { text: L.t('Un transistor con la sigla illeggibile. Qual è il piedino della base?', 'A transistor with an unreadable part number. Which pin is the base?'), hint: L.t('Prova diodi fra tutte le coppie di piedini. La base è l\'unico piedino che conduce verso tutti e due gli altri (col rosso sulla base se è NPN, col nero se è PNP). Fra collettore ed emettitore non conduce mai.', 'Diode test between every pair of pins. The base is the only pin that conducts towards both of the others (with red on the base if it is NPN, with black if it is PNP). Between collector and emitter it never conducts.'),
      explain: L.t('Visto col multimetro un transistor è due diodi che partono dalla base. Trovata la base, la giunzione con la caduta un po\' più alta è quella dell\'emettitore.', 'Seen through a multimeter, a transistor is two diodes starting from the base. Once you have found the base, the junction with the slightly higher drop is the base–emitter one.'),
      scene: row([q]), question: { kind: 'choice', options: places(L, 3), correct: pins.indexOf('B') } };
  }),
  def('npn-pnp', 'Transistor', 'NPN o PNP?', 'NPN or PNP?', (r, L) => {
    const pol = pick(r, ['npn', 'pnp'] as const), q = bjt('Q1', pol, pick(r, ['EBC', 'BCE', 'CBE']));
    return { text: L.t('Stesso tipo di prova: questo transistor è NPN o PNP?', 'Same kind of test: is this transistor NPN or PNP?'), hint: L.t('Trova la base con la prova diodi. Se conduce col puntale rosso sulla base è NPN (la base è la zona P); se conduce col nero sulla base è PNP.', 'Find the base with diode test. If it conducts with the red lead on the base it is NPN (the base is the P region); if it conducts with the black lead on the base it is PNP.'),
      explain: L.t('NPN: la base è l\'anodo delle due giunzioni. PNP: è il catodo. È la prima cosa da sapere prima di sostituirne uno.', 'NPN: the base is the anode of both junctions. PNP: it is the cathode. It is the first thing to know before replacing one.'),
      scene: row([q]), question: { kind: 'choice', options: ['NPN', 'PNP'], correct: pol === 'npn' ? 0 : 1 } };
  }),
  // ------------------------------------------------------------ alternata nel tempo
  def('ac-peak', 'Alternata e oscilloscopio', 'Dal valore efficace al picco', 'From RMS to peak', (r, L) => {
    const volt = pick(r, [6, 9, 12, 15]), t = transformer('T1', volt), scope = newScope();
    scope.channels[0].probe = 'T1.1'; scope.channels[0].ground = 'T1.2';
    const picco = captureScope(t.elements, scope).frame.stats[0].max;
    return { text: L.t('Questo secondario, a vuoto: qual è la sua tensione di picco, in volt? Misurala con l\'oscilloscopio.', 'This secondary, with no load: what is its peak voltage, in volts? Measure it with the oscilloscope.'),
      hint: L.t('Sonda 1 su T1.1, massa 1 su T1.2, accoppiamento DC. Scegli il V/div più piccolo che tiene tutta la sinusoide sullo schermo, poi metti un cursore sulla cresta e uno sullo zero: ΔV è il picco. Controllo: V~ del multimetro per √2.', 'Probe 1 on T1.1, ground 1 on T1.2, DC coupling. Choose the smallest V/div that keeps the whole sine wave on screen, then put one cursor on the crest and one on zero: ΔV is the peak. To check: the multimeter V~ reading times √2.'),
      explain: L.t('Il picco è √2 volte il valore efficace, cioè il 41% in più: un secondario da 12 V efficaci arriva a 17 V di picco, ed è su quel valore che si carica il condensatore di un alimentatore.', 'The peak is √2 times the RMS value, that is 41% more: a 12 V RMS secondary reaches 17 V peak, and that is the voltage the capacitor of a power supply charges up to.'),
      scene: row([t]), question: { kind: 'number', unit: 'V', expected: picco, tolerancePct: 3,
        near: { value: picco / Math.SQRT2, tolerancePct: 2, message: L.t('Questo è il valore efficace, quello che legge V~. La domanda chiede il picco: la cresta della sinusoide.', 'This is the RMS value, the one V~ reads. The question asks for the peak: the crest of the sine wave.') } } };
  }),
  def('ac-frequency', 'Alternata e oscilloscopio', 'Un periodo sul reticolo', 'One period on the graticule', (r, L) => {
    const hz = pick(r, [50, 100, 1000]);
    return { text: L.t('Un generatore di funzioni di cui non conosci la frequenza. Misura un periodo sul reticolo e ricava la frequenza in hertz.', 'A function generator whose frequency you do not know. Measure one period on the graticule and work out the frequency in hertz.'),
      hint: L.t('Sonda 1 su G1.1 e massa 1 su G1.2. Scegli il tempo/div che mostra due o tre periodi (a 1 kHz: 0,2 ms/div). Metti i cursori su due creste vicine: Δt è il periodo T; f = 1/T con T in secondi.', 'Probe 1 on G1.1 and ground 1 on G1.2. Choose the time/div that shows two or three periods (at 1 kHz: 0.2 ms/div). Put the cursors on two neighbouring crests: Δt is the period T; f = 1/T with T in seconds.'),
      explain: L.t('Un periodo da 20 ms significa 50 Hz, da 10 ms significa 100 Hz, da 1 ms significa 1000 Hz. Il trigger sul fronte di salita tiene ferma la traccia.', 'A 20 ms period means 50 Hz, 10 ms means 100 Hz, 1 ms means 1000 Hz. Triggering on the rising edge keeps the trace still.'),
      scene: row([generator('G1', 2, hz)]), question: { kind: 'number', unit: 'Hz', expected: hz, tolerancePct: 3 } };
  }),
  def('half-wave', 'Alternata e oscilloscopio', 'Una sola semionda', 'Only one half-wave', (r, L) => {
    const volt = pick(r, [6, 9, 12]), scene = rectifier(false, volt, 0, pick(r, [47, 68, 100]));
    const scope = newScope(); scope.channels[0].probe = 'R1.1'; scope.channels[0].ground = 'R1.2';
    const peak = captureScope(sceneElements(scene), scope).frame.stats[0].max;
    return { text: L.t('D1 lascia passare una sola semionda. Misura il massimo positivo ai capi del carico R1: quanti volt raggiunge?', 'D1 lets only one half-wave through. Measure the positive maximum across the load R1: how many volts does it reach?'),
      hint: L.t('Sonda 1 su R1.1 e massa 1 su R1.2, accoppiamento DC, il V/div più piccolo che tiene la cresta sullo schermo. Il tratto negativo deve restare vicino a zero. Con il canale 2 su T1 confronti ingresso e uscita: le due masse sono in comune, quindi metti anche la massa 2 su R1.2… e guarda cosa succede se la metti altrove.', 'Probe 1 on R1.1 and ground 1 on R1.2, DC coupling, the smallest V/div that keeps the crest on screen. The negative part should stay close to zero. With channel 2 on T1 you compare input and output: the two grounds are common, so put ground 2 on R1.2 as well… and see what happens if you put it somewhere else.'),
      explain: L.t('Il diodo elimina la semionda negativa e sulla positiva perde una tensione che cresce con la corrente; in più, sotto carico, il trasformatore cede la sua tensione in più di quando è a vuoto. Il conto «targa per √2 meno 0,7» qui sbaglia: va misurato.', 'The diode removes the negative half-wave, and on the positive one it loses a voltage that grows with the current; on top of that, under load the transformer gives up the extra voltage it has with no load. The “rating times √2 minus 0.7” rule of thumb is wrong here: it has to be measured.'),
      scene, question: { kind: 'number', unit: 'V', expected: peak, tolerancePct: 3 } };
  }),
  def('bridge-ripple', 'Alternata e oscilloscopio', 'Il ponte e il filtro', 'The bridge and the filter', (r, L) => {
    const farad = pick(r, [100e-6, 220e-6, 470e-6]), ohm = pick(r, [470, 1000]), volt = pick(r, [6, 9, 12]);
    const scene = rectifier(true, volt, farad, ohm);
    const scope = newScope(); scope.channels[0].probe = 'C1.1'; scope.channels[0].ground = 'C1.2';
    const ripple = captureScope(sceneElements(scene), scope).frame.stats[0].ripple;
    return { text: L.t(`Secondario da ${volt} V efficaci, ponte a quattro diodi, filtro da ${si(farad, 'F')} e carico da ${si(ohm, 'Ω')}. Dopo l'assestamento misura il ripple picco-picco su C1, in volt. Per la risposta usa questi valori iniziali; poi esplora i comandi del filtro.`, `A ${volt} V RMS secondary, a four-diode bridge rectifier, a ${L.si(farad, 'F')} filter capacitor and a ${L.si(ohm, 'Ω')} load. Once it has settled, measure the peak-to-peak ripple on C1, in volts. Use these starting values for the answer; then explore the filter controls.`),
      hint: L.t('Sonda 1 su C1.1, massa 1 su C1.2. Aspetta la carica, scegli AC e il V/div più piccolo che tiene l\'ondulazione sullo schermo (0,1 o 0,2 V/div), 2 ms/div. Metti un cursore sulla cresta e uno sulla valle: ΔV è il ripple. Raddoppia C oppure dimezza R: osserva come cambia, poi ripristina i valori iniziali per rispondere.', 'Probe 1 on C1.1, ground 1 on C1.2. Wait for it to charge, choose AC coupling and the smallest V/div that keeps the ripple on screen (0.1 or 0.2 V/div), 2 ms/div. Put one cursor on the crest and one on the trough: ΔV is the ripple. Double C or halve R: watch how it changes, then restore the starting values to answer.'),
      explain: L.t('Il ponte ricarica il filtro due volte per periodo: qui ogni 10 ms. Fra le creste C alimenta il carico. La formula da manuale ΔV ≈ I/(2 f C) è una stima per eccesso (qui del 20–40%): suppone che C si scarichi per tutti i 10 ms, mentre la ricarica ne occupa un pezzo. Più capacità riduce il ripple, più corrente di carico lo aumenta. Due diodi conducono a ogni ricarica.', 'The bridge recharges the filter twice per period: here every 10 ms. Between crests C feeds the load. The textbook formula ΔV ≈ I/(2 f C) is an overestimate (here by 20–40%): it assumes C discharges for the full 10 ms, while the recharge takes up part of that time. More capacitance reduces the ripple, more load current increases it. Two diodes conduct at each recharge.'),
      scene, question: { kind: 'number', unit: 'V', expected: ripple, tolerancePct: 8 } };
  }),
];

export const CHAPTERS: string[] = [...new Set(EXERCISES.map(e => e.chapter))];
/** Il nome inglese di ogni capitolo. La chiave resta il nome italiano, che è anche il campo «chapter». */
export const CHAPTER_EN: Record<string, string> = {
  Resistenze: 'Resistors', Diodi: 'Diodes', 'Condensatori e bobine': 'Capacitors and inductors', 'Alimentazione e protezioni': 'Power and protection',
  Circuiti: 'Circuits', Transistor: 'Transistors', 'Alternata e oscilloscopio': 'AC and the oscilloscope',
};

export function buildExercise(id: string, variant: number, lang: Lang = 'it'): Exercise {
  const d = EXERCISES.find(e => e.id === id);
  if (!d) throw new Error(`esercizio sconosciuto: ${id}`);
  return d.build(variant, lang);
}

/** La risposta è giusta? Per i numeri vale la tolleranza dell'esercizio; un valore non numerico è sbagliato. */
export function checkAnswer(q: Question, answer: number): boolean {
  if (q.kind === 'choice') return answer === q.correct;
  return Math.abs(answer - q.expected) <= Math.abs(q.expected) * q.tolerancePct / 100 + 1e-12;
}

/** Cosa dire dopo una risposta sbagliata: se è lo sbaglio previsto, la spiegazione; se no, null. */
export function feedbackFor(q: Question, answer: number): string | null {
  if (q.kind !== 'number' || !q.near || checkAnswer(q, answer)) return null;
  return Math.abs(answer - q.near.value) <= Math.abs(q.near.value) * q.near.tolerancePct / 100 ? q.near.message : null;
}

/** I componenti che si possono mettere sul banco libero, uno alla volta. */
export const DRAWER: { id: string; name: string; nameEn: string; make(): Part }[] = [
  { id: 'r-4k7', name: 'Resistenza 4,7 kΩ', nameEn: '4.7 kΩ resistor', make: () => resistor('X1', 4700, 5, { factor: 1.02 }) },
  { id: 'r-1m', name: 'Resistenza 1 MΩ', nameEn: '1 MΩ resistor', make: () => resistor('X1', 1e6, 5, { factor: 0.98 }) },
  { id: 'c-104', name: 'Condensatore ceramico 104', nameEn: 'Ceramic capacitor 104', make: () => capacitor('X1', 100e-9, 'ceramic', { factor: 0.94 }) },
  { id: 'c-1000', name: 'Elettrolitico 1000 µF', nameEn: '1000 µF electrolytic', make: () => capacitor('X1', 1000e-6, 'electrolytic', { factor: 0.95 }) },
  { id: 'l-100u', name: 'Bobina 100 µH', nameEn: '100 µH inductor', make: () => inductor('X1', 100e-6, 1.8) },
  { id: 'd-4148', name: 'Diodo 1N4148', nameEn: '1N4148 diode', make: () => diode('X1', '1N4148') },
  { id: 'd-schottky', name: 'Diodo Schottky', nameEn: 'Schottky diode', make: () => diode('X1', 'schottky') },
  { id: 'led-r', name: 'LED rosso', nameEn: 'Red LED', make: () => diode('X1', 'led-red') },
  { id: 'led-b', name: 'LED blu', nameEn: 'Blue LED', make: () => diode('X1', 'led-blue') },
  { id: 'z-5v1', name: 'Zener 5,1 V', nameEn: '5.1 V Zener', make: () => diode('X1', '1N4148', { zenerVolt: 5.1 }) },
  { id: 'q-npn', name: 'Transistor BC547', nameEn: 'BC547 transistor', make: () => bjt('X1', 'npn', 'CBE') },
  { id: 'f', name: 'Fusibile', nameEn: 'Fuse', make: () => fuse('X1', false) },
  { id: 'b-9v', name: 'Pila 9 V', nameEn: '9 V battery', make: () => battery('X1', '9v', 0.9) },
  { id: 'b-aa', name: 'Stilo 1,5 V', nameEn: '1.5 V AA cell', make: () => battery('X1', 'aa', 0.8) },
  { id: 't-12', name: 'Trasformatore 12 V~', nameEn: '12 V~ transformer', make: () => transformer('X1', 12) },
  { id: 'gen-1k', name: 'Generatore 1 kHz', nameEn: '1 kHz generator', make: () => generator('X1', 2, 1000) },
];
