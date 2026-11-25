// Gli aiutini: tabelle di riferimento in sovraimpressione, come il foglietto appeso sopra il banco. Non costano stelle:
// dicono come si legge un codice, non quanto vale il pezzo che hai davanti.
import { BAND_COLORS } from '../shared/config.ts';
import { h } from './ui.ts';
import { t } from './i18n.ts';

const COLORE: Record<string, string> = { nero: '#141414', marrone: '#7a4a21', rosso: '#d42a2a', arancio: '#f08a1c', giallo: '#f2d21a', verde: '#2e9e4a', blu: '#2b56c8', viola: '#8a3fc4', grigio: '#8a8a8a', bianco: '#f2f2f2', oro: '#c9a23a', argento: '#c4c8cc' };
const NOME_EN: Record<string, string> = { nero: 'black', marrone: 'brown', rosso: 'red', arancio: 'orange', giallo: 'yellow', verde: 'green', blu: 'blue', viola: 'violet', grigio: 'grey', bianco: 'white', oro: 'gold', argento: 'silver' };
const nome = (c: string): string => t(c, NOME_EN[c]);
const pallino = (c: string): HTMLElement => h('i', { class: 'pallino', style: `background:${COLORE[c]}` });
const MOLT = ['1', '10', '100', '1 k', '10 k', '100 k', '1 M', '10 M', '100 M', '1 G'];
const TOLL: Record<string, string> = { marrone: '±1%', rosso: '±2%', oro: '±5%', argento: '±10%' };

export type Card = 'colori' | 'condensatori' | 'selettore' | 'diodi' | 'oscilloscopio';

