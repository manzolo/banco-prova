// Comandi e reticolo: i campioni e tutte le misure arrivano da shared/.
import { SCOPE } from '../shared/config.ts';
import { cursorReading, scopeFrame, type ScopeState, type ScreenPoint } from '../shared/scope.ts';
import { si } from '../shared/parts.ts';
import type { Action, Bench } from '../shared/game.ts';
import { scenePads } from '../shared/scene.ts';
import { h } from './ui.ts';
import { num, t } from './i18n.ts';

export type ScopeLead = { channel: 0 | 1; lead: 'probe' | 'ground' };
export function scopePanel(get: () => Bench, act: (a: Action) => void, choose: (lead: ScopeLead) => void) {
  // i cursori: due punti posati con un clic sullo schermo; il terzo clic sposta di nuovo il primo
  const cursori: ScreenPoint[] = []; let prossimo = 0;
  const lettureCursori = h('p', { class: 'scope-cursori', id: 'scope-cursori' });
  const screen = h('div', { id: 'scope-screen' });
  const status = h('p', { id: 'scope-status', role: 'status' });
  const measures = h('div', { class: 'scope-measures', id: 'scope-measures' });
  const set = (change: (s: ScopeState) => ScopeState): void => act({ type: 'scope', scope: change(get().scope) });
  const select = (id: string, label: string, options: [string, string][], value: string, change: (v: string) => void) => {
    const input = h('select', { id, onchange: e => change((e.target as HTMLSelectElement).value) }, ...options.map(([v, text]) => h('option', { value: v }, text)));
    input.value = value;
    return h('label', {}, label, input);
  };
  const channels = ([0, 1] as const).map(i => {
    const patch = (p: Partial<ScopeState['channels'][0]>) => set(s => ({ ...s, channels: s.channels.map((c, j) => i === j ? { ...c, ...p } : c) as ScopeState['channels'] }));
    return h('fieldset', { class: `scope-channel channel-${i}` }, h('legend', {}, `${t('Canale', 'Channel')} ${i + 1}`),
      ...(['probe', 'ground'] as const).map(lead => h('div', { class: 'scope-lead' },
        h('button', { id: `scope-${i}-${lead}`, onclick: () => choose({ channel: i, lead }) }, lead === 'probe' ? t(`Posa sonda ${i + 1}`, `Place probe ${i + 1}`) : t(`Posa massa ${i + 1}`, `Place ground ${i + 1}`)),
        select(`scope-${i}-${lead}-node`, lead === 'probe' ? t('Sonda sul piedino', 'Probe on pin') : t('Massa sul piedino', 'Ground on pin'), [['', t('scollegata', 'disconnected')], ...scenePads(get().scene).map(p => [p.node, p.node] as [string, string])], '', node => act({ type: 'scopeProbe', channel: i, lead, node: node || null })))),
      select(`scope-${i}-volt`, 'V/div', SCOPE.volts.map(v => [String(v), num(String(v).replace('.', ','))]), String(get().scope.channels[i].voltDiv), v => patch({ voltDiv: Number(v) })),
      select(`scope-${i}-coupling`, t('Accoppiamento', 'Coupling'), [['dc', t('DC · tutto il segnale', 'DC · whole signal')], ['ac', t('AC · senza la media', 'AC · without the average')]], 'dc', v => patch({ coupling: v as 'dc' | 'ac' })));
  });
  screen.addEventListener('click', ev => {
    const svg = screen.querySelector('svg'); if (!svg) return;
    // dalle coordinate dello schermo a quelle del disegno (500 × 400, 50 per divisione), qualunque sia la misura della pagina
    const pt = svg.createSVGPoint(); pt.x = (ev as MouseEvent).clientX; pt.y = (ev as MouseEvent).clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse()), x = q.x / 50, y = q.y / 50;
    cursori[prossimo] = { x: Math.min(10, Math.max(0, x)), y: Math.min(8, Math.max(0, y)) }; prossimo = 1 - prossimo;
    disegna();
  });
  const togliCursori = h('button', { class: 'piccolo', id: 'scope-togli-cursori', onclick: () => { cursori.length = 0; prossimo = 0; disegna(); } }, t('togli i cursori', 'clear cursors'));
  const panel = h('section', { class: 'pannello oscilloscopio', id: 'oscilloscopio' }, h('h3', {}, t('Oscilloscopio', 'Oscilloscope')),
    h('p', { class: 'guida' }, t('Due ingressi isolati da 1 MΩ. Scegli sonda o massa, poi tocca un piedino; oppure usa gli elenchi. Reticolo: 10 × 8 divisioni.', 'Two isolated 1 MΩ inputs. Choose probe or ground, then tap a pin; or use the lists. Graticule: 10 × 8 divisions.')), screen, status, h('div', { class: 'scope-riga-cursori' }, lettureCursori, togliCursori), h('p', { class: 'guida', id: 'scope-guida-misure' }, t('Banco libero: qui sotto anche le misure automatiche, sul segnale completo.', 'Free bench: automatic measurements below too, on the whole signal.')), measures,
    h('div', { class: 'scope-controls' },
      select('scope-time', 'ms/div', SCOPE.milliseconds.map(v => [String(v), num(String(v).replace('.', ','))]), String(get().scope.timeDiv * 1000), v => set(s => ({ ...s, timeDiv: Number(v) / 1000 }))),
      select('scope-trigger-channel', t('Trigger in salita', 'Rising trigger'), [['0', t('Canale 1', 'Channel 1')], ['1', t('Canale 2', 'Channel 2')]], '0', v => set(s => ({ ...s, triggerChannel: Number(v) as 0 | 1 }))),
      h('label', {}, t('Livello trigger (V)', 'Trigger level (V)'), h('input', { id: 'scope-trigger', type: 'number', step: '0.1', value: '0', onchange: e => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v)) set(s => ({ ...s, triggerLevel: v })); } }))),
    h('div', { class: 'scope-channels' }, ...channels));
  if (get().scene.parts.some(p => p.type === 'bridge')) panel.append(h('div', { class: 'scope-filter' }, h('p', {}, t('Confronta con il filtro iniziale (attendi la nuova stabilizzazione):', 'Compare with the initial filter (wait for it to settle again):')),
    h('button', { id: 'filter-capacity', onclick: () => act({ type: 'filter', setting: 'capacity' }) }, t('Capacità doppia', 'Double capacitance')),
    h('button', { id: 'filter-load', onclick: () => act({ type: 'filter', setting: 'load' }) }, t('Resistenza dimezzata', 'Half resistance')),
    h('button', { id: 'filter-reset', onclick: () => act({ type: 'filter', setting: 'reset' }) }, t('Valori iniziali', 'Initial values')), h('p', { id: 'filter-values' })));
  let scelto: ScopeLead | null = null;
  function disegna(): void {
    const b = get(), frame = scopeFrame(b.samples, b.scope);
    const grid = Array.from({ length: 11 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="400"/>`).join('') + Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="500" y2="${i * 50}"/>`).join('')
      // cinque suddivisioni sugli assi centrali, come su uno strumento vero
      + Array.from({ length: 51 }, (_, i) => `<line class="tacca" x1="${i * 10}" y1="196" x2="${i * 10}" y2="204"/>`).join('') + Array.from({ length: 41 }, (_, i) => `<line class="tacca" x1="246" y1="${i * 10}" x2="254" y2="${i * 10}"/>`).join('');
    const croci = cursori.map((c, k) => c ? `<g class="cursore c${k}"><line x1="${c.x * 50}" y1="0" x2="${c.x * 50}" y2="400"/><line x1="0" y1="${c.y * 50}" x2="500" y2="${c.y * 50}"/><text x="${Math.min(c.x * 50 + 5, 485)}" y="${Math.max(c.y * 50 - 5, 12)}">${k ? 'B' : 'A'}</text></g>` : '').join('');
    screen.innerHTML = `<svg viewBox="0 0 500 400" role="img" aria-label="${t('Tracce dell’oscilloscopio, dieci divisioni per otto', 'Oscilloscope traces, ten by eight divisions')}"><defs><clipPath id="scope-clip"><rect width="500" height="400"/></clipPath></defs><g class="scope-grid">${grid}</g><g clip-path="url(#scope-clip)">${frame.traces.map((points, i) => b.scope.channels[i].probe && b.scope.channels[i].ground ? `<polyline data-trace="${i}" class="trace-${i}" points="${points.map(p => `${(p.x * 50).toFixed(2)},${(p.y * 50).toFixed(2)}`).join(' ')}"/>` : '').join('')}</g>${croci}</svg>`;
    status.textContent = !b.scope.channels.some(c => c.probe && c.ground) ? t('Collega una sonda e la sua massa.', 'Connect a probe and its ground.') : frame.triggered ? t('Trigger agganciato · fronte di salita', 'Triggered · rising edge') : t('Corsa libera · nessun fronte completo al livello scelto', 'Free running · no complete edge at the chosen level');
    const fmt = (v: number) => num(v.toFixed(3).replace('.', ','));
    const libero = b.exercise === null;
    (panel.querySelector('#scope-guida-misure') as HTMLElement).hidden = !libero; measures.hidden = !libero;
    if (cursori[0] && cursori[1]) { const c = cursorReading(b.scope, 0, cursori[0], cursori[1]);
      lettureCursori.textContent = `A ${fmt(c.va)} V · B ${fmt(c.vb)} V · ΔV ${fmt(c.dv)} V · Δt ${fmt(c.dt * 1000)} ms${c.hz ? ` · 1/Δt ${num(c.hz.toFixed(1).replace('.', ','))} Hz` : ''} ${t('(scala del canale 1)', '(channel 1 scale)')}`; }
    else lettureCursori.textContent = cursori[0] ? t('Cursore A posato: tocca lo schermo per posare B.', 'Cursor A placed: tap the screen to place B.') : t('Cursori: tocca lo schermo per posare A, poi B. Danno ΔV e Δt.', 'Cursors: tap the screen to place A, then B. They give ΔV and Δt.');
    measures.replaceChildren(...frame.stats.map((s, i) => h('p', { id: `scope-stats-${i}` }, b.scope.channels[i].probe && b.scope.channels[i].ground ? `C${i + 1}: min ${fmt(s.min)} V · max ${fmt(s.max)} V · ${t('picco-picco', 'peak-to-peak')} ${fmt(s.ripple)} V · ${t('efficace AC', 'AC RMS')} ${fmt(s.acRms)} V · ${t('periodo', 'period')} ${frame.periods[i] ? fmt(frame.periods[i]! * 1000) + ' ms' : '—'}` : `C${i + 1}: ${t('scollegato', 'disconnected')}`)));
    b.scope.channels.forEach((c, i) => { for (const lead of ['probe', 'ground'] as const) {
      (panel.querySelector(`#scope-${i}-${lead}-node`) as HTMLSelectElement).value = c[lead] ?? '';
      panel.querySelector(`#scope-${i}-${lead}`)!.classList.toggle('scelto', scelto?.channel === i && scelto.lead === lead);
    } });
    const info = panel.querySelector('#filter-values');
    if (info) {
      const c = b.scene.parts.find(p => p.id === 'C1'), r = b.scene.parts.find(p => p.id === 'R1');
      info.textContent = `${t('Ora', 'Now')}: C1 ${num(si(Number(c?.truth.farad), 'F'))} · R1 ${num(si(Number(r?.truth.ohm), 'Ω'))}. ${t('I due cambi non si sommano: ognuno parte dai valori iniziali.', 'The two changes do not add up: each starts from the initial values.')}`;
    }
  }
  return { panel, update(selected: ScopeLead | null): void { scelto = selected; disegna(); } };
}
