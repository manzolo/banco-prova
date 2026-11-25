// Comandi e reticolo: i campioni e tutte le misure arrivano da shared/.
import { SCOPE } from '../shared/config.ts';
import { scopeFrame, type ScopeState } from '../shared/scope.ts';
import type { Action, Bench } from '../shared/game.ts';
import { scenePads } from '../shared/scene.ts';
import { h } from './ui.ts';
import { num, t } from './i18n.ts';

export type ScopeLead = { channel: 0 | 1; lead: 'probe' | 'ground' };
export function scopePanel(get: () => Bench, act: (a: Action) => void, choose: (lead: ScopeLead) => void) {
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
  const panel = h('section', { class: 'pannello oscilloscopio', id: 'oscilloscopio' }, h('h3', {}, t('Oscilloscopio', 'Oscilloscope')),
    h('p', { class: 'guida' }, t('Due ingressi isolati da 1 MΩ. Scegli sonda o massa, poi tocca un piedino; oppure usa gli elenchi. Reticolo: 10 × 8 divisioni.', 'Two isolated 1 MΩ inputs. Choose probe or ground, then tap a pin; or use the lists. Graticule: 10 × 8 divisions.')), screen, status, h('p', { class: 'guida' }, t('Misure sul segnale completo; AC centra soltanto la traccia.', 'Measurements on the whole signal; AC only centres the trace.')), measures,
    h('div', { class: 'scope-controls' },
      select('scope-time', 'ms/div', SCOPE.milliseconds.map(v => [String(v), num(String(v).replace('.', ','))]), String(get().scope.timeDiv * 1000), v => set(s => ({ ...s, timeDiv: Number(v) / 1000 }))),
      select('scope-trigger-channel', t('Trigger in salita', 'Rising trigger'), [['0', t('Canale 1', 'Channel 1')], ['1', t('Canale 2', 'Channel 2')]], '0', v => set(s => ({ ...s, triggerChannel: Number(v) as 0 | 1 }))),
      h('label', {}, t('Livello trigger (V)', 'Trigger level (V)'), h('input', { id: 'scope-trigger', type: 'number', step: '0.1', value: '0', onchange: e => { const v = Number((e.target as HTMLInputElement).value); if (Number.isFinite(v)) set(s => ({ ...s, triggerLevel: v })); } }))),
    h('div', { class: 'scope-channels' }, ...channels));
  if (get().scene.parts.some(p => p.type === 'bridge')) panel.append(h('div', { class: 'scope-filter' }, h('p', {}, t('Confronta con il filtro iniziale (attendi la nuova stabilizzazione):', 'Compare with the initial filter (wait for it to settle again):')),
    h('button', { id: 'filter-capacity', onclick: () => act({ type: 'filter', setting: 'capacity' }) }, t('Capacità doppia', 'Double capacitance')),
    h('button', { id: 'filter-load', onclick: () => act({ type: 'filter', setting: 'load' }) }, t('Resistenza dimezzata', 'Half resistance')),
    h('button', { id: 'filter-reset', onclick: () => act({ type: 'filter', setting: 'reset' }) }, t('Valori iniziali', 'Initial values')), h('p', { id: 'filter-values' })));
  return { panel, update(selected: ScopeLead | null): void {
    const b = get(), frame = scopeFrame(b.samples, b.scope);
    const grid = Array.from({ length: 11 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="400"/>`).join('') + Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="500" y2="${i * 50}"/>`).join('');
    screen.innerHTML = `<svg viewBox="0 0 500 400" role="img" aria-label="${t('Tracce dell’oscilloscopio, dieci divisioni per otto', 'Oscilloscope traces, ten by eight divisions')}"><defs><clipPath id="scope-clip"><rect width="500" height="400"/></clipPath></defs><g class="scope-grid">${grid}</g><g clip-path="url(#scope-clip)">${frame.traces.map((points, i) => b.scope.channels[i].probe && b.scope.channels[i].ground ? `<polyline data-trace="${i}" class="trace-${i}" points="${points.map(p => `${(p.x * 50).toFixed(2)},${(p.y * 50).toFixed(2)}`).join(' ')}"/>` : '').join('')}</g></svg>`;
    status.textContent = !b.scope.channels.some(c => c.probe && c.ground) ? t('Collega una sonda e la sua massa.', 'Connect a probe and its ground.') : frame.triggered ? t('Trigger agganciato · fronte di salita', 'Triggered · rising edge') : t('Corsa libera · nessun fronte completo al livello scelto', 'Free running · no complete edge at the chosen level');
    const fmt = (v: number) => num(v.toFixed(3).replace('.', ','));
    measures.replaceChildren(...frame.stats.map((s, i) => h('p', { id: `scope-stats-${i}` }, b.scope.channels[i].probe && b.scope.channels[i].ground ? `C${i + 1}: min ${fmt(s.min)} V · max ${fmt(s.max)} V · ${t('picco-picco', 'peak-to-peak')} ${fmt(s.ripple)} V · ${t('efficace AC', 'AC RMS')} ${fmt(s.acRms)} V · ${t('periodo', 'period')} ${frame.periods[i] ? fmt(frame.periods[i]! * 1000) + ' ms' : '—'}` : `C${i + 1}: ${t('scollegato', 'disconnected')}`)));
    b.scope.channels.forEach((c, i) => { for (const lead of ['probe', 'ground'] as const) {
      (panel.querySelector(`#scope-${i}-${lead}-node`) as HTMLSelectElement).value = c[lead] ?? '';
      panel.querySelector(`#scope-${i}-${lead}`)!.classList.toggle('scelto', selected?.channel === i && selected.lead === lead);
    } });
    const info = panel.querySelector('#filter-values');
    if (info) info.textContent = b.scene.parts.filter(p => p.id === 'C1' || p.id === 'R1').map(p => `${p.id}: ${p.mark}`).join(' · ');
  } };
}