function cartaColori(): HTMLElement {
  return h('div', { class: 'carta' }, h('h4', {}, t('Il codice colori (quattro bande)', 'Resistor colour code (four bands)')),
    h('p', {}, t('Tieni la banda staccata (la tolleranza, spesso oro) a destra. Prima banda: prima cifra. Seconda: seconda cifra. Terza: per quanto moltiplicare.', 'Keep the separate band (tolerance, often gold) on the right. First band: first digit. Second: second digit. Third: the multiplier.')),
    h('table', { class: 'codici' }, h('tr', {}, h('th', {}, t('colore', 'colour')), h('th', {}, t('cifra', 'digit')), h('th', {}, '× Ω'), h('th', {}, t('tolleranza', 'tolerance'))),
      ...BAND_COLORS.map((c, i) => h('tr', {}, h('td', {}, pallino(c), ' ', nome(c)), h('td', { class: 'n' }, String(i)), h('td', { class: 'n' }, MOLT[i]), h('td', { class: 'n' }, TOLL[c] ?? ''))),
      h('tr', {}, h('td', {}, pallino('oro'), ' ', nome('oro')), h('td', {}, ''), h('td', { class: 'n' }, '0,1'), h('td', { class: 'n' }, TOLL.oro)),
      h('tr', {}, h('td', {}, pallino('argento'), ' ', nome('argento')), h('td', {}, ''), h('td', { class: 'n' }, '0,01'), h('td', { class: 'n' }, TOLL.argento))),
    h('p', { class: 'esempio' }, pallino('giallo'), pallino('viola'), pallino('rosso'), pallino('oro'), ' ', t('4 e 7, poi × 100: 4700 Ω = 4,7 kΩ, ±5%.', '4 and 7, then × 100: 4700 Ω = 4.7 kΩ, ±5%.')),
    h('p', { class: 'piccolo' }, t('Per ricordarli: «Non Mangiare Ripieni, Aranciata Gialla Va Bene, Vino Grigio Bianco» (nero, marrone, rosso, arancio, giallo, verde, blu, viola, grigio, bianco).', 'Mnemonic: "Bad Beer Rots Our Young Guts But Vodka Goes Well" (black, brown, red, orange, yellow, green, blue, violet, grey, white).')));
}
function cartaCondensatori(): HTMLElement {
  return h('div', { class: 'carta' }, h('h4', {}, t('Il codice dei condensatori ceramici', 'Ceramic capacitor code')),
    h('p', {}, t('Tre cifre, in picofarad: le prime due sono il valore, la terza quanti zeri aggiungere.', 'Three digits, in picofarads: the first two are the value, the third is how many zeros to add.')),
    h('table', { class: 'codici' }, h('tr', {}, h('th', {}, t('scritto', 'marked')), h('th', {}, 'pF'), h('th', {}, t('cioè', 'that is'))),
      ...[['220', '22', '22 pF'], ['101', '100', '100 pF'], ['102', '1 000', '1 nF'], ['472', '4 700', '4,7 nF'], ['103', '10 000', '10 nF'], ['104', '100 000', '100 nF'], ['105', '1 000 000', '1 µF']].map(([a, b, c]) => h('tr', {}, h('td', { class: 'n' }, a), h('td', { class: 'n' }, b), h('td', { class: 'n' }, t(c, c.replace(',', '.')))))),
    h('p', { class: 'piccolo' }, t('1000 pF = 1 nF; 1000 nF = 1 µF. Sugli elettrolitici il valore è scritto per esteso, con la tensione massima, e la striscia segna il negativo.', '1000 pF = 1 nF; 1000 nF = 1 µF. Electrolytics have the value written out with the maximum voltage, and the stripe marks the negative lead.')));
}
function cartaSelettore(): HTMLElement {
  const r = (s: string, it: string, en: string): HTMLElement => h('tr', {}, h('td', { class: 'n' }, s), h('td', {}, t(it, en)));
  return h('div', { class: 'carta' }, h('h4', {}, t('Il selettore del multimetro', 'The multimeter dial')),
    h('table', { class: 'codici' },
      r('V⎓', 'tensione continua: in parallelo, rosso al più alto', 'DC voltage: in parallel, red on the higher point'),
      r('V~', 'tensione alternata: legge il valore efficace', 'AC voltage: reads the RMS value'),
      r('Ω', 'resistenza: solo a circuito spento', 'resistance: power off only'),
      r('·)))', 'continuità: suona se c\'è quasi un filo', 'continuity: beeps on almost a wire'),
      r('▶|', 'prova diodi: rosso sull\'anodo, mostra la caduta', 'diode test: red on the anode, shows the drop'),
      r('⊣⊢', 'capacità: condensatore scarico e staccato', 'capacitance: capacitor discharged and removed'),
      r('mA, 10 A', 'corrente: in SERIE, col rosso nella boccola giusta', 'current: in SERIES, red lead in the right jack')),
    h('p', { class: 'piccolo' }, t('Finita una misura di corrente, rimetti subito il rosso in VΩ: è l\'errore che brucia più fusibili.', 'After measuring current, put the red lead straight back in VΩ: it is the mistake that blows most fuses.')));
}
function cartaDiodi(): HTMLElement {
  return h('div', { class: 'carta' }, h('h4', {}, t('Prova diodi: cosa aspettarsi', 'Diode test: what to expect')),
    h('table', { class: 'codici' }, h('tr', {}, h('th', {}, t('pezzo', 'part')), h('th', {}, t('verso giusto', 'forward')), h('th', {}, t('al contrario', 'reverse'))),
      ...[[t('silicio (1N4148, 1N4007)', 'silicon (1N4148, 1N4007)'), '0,5–0,7 V'], ['Schottky', '0,15–0,3 V'], [t('germanio', 'germanium'), '0,2–0,3 V'], [t('LED rosso', 'red LED'), '1,7–1,9 V'], [t('LED verde', 'green LED'), '2,0–2,2 V'], [t('LED blu o bianco', 'blue or white LED'), 'OL (> 2,5 V)'],
        [t('in corto', 'shorted'), t('0 e cicalino', '0 and beep')], [t('interrotto', 'open'), 'OL']].map(([a, b], i) => h('tr', {}, h('td', {}, a), h('td', { class: 'n' }, t(b, b.replace(/(\d),(\d)/g, '$1.$2'))), h('td', { class: 'n' }, i === 6 ? t('0 e cicalino', '0 and beep') : 'OL')))),
    h('p', { class: 'piccolo' }, t('Transistor: due diodi che partono dalla base. NPN: conduce col rosso sulla base; PNP: col nero.', 'Transistor: two diodes starting from the base. NPN: conducts with red on the base; PNP: with black.')));
}
function cartaOscilloscopio(): HTMLElement {
  return h('div', { class: 'carta' }, h('h4', {}, t('Leggere l\'oscilloscopio', 'Reading the oscilloscope')),
    h('table', { class: 'codici' },
      h('tr', {}, h('td', {}, t('tensione', 'voltage')), h('td', {}, t('divisioni in verticale × V/div', 'vertical divisions × V/div'))),
      h('tr', {}, h('td', {}, t('tempo', 'time')), h('td', {}, t('divisioni in orizzontale × tempo/div', 'horizontal divisions × time/div'))),
      h('tr', {}, h('td', {}, t('frequenza', 'frequency')), h('td', {}, t('f = 1 / periodo (periodo in secondi)', 'f = 1 / period (period in seconds)'))),
      h('tr', {}, h('td', {}, t('picco ed efficace', 'peak and RMS')), h('td', {}, t('Vpicco = √2 · Veff ≈ 1,41 · Veff', 'Vpeak = √2 · Vrms ≈ 1.41 · Vrms'))),
      h('tr', {}, h('td', {}, 'DC / AC'), h('td', {}, t('DC: tutto il segnale. AC: toglie la media, per vedere piccole ondulazioni.', 'DC: the whole signal. AC: removes the average, to see small ripple.')))),
    h('p', { class: 'piccolo' }, t('Scegli il V/div più piccolo che tiene la traccia sullo schermo: più divisioni occupa, più è precisa la lettura. Le due masse delle sonde sono in comune.', 'Pick the smallest V/div that keeps the trace on screen: the more divisions it spans, the more precise the reading. The two probe grounds are common.')));
}
const CARTE: Record<Card, () => HTMLElement> = { colori: cartaColori, condensatori: cartaCondensatori, selettore: cartaSelettore, diodi: cartaDiodi, oscilloscopio: cartaOscilloscopio };
const TITOLI: Record<Card, () => string> = { colori: () => t('Colori', 'Colours'), condensatori: () => t('Condensatori', 'Capacitors'), selettore: () => t('Selettore', 'Dial'), diodi: () => t('Diodi', 'Diodes'), oscilloscopio: () => t('Oscilloscopio', 'Scope') };

