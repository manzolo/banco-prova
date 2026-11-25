// Banco di prova: l'interfaccia. Tre viste (menu, banco, «come funziona»). Lo stato del banco e ogni regola stanno in
// shared/: qui si raccolgono i gesti, si chiede la lettura al modello a ogni passo e si mostra.
import { CHAPTERS, DRAWER, EXERCISES } from '../shared/exercises.ts';
import { answer, apply, newBench, partCurrent, tick, type Action, type Bench } from '../shared/game.ts';
import type { Dial, Jack, Note, Reading } from '../shared/meter.ts';
import { SAVE_KEY, parseSave, recordSolved, serializeSave, starCount, type Save } from '../shared/save.ts';
import { beep, buzz, chime, click, pop, setSound } from './audio.ts';
import { COME_HTML, COME_HTML_EN } from './come.ts';
import { scopePanel, type ScopeLead } from './scope.ts';
import { sceneSvg } from './draw.ts';
import { h, stelle } from './ui.ts';
import { lang, num, switchLang, t } from './i18n.ts';

declare const __VERSION__: string;
type View = 'menu' | 'banco' | 'come';
const app = document.querySelector<HTMLDivElement>('#app')!;
const S = { scopeLead: null as ScopeLead | null, tick: 0, view: 'menu' as View, save: leggi(), bench: null as Bench | null, reading: null as Reading | null, drawer: DRAWER[0].id, probe: 'red' as 'red' | 'black', version: __VERSION__,   // scritta alla compilazione: la mostra anche GitHub Pages, che non ha il server
  esito: null as { correct: boolean; stars: number; feedback: string | null } | null };
setSound(S.save.sound);

function leggi(): Save { try { return parseSave(localStorage.getItem(SAVE_KEY)); } catch { return parseSave(null); } }
function scrivi(): void { try { localStorage.setItem(SAVE_KEY, serializeSave(S.save)); } catch { /* senza salvataggio si gioca lo stesso */ } }

const DIALS: [Dial, string, string][] = [['off', 'OFF', t('spento', 'off')], ['vdc', 'V⎓', t('tensione continua', 'DC voltage')], ['vac', 'V~', t('tensione alternata', 'AC voltage')], ['ohm', 'Ω', t('resistenza', 'resistance')], ['cont', '·)))', t('continuità, col cicalino', 'continuity, with beeper')],
  ['diode', '▶|', t('prova diodi', 'diode test')], ['cap', '⊣⊢', t('capacità', 'capacitance')], ['ma', 'mA', t('corrente fino a 400 mA', 'current up to 400 mA')], ['a', '10 A', t('corrente fino a 10 A', 'current up to 10 A')]];
const JACKS: [Jack, string][] = [['v', 'VΩ'], ['ma', 'mA'], ['a', '10 A']];
const NOTE: Record<Note, (b: Bench) => string> = {
  ok: () => '',
  open: () => t('Puntali non collegati: tocca un piedino per posare il puntale scelto.', 'Leads not connected: tap a pin to place the selected lead.'),
  jack: b => b.meter.jack === 'v' ? t('Il selettore è sulla corrente ma il puntale rosso è in VΩ: così non passa niente. Spostalo nella boccola della corrente.', 'The dial is on current but the red lead is in VΩ: nothing flows like this. Move it to the current jack.')
    : b.meter.dial === 'ma' || b.meter.dial === 'a' ? t('Selettore e boccola non corrispondono: mA con mA, 10 A con 10 A.', 'Dial and jack do not match: mA with mA, 10 A with 10 A.')
    : t('Attento: il puntale rosso è in una boccola di corrente. Fra i puntali c\'è quasi un filo: su un generatore è un cortocircuito. Rimettilo in VΩ.', 'Careful: the red lead is in a current jack. Between the leads there is almost a wire: across a source it is a short circuit. Put it back in VΩ.'),
  live: () => t('Il circuito è sotto tensione: in Ω, continuità, prova diodi e capacità la lettura non vale. Queste misure si fanno a circuito spento.', 'The circuit is live: in Ω, continuity, diode test and capacitance the reading is not valid. These are done with the power off.'),
  fuse: () => t('PUM. È saltato un fusibile del multimetro: l\'amperometro era in parallelo a un generatore. La corrente si misura in serie.', 'POP. A meter fuse has blown: the ammeter was across a source. Current is measured in series.'),
  fuseBlown: () => t('Il fusibile di questa boccola è interrotto: finché non lo cambi, lo strumento non misura corrente (e il circuito resta aperto).', 'The fuse of this jack is blown: until you replace it the meter does not read current (and the circuit stays open).'),
  leak: () => t('Fra i puntali c\'è una via in continua: o non è un condensatore, o perde, o è in corto. La capacità non si può misurare.', 'There is a DC path between the leads: it is not a capacitor, or it leaks, or it is shorted. Capacitance cannot be measured.'),
  reverse: () => t('OL: in questo verso non conduce, oppure la sua caduta supera i 2,5 V che la prova diodi sa mostrare (LED blu e bianchi).', 'OL: it does not conduct this way, or its drop is above the 2.5 V the diode test can show (blue and white LEDs).'),
  short: () => t('Zero volt e cicalino: fra i puntali c\'è un cortocircuito.', 'Zero volts and beep: there is a short between the leads.'),
};

