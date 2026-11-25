// Gli esercizi. Ognuno costruisce la sua scena (con una variante: i valori e i guasti cambiano a ogni tentativo, ma
// in modo ripetibile), fa una domanda e sa qual è la risposta giusta. Le risposte «misurate» non sono scritte a mano:
// si ottengono chiedendo al multimetro del modello, messo nel modo giusto.
import { E12 } from './config.ts';
import { read, type Dial, type Jack, type MeterState } from './meter.ts';
import { battery, bjt, capacitor, diode, fuse, inductor, resistor, si, toggle, transformer, type Part } from './parts.ts';
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
export interface ExerciseDef { id: string; chapter: string; title: string; build(variant: number): Exercise }

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

function def(id: string, chapter: string, title: string, build: (r: () => number) => Omit<Exercise, 'id' | 'chapter' | 'title'>): ExerciseDef {
  return { id, chapter, title, build: variant => ({ id, chapter, title, ...build(rng(seedOf(id, variant))) }) };
}

export const EXERCISES: ExerciseDef[] = [
  // ------------------------------------------------------------ resistenze
  def('colori', 'Resistenze', 'Il codice colori', r => {
    const ohm = e12(r, 1, 5), p = resistor('R1', ohm, 5, { factor: 1 + (r() - 0.5) * 0.06 });
    const unit = ohm >= 1e6 ? 'MΩ' : ohm >= 1e3 ? 'kΩ' : 'Ω', scala = ohm >= 1e6 ? 1e6 : ohm >= 1e3 ? 1e3 : 1;
    const vero = (p.truth.real as number) / scala;
    return { text: `Leggi le bande della resistenza: qual è il suo valore nominale, cioè quello scritto dai colori? Scrivilo in ${unit}. Il multimetro serve a controllare: il pezzo vero si scosta un po' dal nominale, dentro la tolleranza.`,
      hint: 'Le prime due bande sono le cifre, la terza dice quanti zeri aggiungere, la quarta (staccata) è la tolleranza. Per controllare: selettore su Ω, un puntale per piedino.',
      explain: `${p.mark}: ${si(ohm, 'Ω')}, tolleranza 5%. Il multimetro legge il valore vero di questo pezzo, ${si(p.truth.real as number, 'Ω')}: dentro la tolleranza non è mai identico al nominale.`,
      scene: row([p]), question: { kind: 'number', unit, expected: ohm / scala, tolerancePct: 0.5,
        near: { value: vero, tolerancePct: 1, message: 'Questo è il valore misurato, quello vero di questo pezzo. La domanda chiede il nominale: quello che dicono le bande, un numero tondo della serie E12.' } } };
  }),
  def('tolleranza', 'Resistenze', 'È in tolleranza?', r => {
    const ohm = e12(r, 1, 4), buona = r() < 0.5, p = resistor('R1', ohm, 5, buona ? { factor: 1 + (r() - 0.5) * 0.07 } : { fault: 'drift' });
    return { text: 'Questa resistenza ha la banda oro: 5%. Misurala e decidi se è ancora dentro la sua tolleranza.',
      hint: 'Leggi il valore dalle bande, misura in Ω e calcola di quanto si scosta: (misurato − nominale) / nominale. Entro il 5% è buona.',
      explain: `Nominale ${si(ohm, 'Ω')}, misurata ${si(p.truth.real as number, 'Ω')}: scarto del ${(((p.truth.real as number) / ohm - 1) * 100).toFixed(1).replace('.', ',')}%. ${buona ? 'È buona.' : 'È fuori: una resistenza che ha scaldato troppo sale di valore.'}`,
      scene: row([p]), question: { kind: 'choice', options: ['Sì, è in tolleranza', 'No, è fuori tolleranza'], correct: buona ? 0 : 1 } };
  }),
  def('interrotta', 'Resistenze', 'Quale è interrotta?', r => {
    const rotta = Math.floor(r() * 3), parts = [0, 1, 2].map(i => resistor(`R${i + 1}`, e12(r, 1, 4), 5, i === rotta ? { fault: 'open' } : { factor: 1 + (r() - 0.5) * 0.06 }));
    return { text: 'Tre resistenze uguali a vedersi. Una è interrotta dentro: trovala.', hint: 'Selettore su Ω: quella interrotta fa scrivere OL (fuori scala), le altre danno il loro valore.',
      explain: `Era ${posti(3)[rotta]}: OL vuol dire «resistenza più alta di quanto so misurare», cioè circuito aperto. A occhio non si vede.`,
      scene: row(parts), question: { kind: 'choice', options: posti(3), correct: rotta } };
  }),
  def('serie-parallelo', 'Resistenze', 'Serie e parallelo', r => {
    const a = e12(r, 2, 3), b = e12(r, 2, 3), c = e12(r, 2, 3), totale = a + b * c / (b + c);
    return { text: 'Tre resistenze saldate insieme: R1 in alto, poi R2 e R3 affiancate in verticale. Quanto vale la resistenza fra il piedino libero di R1 (a sinistra) e il filo in basso?',
      hint: 'R2 e R3 sono in parallelo fra loro: (R2 · R3) / (R2 + R3), sempre meno della più piccola. R1 è in serie a quel parallelo: si somma. Poi controlla in Ω fra il piedino sinistro di R1 e il piedino basso di R2.',
      explain: `Parallelo: ${si(b, 'Ω')} e ${si(c, 'Ω')} fanno ${si(b * c / (b + c), 'Ω')}. In serie con ${si(a, 'Ω')}: ${si(totale, 'Ω')}.`,
      scene: loop(null, [resistor('R1', a)], { shunts: [{ after: 0, part: resistor('R2', b) }, { after: 0, part: resistor('R3', c) }] }),
      question: { kind: 'number', unit: 'kΩ', expected: totale / 1000, tolerancePct: 2 } };
  }),
  // ------------------------------------------------------------ diodi
  def('catodo', 'Diodi', 'Dov\'è il catodo?', r => {
    const girato = r() < 0.5, p = diode('D1', '1N4148', { flipped: girato, unmarked: true });
    return { text: 'A questo diodo si è cancellata la fascia. Trova da che parte sta il catodo.', hint: 'Selettore sulla prova diodi (il simbolo del diodo). Quando il display mostra circa 0,6 V, il puntale nero sta sul catodo. Se scrive OL, scambia i puntali.',
      explain: 'Il diodo conduce quando l\'anodo è più positivo del catodo: il rosso (positivo) sull\'anodo, il nero sul catodo. La fascia sul corpo segna il catodo.',
      scene: row([p]), question: { kind: 'choice', options: ['a sinistra', 'a destra'], correct: girato ? 0 : 1 } };
  }),
  def('tre-diodi', 'Diodi', 'Uno solo è buono', r => {
    const ordine = shuffle(r, ['good', 'short', 'open'] as const), parts = ordine.map((f, i) => diode(`D${i + 1}`, '1N4007', f === 'good' ? {} : { fault: f }));
    return { text: 'Tre diodi tolti da un alimentatore guasto: uno è in corto, uno è interrotto, uno è buono. Qual è quello buono?',
      hint: 'Prova diodi nei due versi su ognuno. Buono: circa 0,6 V in un verso e OL nell\'altro. In corto: zero (e cicalino) nei due versi. Interrotto: OL nei due versi.',
      explain: 'Un diodo va provato sempre nei due versi: è la differenza fra i due versi che dice che funziona.',
      scene: row(parts), question: { kind: 'choice', options: posti(3), correct: ordine.indexOf('good') } };
  }),
  def('che-diodo', 'Diodi', 'Che diodo è?', r => {
    const tipi = [['1N4148', 'al silicio (circa 0,6 V)'], ['schottky', 'Schottky (circa 0,2 V)'], ['led-red', 'un LED (quasi 2 V)']] as const, k = Math.floor(r() * 3);
    return { text: 'Un diodo senza sigla. Dalla caduta di tensione in diretta, che tipo è?', hint: 'Prova diodi, nel verso in cui conduce: il numero sul display è la caduta in volt.',
      explain: 'Ogni tecnologia ha la sua caduta: silicio 0,6–0,7 V, Schottky 0,15–0,3 V, germanio circa 0,2–0,3 V, LED da 1,7 V in su secondo il colore.',
      scene: row([diode('D1', tipi[k][0], { flipped: r() < 0.5, unmarked: true })]), question: { kind: 'choice', options: tipi.map(t => t[1]), correct: k } };
  }),
  def('zener', 'Diodi', 'Lo zener al lavoro', r => {
    const vz = pick(r, [3.3, 5.1, 6.2]), z = diode('Z1', '1N4148', { zenerVolt: vz, flipped: true }), s = loop(battery('B1', '9v', 1), [resistor('R1', 330)], { shunts: [{ after: 0, part: z }] });
    const v = read(sceneElements(s), meter('vdc'), { red: z.pads[0], black: z.pads[1] }).value;
    return { text: 'Una pila da 9 V, una resistenza e uno zener montato al contrario (catodo verso il positivo). Che tensione c\'è ai capi dello zener?',
      hint: 'Selettore su V in continua, puntale rosso sul piedino alto dello zener e nero su quello basso. Il circuito è acceso: non usare gli ohm.',
      explain: `Uno zener in inversa tiene la sua tensione (qui ${String(vz).replace('.', ',')} V nominali) qualunque sia la corrente, entro certi limiti: è lo stabilizzatore più semplice. Il resto dei 9 V cade sulla resistenza.`,
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 3 } };
  }),
  // ------------------------------------------------------------ condensatori e bobine
  def('codice-condensatore', 'Condensatori e bobine', 'Il codice a tre cifre', r => {
    const farad = pick(r, [1, 2.2, 4.7, 10, 22, 47, 100, 220, 470]) * 1e-9, p = capacitor('C1', farad, 'ceramic', { factor: 1 + (r() - 0.5) * 0.12 });
    return { text: `Sul condensatore ceramico c'è scritto ${p.mark}. Quanti nanofarad vale secondo il codice? Il capacimetro serve a controllare: il pezzo vero si scosta dal valore scritto.`,
      hint: 'Le prime due cifre sono il valore, la terza il numero di zeri: il risultato è in picofarad. Mille picofarad fanno un nanofarad. Per controllare: selettore su ⊣⊢ (capacità).',
      explain: `${p.mark}: ${p.mark.slice(0, 2)} seguito da ${p.mark[2]} zeri, in picofarad, cioè ${si(farad, 'F')}. Il capacimetro legge ${si(p.truth.real as number, 'F')}: i ceramici hanno tolleranze larghe.`,
      scene: row([p]), question: { kind: 'number', unit: 'nF', expected: farad * 1e9, tolerancePct: 0.5,
        near: { value: (p.truth.real as number) * 1e9, tolerancePct: 1, message: 'Questo è il valore misurato dal capacimetro. La domanda chiede quello scritto dal codice a tre cifre.' } } };
  }),
  def('elettrolitici', 'Condensatori e bobine', 'Tre elettrolitici', r => {
    const ordine = shuffle(r, ['good', 'short', 'dry'] as const), farad = pick(r, [100e-6, 220e-6, 470e-6]);
    const parts = ordine.map((f, i) => capacitor(`C${i + 1}`, farad, 'electrolytic', f === 'good' ? { factor: 0.93 } : { fault: f }));
    return { text: `Tre elettrolitici da ${si(farad, 'F')} recuperati da una scheda: uno è in corto, uno si è seccato (ha perso capacità), uno è buono. Qual è quello buono?`,
      hint: 'Selettore su capacità: quello buono legge un valore vicino a quello scritto, quello secco molto meno. Quello in corto dà OL in capacità e pochi decimi di ohm in Ω.',
      explain: 'Un elettrolitico invecchiando si asciuga e perde capacità: sembra sano, ma non filtra più. In corto invece fa saltare il fusibile dell\'alimentatore.',
      scene: row(parts), question: { kind: 'choice', options: posti(3), correct: ordine.indexOf('good') } };
  }),
  def('carica', 'Condensatori e bobine', 'Il condensatore che si carica', r => {
    const perde = r() < 0.5, p = capacitor('C1', 1000e-6, 'electrolytic', perde ? { fault: 'leak' } : {});
    return { text: 'Un elettrolitico da 1000 µF. Mettilo sotto l\'ohmetro e guarda cosa fa la lettura nel tempo: è buono o perde?',
      hint: 'Selettore su Ω e puntali sui piedini. Buono: la lettura parte bassa, sale da sola e finisce in OL. Se perde: si ferma su un valore e non sale più.',
      explain: 'L\'ohmetro carica il condensatore: all\'inizio assorbe corrente (sembra un corto), poi sempre meno. Se resta un valore fisso, quella è la resistenza di perdita.',
      scene: row([p]), question: { kind: 'choice', options: ['È buono: sale fino a OL', 'Perde: si ferma su un valore'], correct: perde ? 1 : 0 } };
  }),
  def('bobina', 'Condensatori e bobine', 'La bobina interrotta', r => {
    const rotta = Math.floor(r() * 2), parts = [0, 1].map(i => inductor(`L${i + 1}`, 100e-6, 1.6 + r(), i === rotta ? { fault: 'open' } : {}));
    return { text: 'Due bobine uguali. In una il filo si è spezzato sotto lo smalto. Quale?', hint: 'Selettore sulla continuità (il simbolo del suono): una bobina buona è un filo, quindi suona. Quella interrotta tace.',
      explain: 'In continua una bobina è solo il suo filo: pochi ohm. L\'induttanza non si misura col multimetro: serve un LCR-metro o un analizzatore.',
      scene: row(parts), question: { kind: 'choice', options: posti(2), correct: rotta } };
  }),
  // ------------------------------------------------------------ alimentazione e protezioni
  def('fusibili', 'Alimentazione e protezioni', 'Il fusibile saltato', r => {
    const saltato = Math.floor(r() * 3);
    return { text: 'Tre fusibili in ceramica: dentro non si vede. Uno è saltato.', hint: 'Continuità: quello buono suona, quello saltato no.',
      explain: 'Un fusibile si prova sempre con lo strumento e fuori dal portafusibile: in circuito un\'altra via può far suonare il cicalino lo stesso.',
      scene: row([0, 1, 2].map(i => fuse(`F${i + 1}`, i === saltato))), question: { kind: 'choice', options: posti(3), correct: saltato } };
  }),
  def('pila', 'Alimentazione e protezioni', 'La pila sotto carico', r => {
    const carica = pick(r, [1, 0.6, 0.25, 0.1]), s = loop(battery('B1', '9v', carica), [toggle('S1', false), resistor('R1', 100)], { closed: true });
    const chiusa: Scene = { ...s, parts: s.parts.map(p => p.id === 'S1' ? toggle('S1', true) : p) };
    const v = read(sceneElements(chiusa), meter('vdc'), { red: 'B1.1', black: 'B1.2' }).value;
    return { text: 'Una pila da 9 V con un carico da 100 Ω dietro un ponticello aperto. Chiudi il ponticello (cliccalo) e misura: quanti volt dà la pila sotto carico?',
      hint: 'Selettore su V in continua, rosso sul + della pila (in alto) e nero sul −. Misura prima a vuoto, poi chiudi il ponticello: guarda di quanto scende.',
      explain: 'A vuoto anche una pila scarica segna quasi la sua tensione. È la resistenza interna che cresce: appena le chiedi corrente la tensione crolla. Una pila si giudica sotto carico.',
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 3 } };
  }),
  def('trasformatore', 'Alimentazione e protezioni', 'Continua o alternata?', r => {
    const v = pick(r, [6, 9, 12, 15, 24]), p = transformer('T1', v);
    return { text: 'Il secondario di un piccolo trasformatore da rete. Che tensione dà?', hint: 'È alternata: selettore su V~. Con il selettore sulla continua leggeresti zero, pur essendoci tensione.',
      explain: 'Una tensione alternata ha media zero: il voltmetro in continua non la vede. Prima di toccare un circuito si misura in tutte e due le posizioni.',
      scene: row([p]), question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 3 } };
  }),
  // ------------------------------------------------------------ circuiti
  def('partitore', 'Circuiti', 'Il partitore di tensione', r => {
    const a = e12(r, 3, 3), b = e12(r, 3, 3), s = loop(battery('B1', '9v', 1), [resistor('R1', a)], { shunts: [{ after: 0, part: resistor('R2', b) }] });
    const v = read(sceneElements(s), meter('vdc'), { red: 'R2.1', black: 'R2.2' }).value;
    return { text: 'Una pila e due resistenze in serie. Che tensione c\'è ai capi di R2 (quella in verticale)?', hint: 'Selettore su V in continua, puntali ai due capi di R2. Puoi anche calcolarla: V · R2 / (R1 + R2), con V misurata sulla pila.',
      explain: `La tensione si divide in proporzione alle resistenze: su R2 cade la frazione R2 / (R1 + R2) = ${(b / (a + b) * 100).toFixed(0)}% del totale.`,
      scene: s, question: { kind: 'number', unit: 'V', expected: v, tolerancePct: 2 } };
  }),
  def('corrente-led', 'Circuiti', 'La corrente nel LED', r => {
    const ohm = pick(r, [330, 470, 680, 1000]), colore = pick(r, ['led-red', 'led-green'] as const);
    const s = loop(battery('B1', '9v', 1), [resistor('R1', ohm), toggle('S1', true), diode('L1', colore)], { closed: true });
    const aperta: Scene = { ...s, parts: s.parts.map(p => p.id === 'S1' ? toggle('S1', false) : p) };
    const i = read(sceneElements(aperta), meter('ma', 'ma'), { red: 'S1.1', black: 'S1.2' }).value;
    return { text: 'Un LED acceso con la sua resistenza. Quanta corrente lo attraversa?',
      hint: 'L\'amperometro va in serie: apri il ponticello (cliccalo), sposta il puntale rosso nella boccola mA, selettore su mA, e metti i puntali ai due capi del ponticello aperto. Oppure, senza aprire niente: misura la tensione su R1 e dividi per il suo valore.',
      explain: 'La corrente si misura interrompendo il circuito e facendola passare dallo strumento. Mai mettere l\'amperometro in parallelo: è quasi un cortocircuito. A misura finita, rimetti il puntale nella boccola VΩ.',
      scene: s, question: { kind: 'number', unit: 'mA', expected: i * 1000, tolerancePct: 4 } };
  }),
  def('guasto', 'Circuiti', 'Il LED che non si accende', r => {
    const guasti = ['la resistenza è interrotta', 'il LED è montato al contrario', 'il LED è interrotto', 'il ponticello è aperto'], k = Math.floor(r() * 4);
    const s = loop(battery('B1', '9v', 1), [resistor('R1', 470, 5, k === 0 ? { fault: 'open' } : {}), toggle('S1', k !== 3), diode('L1', 'led-red', { flipped: k === 1, fault: k === 2 ? 'open' : undefined, unmarked: true })], { closed: true });
    return { text: 'Pila, resistenza, ponticello e LED: il LED resta spento. Trova il guasto misurando, senza smontare niente.',
      hint: 'Selettore su V in continua e nero sul − della pila. Segui la tensione col rosso, punto per punto, dal + in avanti: dove sparisce, lì c\'è l\'interruzione. Se arriva fino al LED e lui non si accende, guarda quanta ne cade sul LED.',
      explain: 'In un circuito in serie interrotto, tutta la tensione della pila si ritrova ai capi del punto aperto. Con la resistenza interrotta i 9 V stanno su di lei; col LED interrotto o al contrario stanno sul LED (e per distinguerli lo si prova con la prova diodi, a circuito spento).',
      scene: s, question: { kind: 'choice', options: guasti, correct: k } };
  }),
  // ------------------------------------------------------------ transistor
  def('base', 'Transistor', 'Trova la base', r => {
    const pins = pick(r, ['EBC', 'BCE', 'CBE', 'ECB', 'BEC', 'CEB']), pol = pick(r, ['npn', 'pnp'] as const), q = bjt('Q1', pol, pins);
    return { text: 'Un transistor con la sigla illeggibile. Qual è il piedino della base?', hint: 'Prova diodi fra tutte le coppie di piedini. La base è l\'unico piedino che conduce verso tutti e due gli altri (col rosso sulla base se è NPN, col nero se è PNP). Fra collettore ed emettitore non conduce mai.',
      explain: 'Visto col multimetro un transistor è due diodi che partono dalla base. Trovata la base, la giunzione con la caduta un po\' più alta è quella dell\'emettitore.',
      scene: row([q]), question: { kind: 'choice', options: posti(3), correct: pins.indexOf('B') } };
  }),
  def('npn-pnp', 'Transistor', 'NPN o PNP?', r => {
    const pol = pick(r, ['npn', 'pnp'] as const), q = bjt('Q1', pol, pick(r, ['EBC', 'BCE', 'CBE']));
    return { text: 'Stesso tipo di prova: questo transistor è NPN o PNP?', hint: 'Trova la base con la prova diodi. Se conduce col puntale rosso sulla base è NPN (la base è la zona P); se conduce col nero sulla base è PNP.',
      explain: 'NPN: la base è l\'anodo delle due giunzioni. PNP: è il catodo. È la prima cosa da sapere prima di sostituirne uno.',
      scene: row([q]), question: { kind: 'choice', options: ['NPN', 'PNP'], correct: pol === 'npn' ? 0 : 1 } };
  }),
  // ------------------------------------------------------------ alternata nel tempo
  def('ac-peak', 'Alternata e oscilloscopio', 'Dal picco al valore efficace', r => {
    const volt = pick(r, [3, 6, 9, 12]);
    return { text: 'Misura il picco della sinusoide di T1 con il canale 1. Dividilo per √2: quale valore efficace ottieni in volt? Controlla anche con V~.',
      hint: 'Sonda 1 su T1.1, massa 1 su T1.2; 5 V/div e 2 ms/div, accoppiamento DC. Conta le divisioni dal centro al picco e moltiplica per V/div, poi dividi per √2.',
      explain: 'Per una sinusoide Veff = Vpicco / √2: il picco supera il valore efficace del 41%. V~ misura la radice della media dei quadrati della componente alternata.',
      scene: row([transformer('T1', volt)]), question: { kind: 'number', unit: 'V', expected: volt, tolerancePct: 3 } };
  }),
  def('ac-frequency', 'Alternata e oscilloscopio', 'Un periodo sul reticolo', r => {
    const hz = pick(r, [50, 100, 1000]);
    return { text: 'La frequenza del generatore è sconosciuta. Misura un periodo sul reticolo e ricava la frequenza in hertz.',
      hint: 'Sonda 1 su T1.1 e massa 1 su T1.2. Parti da 2 ms/div; per periodi corti scegli 0,1 ms/div. T = divisioni × tempo/div; f = 1/T con T in secondi.',
      explain: 'Un periodo da 20 ms significa 50 Hz, da 10 ms significa 100 Hz, da 1 ms significa 1000 Hz. Il trigger sul fronte di salita stabilizza la traccia.',
      scene: row([transformer('T1', 6, hz)]), question: { kind: 'number', unit: 'Hz', expected: hz, tolerancePct: 3 } };
  }),
  def('half-wave', 'Alternata e oscilloscopio', 'Una sola semionda', r => {
    const scene = rectifier(false, pick(r, [6, 9, 12]), 0, pick(r, [470, 1000]));
    const scope = newScope(); scope.channels[0].probe = 'R1.1'; scope.channels[0].ground = 'R1.2';
    const peak = captureScope(sceneElements(scene), scope).frame.stats[0].max;
    return { text: 'D1 lascia passare una sola semionda. Misura il massimo positivo ai capi del carico R1: quanti volt raggiunge?',
      hint: 'Sonda 1 su R1.1 e massa 1 su R1.2, DC, 5 V/div e 2 ms/div. Il tratto negativo deve restare vicino a zero. Con il canale 2 su T1 puoi confrontare ingresso e uscita.',
      explain: 'Il diodo elimina la semionda negativa; sulla positiva perde una tensione che dipende dalla corrente. Il massimo va misurato: non basta assumere sempre una caduta di 0,7 V.',
      scene, question: { kind: 'number', unit: 'V', expected: peak, tolerancePct: 4 } };
  }),
  def('bridge-ripple', 'Alternata e oscilloscopio', 'Il ponte e il filtro', r => {
    const farad = pick(r, [100e-6, 220e-6, 470e-6]), ohm = pick(r, [470, 1000]), volt = pick(r, [6, 9, 12]);
    const scene = rectifier(true, volt, farad, ohm);
    const scope = newScope(); scope.channels[0].probe = 'C1.1'; scope.channels[0].ground = 'C1.2';
    const ripple = captureScope(sceneElements(scene), scope).frame.stats[0].ripple;
    return { text: `Secondario da ${volt} V efficaci, ponte a quattro diodi, filtro da ${si(farad, 'F')} e carico da ${si(ohm, 'Ω')}. Dopo l'assestamento misura il ripple picco-picco su C1, in volt. Per la risposta usa questi valori iniziali; poi esplora i comandi del filtro.`,
      hint: 'Sonda 1 su C1.1, massa 1 su C1.2. Aspetta la carica, scegli AC, 0,2 o 0,5 V/div e 2 ms/div. Ripple = massimo − minimo. Raddoppia C oppure dimezza R: osserva come cambia, poi ripristina i valori iniziali per rispondere.',
      explain: 'Il ponte ricarica il filtro due volte per periodo: qui ogni 10 ms. Fra le creste C alimenta il carico. A piccolo ripple ΔV ≈ I/(2 f C): più capacità lo riduce, più corrente di carico lo aumenta. Due diodi conducono a ogni ricarica.',
      scene, question: { kind: 'number', unit: 'V', expected: ripple, tolerancePct: 8 } };
  }),
];

