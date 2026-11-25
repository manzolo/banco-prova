// La lingua dell'interfaccia: italiano di default, inglese a scelta. Si sceglie con ?lang=en nell'indirizzo o col
// tasto nel menu, e resta ricordata nel browser. t(italiano, inglese) restituisce il testo nella lingua scelta.
export type Lang = 'it' | 'en';
const KEY = 'bancoprova-lingua';

function scegli(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'it' || q === 'en') { localStorage.setItem(KEY, q); return q; }
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'it';
  } catch { return 'it'; }
}
export const lang: Lang = scegli();
document.documentElement.lang = lang;

export const t = (it: string, en: string): string => lang === 'en' ? en : it;

/** Un numero come lo scrive la lingua scelta: virgola in italiano, punto in inglese. */
export const num = (s: string): string => lang === 'en' ? s.replace(/(\d),(\d)/g, '$1.$2') : s;

/** Cambia lingua e ricarica la pagina. */
export function switchLang(to: Lang): void {
  try { localStorage.setItem(KEY, to); } catch { /* senza memoria vale per questa pagina */ }
  const u = new URL(location.href); u.searchParams.set('lang', to); location.href = u.toString();
}
