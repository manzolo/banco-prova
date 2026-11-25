// I suoni, sintetizzati: il cicalino della continuità (resta acceso finché c'è contatto), lo scatto del selettore, il
// colpo del fusibile che salta, due note per la risposta giusta.
let ctx: AudioContext | null = null, acceso = true, cicalino: { o: OscillatorNode; g: GainNode } | null = null;

export function setSound(on: boolean): void { acceso = on; if (!on) beep(false); }
function audio(): AudioContext | null {
  if (!acceso) return null;
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; }
}
function nota(freq: number, da: number, durata: number, volume: number, tipo: OscillatorType = 'sine'): void {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + da;
  o.type = tipo; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + 0.005); g.gain.linearRampToValueAtTime(0, t + durata);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + durata + 0.02);
}
export function click(): void { nota(1500, 0, 0.025, 0.04, 'square'); }
export function pop(): void { nota(90, 0, 0.25, 0.25, 'sawtooth'); nota(60, 0.02, 0.3, 0.2, 'square'); }
export function chime(n: number): void { for (let i = 0; i < n; i++) nota([660, 830, 990][i], i * 0.15, 0.14, 0.06); }
export function buzz(): void { nota(160, 0, 0.2, 0.08, 'sawtooth'); }

/** Il cicalino della continuità: acceso finché «on» resta vero. */
export function beep(on: boolean): void {
  if (on === Boolean(cicalino)) return;
  if (!on) { cicalino!.g.gain.value = 0; cicalino!.o.stop(); cicalino = null; return; }
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.value = 2400; g.gain.value = 0.035; o.connect(g).connect(a.destination); o.start(); cicalino = { o, g };
}