export const CHAPTERS: string[] = [...new Set(EXERCISES.map(e => e.chapter))];

export function buildExercise(id: string, variant: number): Exercise {
  const d = EXERCISES.find(e => e.id === id);
  if (!d) throw new Error(`esercizio sconosciuto: ${id}`);
  return d.build(variant);
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
export const DRAWER: { id: string; name: string; make(): Part }[] = [
  { id: 'r-4k7', name: 'Resistenza 4,7 kΩ', make: () => resistor('X1', 4700, 5, { factor: 1.02 }) },
  { id: 'r-1m', name: 'Resistenza 1 MΩ', make: () => resistor('X1', 1e6, 5, { factor: 0.98 }) },
  { id: 'c-104', name: 'Condensatore ceramico 104', make: () => capacitor('X1', 100e-9, 'ceramic', { factor: 0.94 }) },
  { id: 'c-1000', name: 'Elettrolitico 1000 µF', make: () => capacitor('X1', 1000e-6, 'electrolytic', { factor: 0.95 }) },
  { id: 'l-100u', name: 'Bobina 100 µH', make: () => inductor('X1', 100e-6, 1.8) },
  { id: 'd-4148', name: 'Diodo 1N4148', make: () => diode('X1', '1N4148') },
  { id: 'd-schottky', name: 'Diodo Schottky', make: () => diode('X1', 'schottky') },
  { id: 'led-r', name: 'LED rosso', make: () => diode('X1', 'led-red') },
  { id: 'led-b', name: 'LED blu', make: () => diode('X1', 'led-blue') },
  { id: 'z-5v1', name: 'Zener 5,1 V', make: () => diode('X1', '1N4148', { zenerVolt: 5.1 }) },
  { id: 'q-npn', name: 'Transistor BC547', make: () => bjt('X1', 'npn', 'CBE') },
  { id: 'f', name: 'Fusibile', make: () => fuse('X1', false) },
  { id: 'b-9v', name: 'Pila 9 V', make: () => battery('X1', '9v', 0.9) },
  { id: 'b-aa', name: 'Stilo 1,5 V', make: () => battery('X1', 'aa', 0.8) },
  { id: 't-12', name: 'Trasformatore 12 V~', make: () => transformer('X1', 12) },
];