/** Quale tabella aprire per prima, secondo l'esercizio. */
export function firstCard(exerciseId: string | null, chapter: string | null): Card {
  if (exerciseId === 'codice-condensatore') return 'condensatori';
  if (chapter === 'Resistenze') return 'colori';
  if (chapter === 'Diodi' || chapter === 'Transistor') return 'diodi';
  if (chapter === 'Alternata e oscilloscopio') return 'oscilloscopio';
  return 'selettore';
}

/** Il tasto «?» e la sua sovraimpressione. Sul computer si apre passandoci sopra; sul telefono col tocco. */
export function helpButton(first: Card): HTMLElement {
  let scelta: Card = first, fissata = false;
  const corpo = h('div', { class: 'aiutino-corpo' });
  const schede = h('div', { class: 'aiutino-schede' }, ...(Object.keys(CARTE) as Card[]).map(c => h('button', { class: 'scheda', 'data-carta': c, onclick: (e: Event) => { e.stopPropagation(); scelta = c; mostra(); } }, TITOLI[c]())));
  const chiudi = h('button', { class: 'chiudi', 'aria-label': t('chiudi', 'close'), onclick: (e: Event) => { e.stopPropagation(); fissata = false; pannello.hidden = true; } }, '×');
  const pannello = h('div', { class: 'aiutino', id: 'aiutino', role: 'dialog' }, chiudi, schede, corpo, h('p', { class: 'piccolo appunti-link' }, t('La teoria completa sta negli Appunti, dal menu.', 'The full theory is in the Notes, from the menu.')));
  pannello.hidden = true;
  const mostra = (): void => { corpo.replaceChildren(CARTE[scelta]()); for (const b of schede.querySelectorAll<HTMLElement>('.scheda')) b.classList.toggle('scelto', b.dataset.carta === scelta); pannello.hidden = false; };
  const bottone = h('button', { class: 'aiuto-tasto', id: 'aiutino-tasto', title: t('Tabelle di aiuto (gratis)', 'Help tables (free)'), 'aria-label': t('aiuto', 'help'),
    onclick: () => { fissata = !fissata || pannello.hidden === true; if (fissata) mostra(); else pannello.hidden = true; } }, '?');
  const box = h('div', { class: 'aiutino-box' }, bottone, pannello);
  box.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) mostra(); });
  box.addEventListener('mouseleave', () => { if (!fissata) pannello.hidden = true; });
  return box;
}
