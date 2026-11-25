// Il disegno del banco in SVG: i componenti come si vedono davvero (bande, sigle, fascia del catodo), i fili, i
// piedini da toccare e i puntali. Tutto parte dalla scena del modello: qui non si decide niente di elettrico.
import { padPositions, scenePads, type Scene } from '../shared/scene.ts';
import type { Part } from '../shared/parts.ts';
import type { Probes } from '../shared/meter.ts';
import type { ScopeState } from '../shared/scope.ts';
import { esc } from './ui.ts';

const BAND: Record<string, string> = { nero: '#141414', marrone: '#7a4a21', rosso: '#d42a2a', arancio: '#f08a1c', giallo: '#f2d21a', verde: '#2e9e4a', blu: '#2b56c8', viola: '#8a3fc4', grigio: '#8a8a8a', bianco: '#f2f2f2', oro: '#c9a23a', argento: '#c4c8cc' };
const LED: Record<string, string> = { red: '#ff3b30', green: '#34d058', blue: '#3b82ff' };

/** Il corpo di un componente, disegnato in orizzontale attorno all'origine: i piedini stanno a −50 e +50. */
function body(p: Part, showMarks: boolean, scope?: ScopeState): string {
  const fili = (n = 2): string => n === 3 ? '' : '<line x1="-50" y1="0" x2="50" y2="0" class="reoforo"/>';
  switch (p.type) {
    case 'resistor': {
      const b = p.view.bands as string[], xs = [-20, -10, 0, 18];
      return `${fili()}<rect x="-30" y="-11" width="60" height="22" rx="9" fill="#d9c49a" stroke="#a08a5c"/>` + b.map((c, i) => `<rect x="${xs[i] - 3}" y="-11" width="6" height="22" fill="${BAND[c]}"/>`).join('');
    }
    case 'capacitor':
      return p.view.kind === 'ceramic'
        ? `${fili()}<ellipse cx="0" cy="0" rx="19" ry="17" fill="#d98c2b" stroke="#9a5f17"/><text y="5" class="sigla scura">${esc(p.mark)}</text>`
        : `${fili()}<rect x="-28" y="-17" width="56" height="34" rx="5" fill="#1d2b4f" stroke="#0e1730"/><rect x="14" y="-17" width="10" height="34" fill="#c9d2e6"/><text x="19" y="5" class="sigla scura">−</text><text x="-8" y="4" class="sigla piccola">${esc(p.mark.replace(' 25 V', ''))}</text>`;
    case 'inductor':
      return `${fili()}<rect x="-26" y="-10" width="52" height="20" rx="4" fill="#3a3f4a"/>` + [-20, -12, -4, 4, 12, 20].map(x => `<path d="M${x - 4},10 A4,12 0 0 1 ${x + 4},10" fill="none" stroke="#c9792e" stroke-width="3"/><path d="M${x - 4},-10 A4,12 0 0 0 ${x + 4},-10" fill="none" stroke="#c9792e" stroke-width="3"/>`).join('');
    case 'diode': case 'zener': {
      const destra = p.view.cathodeRight as boolean, x = destra ? 12 : -20, vetro = p.type === 'zener' || String(p.truth.model) === '1N4148';
      return `${fili()}<rect x="-22" y="-9" width="44" height="18" rx="${vetro ? 8 : 3}" fill="${vetro ? '#c9632b' : '#1b1b1f'}" stroke="#000"/>` + (p.view.unmarked ? '' : `<rect x="${x}" y="-9" width="8" height="18" fill="${vetro ? '#141414' : '#d7d7d7'}"/>`);
    }
    case 'led': {
      const col = LED[String(p.view.color)] ?? '#ddd', destra = p.view.cathodeRight as boolean;
      return `${fili()}<circle class="alone" data-led="${p.id}" cx="0" cy="-2" r="34" fill="${col}" opacity="0"/><path d="M-16,12 L-16,-6 A16,16 0 0 1 16,-6 L16,12 Z" fill="${col}" fill-opacity="0.45" stroke="${col}" stroke-width="2"/>` +
        (p.view.unmarked ? '' : `<line x1="${destra ? 17 : -17}" y1="-8" x2="${destra ? 17 : -17}" y2="13" stroke="#fff" stroke-width="3"/>`) + `<rect x="-19" y="11" width="38" height="5" fill="${col}" fill-opacity="0.7"/>`;
    }
    case 'bjt':
      return '<line x1="-50" y1="0" x2="-14" y2="0" class="reoforo"/><line x1="0" y1="0" x2="0" y2="22" class="reoforo"/><line x1="14" y1="0" x2="50" y2="0" class="reoforo"/>' +
        `<path d="M-24,8 L-24,-10 A24,22 0 0 1 24,-10 L24,8 Z" fill="#1b1b1f" stroke="#000"/><text y="0" class="sigla piccola">${showMarks ? esc(p.mark) : '· · ·'}</text>`;
    case 'fuse':
      return `${fili()}<rect x="-24" y="-8" width="48" height="16" rx="3" fill="#efe9dc" stroke="#b7ad96"/><rect x="-28" y="-9" width="10" height="18" rx="2" fill="#b9bec6"/><rect x="18" y="-9" width="10" height="18" rx="2" fill="#b9bec6"/>`;
    case 'battery': {
      const nove = p.view.kind === '9v';
      return `${fili()}<rect x="-32" y="${nove ? -20 : -12}" width="64" height="${nove ? 40 : 24}" rx="4" fill="${nove ? '#2a2a30' : '#b3202a'}" stroke="#000"/><rect x="-32" y="${nove ? -20 : -12}" width="16" height="${nove ? 40 : 24}" rx="4" fill="#c9a23a"/><text x="-24" y="5" class="sigla scura">+</text><text x="22" y="5" class="sigla">−</text><text x="2" y="4" class="sigla piccola">${nove ? '9 V' : '1,5 V'}</text>`;
    }
    case 'switch': {
      const chiuso = p.view.closed as boolean;
      return `<line x1="-50" y1="0" x2="-22" y2="0" class="reoforo"/><line x1="22" y1="0" x2="50" y2="0" class="reoforo"/><circle cx="-22" cy="0" r="5" fill="#c9a23a"/><circle cx="22" cy="0" r="5" fill="#c9a23a"/>` +
        `<line x1="-22" y1="0" x2="${chiuso ? 22 : 16}" y2="${chiuso ? 0 : -24}" stroke="#e8e2f2" stroke-width="5" stroke-linecap="round"/><rect class="tocca" data-switch="${p.id}" x="-34" y="-34" width="68" height="50" fill="transparent"><title>ponticello: clic per aprire o chiudere</title></rect>`;
    }
    case 'bridge':
      return '<rect x="-40" y="-50" width="80" height="100" rx="8" fill="#252833" stroke="#bbc3cf"/>' +
        '<text x="-26" y="-34" class="sigla">~</text><text x="26" y="-34" class="sigla">+</text><text x="-26" y="44" class="sigla">~</text><text x="26" y="44" class="sigla">−</text>' +
        '<path d="M-24,0 L0,-24 L24,0 L0,24 Z" fill="none" stroke="#cfd3da"/><text y="4" class="sigla piccola">4 diodi</text>';
    case 'transformer':
      return `${fili()}<rect x="-30" y="-22" width="60" height="44" rx="4" fill="#4a3b2a" stroke="#221a10"/><rect x="-22" y="-14" width="44" height="28" fill="#b9793a"/><text y="6" class="sigla scura">${esc(String(p.truth.voltRms))} V~</text>`;
    default:
      return `${fili(p.pads.length)}<rect x="-30" y="-12" width="60" height="24" rx="4" fill="#555"/>`;
  }
}