function vai(view: View): void { S.view = view; beep(false); mostra(); window.scrollTo(0, 0); }

// ---------------------------------------------------------------- menu

function mostraMenu(): void {
  const conto = starCount(S.save), prossimo = EXERCISES.find(e => !(S.save.stars[e.id] ?? 0));
  app.replaceChildren(h('main', { class: 'menu' },
    h('header', { class: 'testata' }, h('img', { src: `${import.meta.env.BASE_URL}assets/ui/logo.svg`, alt: '', class: 'logo' }),
      h('div', {}, h('h1', {}, t('Banco di prova', 'Test Bench')), h('p', { class: 'sotto' }, t('Componenti veri, multimetro vero, errori veri: ma qui il fusibile lo cambi con un clic.', 'Real parts, a real meter, real mistakes: but here you replace the fuse with a click.')))),
    h('p', { class: 'conto' }, t(`${conto.got} stelle su ${conto.of}`, `${conto.got} stars out of ${conto.of}`)),
    ...CHAPTERS.map(c => h('section', { class: 'capitolo' }, h('h2', {}, c),
      h('div', { class: 'esercizi' }, ...EXERCISES.filter(e => e.chapter === c).map(e => { const n = S.save.stars[e.id] ?? 0, fatti = S.save.done[e.id] ?? 0;
        return h('button', { class: `esercizio${n ? ' fatto' : ''}${e === prossimo ? ' prossimo' : ''}`, 'data-id': e.id, onclick: () => comincia(e.id) },
          h('b', {}, e.title), h('span', { class: 'stelle' }, e === prossimo && !n ? t('comincia da qui', 'start here') : stelle(n)), fatti > 1 ? h('small', {}, t(`${fatti} varianti risolte`, `${fatti} variants solved`)) : null); })))),
    h('section', { class: 'capitolo' }, h('h2', {}, t('Senza domande', 'No questions')),
      h('div', { class: 'esercizi' }, h('button', { class: 'esercizio libero', 'data-id': 'libero', onclick: () => comincia(null) }, h('b', {}, t('Banco libero', 'Free bench')), h('span', { class: 'stelle' }, ''), h('small', {}, t('Scegli un componente dal cassetto e misuralo come vuoi.', 'Pick a part from the drawer and measure it any way you like.'))))),
    h('footer', { class: 'piede' },
      h('button', { class: 'testo', id: 'vai-come', onclick: () => vai('come') }, t('Come funziona', 'How it works')),
      h('button', { class: 'testo', id: 'lingua', onclick: () => switchLang(lang === 'en' ? 'it' : 'en') }, lang === 'en' ? '🇮🇹 Italiano' : '🇬🇧 English'),
      h('button', { class: 'testo', id: 'suono', onclick: () => { S.save = { ...S.save, sound: !S.save.sound }; setSound(S.save.sound); scrivi(); click(); mostra(); } }, S.save.sound ? t('🔊 Suono acceso', '🔊 Sound on') : t('🔇 Suono spento', '🔇 Sound off')),
      h('span', { class: 'versione' }, S.version ? `v${S.version}` : ''))));
}

function comincia(id: string | null, variante?: number): void {
  const v = variante ?? (id ? (S.save.done[id] ?? 0) : 0);
  S.bench = newBench(id, v, S.drawer); S.reading = null; S.esito = null; S.probe = 'red'; S.scopeLead = null;
  click(); vai('banco');
}

