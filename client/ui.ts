// Piccoli aiuti per costruire l'interfaccia in DOM.
type Kid = Node | string | null | false | undefined;
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | null | undefined>;

/** Crea un elemento: h('button', { class: 'x', onclick: f }, 'testo'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const k of kids) if (k !== null && k !== false && k !== undefined) el.append(k);
  return el;
}
export const stelle = (n: number): string => '★'.repeat(n) + '☆'.repeat(3 - n);
export const esc = (t: string): string => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