/** Tutta la scena. `showMarks`: sul banco libero si vedono le sigle dei transistor; negli esercizi no. */
export function sceneSvg(s: Scene, probes: Probes, showMarks: boolean, scope?: ScopeState): string {
  const fili = s.lines.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="filo"/>`).join('');
  const pezzi = s.parts.map(p => {
    const pl = s.place[p.id];
    // il transistor ha il piedino centrale più in basso: lo si disegna a parte, sotto il corpo
    const corpo = `<g transform="translate(${pl.x},${pl.y - (p.type === 'bjt' ? 22 : 0)})${pl.vertical ? ' rotate(90)' : ''}">${body(p, showMarks)}</g>`;
    const etichetta = `<text x="${pl.x + (pl.vertical ? 30 : 0)}" y="${pl.y + (pl.vertical ? 4 : p.type === 'battery' || p.type === 'capacitor' ? -30 : -24) - (p.type === 'bjt' ? 44 : 0)}" class="nome${pl.vertical ? ' sx' : ''}">${esc(p.id)}</text>`;
    return corpo + etichetta;
  }).join('');
  const piedini = scenePads(s).map(p => {
    const part = s.parts.find(x => x.id === p.partId)!, y = part.type === 'bjt' ? p.y - 22 + (p.index === 1 ? 22 : 0) : p.y;
    return `<g class="piedino" data-node="${esc(p.node)}" transform="translate(${p.x},${y})"><circle r="16" fill="transparent"/><circle r="6.5" class="punto"/><title>${esc(part.id)}, piedino ${p.index + 1}</title></g>`;
  }).join('');
  const dove = (node: string | null): { x: number; y: number } | null => {
    if (!node) return null;
    const p = scenePads(s).find(x => x.node === node); if (!p) return null;
    const part = s.parts.find(x => x.id === p.partId)!;
    return { x: p.x, y: part.type === 'bjt' ? p.y - 22 + (p.index === 1 ? 22 : 0) : p.y };
  };
  const puntale = (node: string | null, colore: string, classe: string, dx: number): string => {
    const d = dove(node); if (!d) return '';
    return `<g class="puntale ${classe}" transform="translate(${d.x},${d.y})"><line x1="0" y1="0" x2="${dx}" y2="46" stroke="#cfd3da" stroke-width="3"/><line x1="${dx}" y1="46" x2="${dx * 2.1}" y2="96" stroke="${colore}" stroke-width="11" stroke-linecap="round"/><circle r="9" fill="none" stroke="${colore}" stroke-width="3.5"/></g>`;
  };
  return `<svg viewBox="0 0 ${s.width} ${s.height}" class="scena" role="img" aria-label="il banco">${fili}${pezzi}${piedini}${puntale(probes.black, '#22242b', 'nero', -14)}${puntale(probes.red, '#e0353b', 'rosso', 14)}${scope?.channels.map((c, i) => puntale(c.probe, i ? '#69cfff' : '#ffd95a', `scope-${i}-probe`, 24 + i * 8) + puntale(c.ground, i ? '#338bb4' : '#a79342', `scope-${i}-ground`, -24 - i * 8)).join('') ?? ''}</svg>`;
}