// ---------------------------------------------------------------- banco

interface Vista { ridisegna(): void; lettura(): void }
let vista: Vista | null = null;

function fai(a: Action): void {
  if (!S.bench) return;
  S.bench = apply(S.bench, a);
  passo(); vista?.ridisegna();
}

/** Un passo di tempo del banco: chiede la lettura al modello e reagisce a quello che è successo. */
function passo(): void {
  if (!S.bench) return;
  const t = tick(S.bench, 0.05);
  if (t.reading.blew) { pop(); S.bench = t.bench; S.reading = t.reading; vista?.ridisegna(); return; }
  S.bench = t.bench; S.reading = t.reading; beep(t.reading.beep);
  vista?.lettura();
}

function mostraBanco(): void {
  const b0 = S.bench!, ex = b0.exercise;
  const scena = h('div', { class: 'scena-box', id: 'scena' });
  scena.addEventListener('click', e => {
    const el = e.target as Element, sw = el.closest('[data-switch]'), pad = el.closest('[data-node]');
    if (sw) { click(); fai({ type: 'switch', partId: sw.getAttribute('data-switch')! }); return; }
    if (!pad) return;
    const node = pad.getAttribute('data-node')!, b = S.bench!;
    click();
    if (S.scopeLead) {
      const { channel, lead } = S.scopeLead;
      fai({ type: 'scopeProbe', channel, lead, node: b.scope.channels[channel][lead] === node ? null : node }); return;
    }
    if (b.probes[S.probe] === node) { fai({ type: 'probe', color: S.probe, node: null }); return; }      // ritoccare lo stesso piedino toglie il puntale
    const posato = S.probe; S.probe = posato === 'red' ? 'black' : 'red';
    fai({ type: 'probe', color: posato, node });
  });
  const display = h('output', { class: 'lcd-numero', id: 'lcd' }), unita = h('span', { class: 'lcd-unita', id: 'lcd-unita' }), spia = h('span', { class: 'lcd-spia', id: 'lcd-spia' });
  const nota = h('p', { class: 'nota-strumento', id: 'nota', role: 'status' });
  const selettore = h('div', { class: 'selettore' }, ...DIALS.map(([d, simbolo, nome]) => h('button', { class: 'pos', 'data-dial': d, title: nome, onclick: () => { click(); fai({ type: 'dial', dial: d }); } }, h('b', {}, simbolo), h('small', {}, nome))));
  const boccole = h('div', { class: 'boccole' }, h('span', { class: 'et' }, t('Puntale rosso nella boccola', 'Red lead in jack')), ...JACKS.map(([j, nome]) => h('button', { class: 'boccola', 'data-jack': j, onclick: () => { click(); fai({ type: 'jack', jack: j }); } }, nome)),
    h('span', { class: 'et com' }, t('il nero sta sempre in COM', 'the black one always stays in COM')));
  const puntali = h('div', { class: 'puntali' }, h('span', { class: 'et' }, t('Puntale da posare', 'Lead to place')),
    h('button', { class: 'scegli rosso', id: 'scegli-rosso', onclick: () => { S.scopeLead = null; S.probe = 'red'; click(); vista?.ridisegna(); } }, t('rosso', 'red')),
    h('button', { class: 'scegli nero', id: 'scegli-nero', onclick: () => { S.scopeLead = null; S.probe = 'black'; click(); vista?.ridisegna(); } }, t('nero', 'black')),
    h('button', { class: 'piccolo', id: 'togli-puntali', onclick: () => { click(); S.scopeLead = null; S.probe = 'red'; S.bench = apply(apply(S.bench!, { type: 'probe', color: 'red', node: null }), { type: 'probe', color: 'black', node: null }); passo(); vista?.ridisegna(); } }, t('togli i puntali', 'remove leads')));
  const fusibili = h('div', { class: 'fusibili', id: 'fusibili' });
  const cassetto = ex ? null : h('div', { class: 'cassetto', id: 'cassetto' }, h('span', { class: 'et' }, t('Dal cassetto', 'From the drawer')), ...DRAWER.map(d => h('button', { class: 'pezzo', 'data-pezzo': d.id, onclick: () => { S.drawer = d.id; comincia(null); } }, d.name)));

  const scope = scopePanel(() => S.bench!, fai, lead => { S.scopeLead = lead; vista?.ridisegna(); });

  // --- pannello della domanda
  const domanda = h('section', { class: 'pannello domanda', id: 'domanda' });
  const riempiDomanda = (): void => {
    const b = S.bench!, e = b.exercise;
    if (!e) { domanda.replaceChildren(h('h3', {}, t('Banco libero', 'Free bench')), h('p', {}, t('Scegli un componente dal cassetto. Prova tutte le posizioni del selettore, anche quelle sbagliate: qui non si rompe niente.', 'Pick a part from the drawer. Try every dial position, even the wrong ones: nothing breaks here.'))); return; }
    const q = e.question, kids: (Node | null)[] = [h('h3', {}, e.title), h('p', { class: 'consegna' }, e.text)];
    if (b.usedHint) kids.push(h('p', { class: 'aiuto', id: 'aiuto' }, e.hint));
    else if (!b.solved) kids.push(h('button', { class: 'piccolo', id: 'chiedi-aiuto', onclick: () => { click(); fai({ type: 'hint' }); riempiDomanda(); } }, t('Come si fa? (costa una stella)', 'How is it done? (costs one star)')));
    if (!b.solved) {
      if (q.kind === 'choice') kids.push(h('div', { class: 'scelte', id: 'scelte' }, ...q.options.map((o, i) => h('button', { class: 'scelta', 'data-scelta': i, onclick: () => rispondi(i) }, o))));
      else {
        const campo = h('input', { type: 'text', id: 'risposta', inputmode: 'decimal', autocomplete: 'off', placeholder: t('valore', 'value') });
        const invia = (): void => rispondi(Number(campo.value.replace(',', '.').trim() || 'NaN'));
        campo.addEventListener('keydown', ev => { if ((ev as KeyboardEvent).key === 'Enter') invia(); });
        kids.push(h('div', { class: 'numero' }, campo, h('span', { class: 'unita' }, q.unit), h('button', { class: 'conferma', id: 'conferma', onclick: invia }, t('Rispondi', 'Answer'))));
      }
    }
    if (S.esito && !S.esito.correct) kids.push(h('p', { class: 'esito male', id: 'esito' }, S.esito.feedback ?? t('Non è questa. Rimisura con calma: l\'esercizio resta lì.', 'Not that one. Measure again calmly: the exercise stays put.')));
    if (S.esito?.correct) kids.push(h('div', { class: 'esito bene', id: 'esito' }, h('b', {}, `${t('Giusto', 'Correct')} ${stelle(S.esito.stars)}`), h('p', {}, e.explain),
      b.fusesBlown ? h('small', {}, t('Un fusibile bruciato è costato una stella.', 'A blown fuse cost one star.')) : null),
      h('div', { class: 'azioni' }, h('button', { class: 'conferma', id: 'altra', onclick: () => comincia(e.id) }, t('Un\'altra variante', 'Another variant')),
        (() => { const dopo = EXERCISES[EXERCISES.findIndex(x => x.id === e.id) + 1]; return dopo ? h('button', { class: 'piccolo', id: 'successivo', onclick: () => comincia(dopo.id) }, `${t('Prossimo', 'Next')}: ${dopo.title} →`) : null; })()));
    domanda.replaceChildren(...kids.filter((k): k is Node => k !== null));
  };
  const rispondi = (valore: number): void => {
    const v = answer(S.bench!, valore); S.bench = v.bench; S.esito = { correct: v.correct, stars: v.stars, feedback: v.feedback };
    if (v.correct) { S.save = recordSolved(S.save, v.bench.exercise!.id, v.stars); scrivi(); chime(v.stars); } else buzz();
    riempiDomanda();
  };

  app.replaceChildren(h('main', { class: 'banco' },
    h('header', { class: 'barra' }, h('button', { class: 'testo', id: 'al-menu', onclick: () => { click(); vai('menu'); } }, '← Menu'),
      h('div', { class: 'titolo' }, h('b', {}, ex ? ex.title : t('Banco libero', 'Free bench')), h('span', {}, ex ? ex.chapter : t('nessuna domanda', 'no question')))),
    h('div', { class: 'griglia' },
      h('section', { class: 'pannello piano' }, scena, cassetto, h('p', { class: 'guida' }, t('Tocca un piedino (i cerchietti) per posarci il puntale scelto; ritoccalo per toglierlo. I ponticelli si aprono e si chiudono con un clic.', 'Tap a pin (the small circles) to place the selected lead; tap it again to remove it. Jumpers open and close with a click.'))),
      h('section', { class: 'pannello multimetro', id: 'multimetro' },
        h('div', { class: 'lcd' }, spia, display, unita), nota, selettore, boccole, puntali, fusibili),
      scope.panel, domanda)));

  vista = {
    ridisegna(): void {
      const b = S.bench!;
      scena.innerHTML = sceneSvg(b.scene, b.probes, b.exercise === null, b.scope);
      for (const el of selettore.querySelectorAll<HTMLElement>('.pos')) el.classList.toggle('scelto', el.dataset.dial === b.meter.dial);
      for (const el of boccole.querySelectorAll<HTMLElement>('.boccola')) el.classList.toggle('scelto', el.dataset.jack === b.meter.jack);
      puntali.querySelector('#scegli-rosso')!.classList.toggle('scelto', !S.scopeLead && S.probe === 'red'); puntali.querySelector('#scegli-nero')!.classList.toggle('scelto', !S.scopeLead && S.probe === 'black');
      const guasti: Node[] = [];
      if (b.meter.fuseMaBlown) guasti.push(h('button', { class: 'cambia', id: 'cambia-ma', onclick: () => { click(); fai({ type: 'replaceFuse', jack: 'ma' }); } }, t('Fusibile mA saltato: cambialo', 'mA fuse blown: replace it')));
      if (b.meter.fuseABlown) guasti.push(h('button', { class: 'cambia', id: 'cambia-a', onclick: () => { click(); fai({ type: 'replaceFuse', jack: 'a' }); } }, t('Fusibile 10 A saltato: cambialo', '10 A fuse blown: replace it')));
      fusibili.replaceChildren(...guasti);
      if (cassetto) for (const el of cassetto.querySelectorAll<HTMLElement>('.pezzo')) el.classList.toggle('scelto', el.dataset.pezzo === S.drawer);
      this.lettura();
    },
    lettura(): void {
      const b = S.bench!, r = S.reading; if (!r) return;
      scope.update(S.scopeLead);
      display.textContent = b.meter.dial === 'off' ? '' : num(r.display); unita.textContent = b.meter.dial === 'off' ? '' : r.unit;
      display.dataset.spento = String(b.meter.dial === 'off'); spia.textContent = r.beep ? '·)))' : '';
      const testo = b.meter.dial === 'off' ? t('Multimetro spento: gira il selettore.', 'Meter off: turn the dial.') : NOTE[r.note](b);
      if (nota.textContent !== testo) { nota.textContent = testo; nota.dataset.tono = r.note === 'ok' || r.note === 'open' || r.note === 'reverse' ? 'calmo' : 'allarme'; }
      for (const el of scena.querySelectorAll<SVGElement>('[data-led]')) el.setAttribute('opacity', String(Math.min(0.85, partCurrent(r, el.getAttribute('data-led')!) / 0.012)));
    },
  };
  riempiDomanda(); passo(); vista.ridisegna();
}

function mostraCome(): void {
  const corpo = h('article', { class: 'come' }); corpo.innerHTML = lang === 'en' ? COME_HTML_EN : COME_HTML;
  app.replaceChildren(h('main', { class: 'pagina' }, h('header', { class: 'barra' }, h('button', { class: 'testo', id: 'al-menu', onclick: () => { click(); vai('menu'); } }, '← Menu')), corpo));
}

function mostra(): void {
  vista = null;
  if (S.view === 'banco' && !S.bench) S.view = 'menu';
  document.body.dataset.vista = S.view;
  if (S.view === 'menu') mostraMenu(); else if (S.view === 'banco') mostraBanco(); else mostraCome();
}
mostra();

// Passo fisso a 60 al secondo con accumulatore; il banco avanza ogni tre passi (venti letture al secondo, 50 ms l'una).
let prima = performance.now(), resto = 0;
function ciclo(adesso: number): void {
  resto += Math.min(0.25, (adesso - prima) / 1000); prima = adesso;
  while (resto >= 1 / 60) { S.tick++; resto -= 1 / 60; if (S.tick % 3 === 0 && S.view === 'banco') passo(); }
  requestAnimationFrame(ciclo);
}
requestAnimationFrame(ciclo);

// Per le prove nel browser: lo stato in sola lettura.
(window as unknown as { __banco: unknown }).__banco = { stato: S };
