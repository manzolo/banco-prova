// Prova nel browser (Playwright, Chromium senza interfaccia): la pagina si carica dal server vero, si gioca coi gesti veri
// (selettore, boccole, puntali sui piedini) e non ci sono errori né risorse mancanti. Le attese sono in passi di gioco.
// BANCO_SCATTI=<cartella> sceglie dove salvare le immagini.
import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createApplication } from '../server/index.ts';

const app = createApplication();
await new Promise<void>(resolve => app.http.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
const scatti = process.env.BANCO_SCATTI ?? 'test-results';
mkdirSync(scatti, { recursive: true });
const errori: string[] = [], mancanti: string[] = [];
let fatte = 0;
const prova = async (nome: string, fn: () => Promise<void>): Promise<void> => { await fn(); fatte++; console.log(`✓ ${nome}`); };
const ascolta = (page: Page): void => {
  page.on('pageerror', e => errori.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errori.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) mancanti.push(`${r.status()} ${new URL(r.url()).pathname}`); });
};
type Banco = { stato: { tick: number; view: string; bench: { meter: { dial: string; jack: string; fuseMaBlown: boolean }; probes: { red: string | null; black: string | null }; fusesBlown: number; solved: boolean; exercise: { question: any; scene: any } | null } | null; reading: { display: string; unit: string; value: number; beep: boolean; note: string } | null; save: { stars: Record<string, number> } } };
const banco = <T>(page: Page, f: (g: Banco) => T): Promise<T> => page.evaluate(`(${f})(window.__banco)`) as Promise<T>;
const passi = async (page: Page, n: number): Promise<void> => { const t0 = await banco(page, g => g.stato.tick); await page.waitForFunction(t => (window as any).__banco.stato.tick >= t, t0 + n, { timeout: 30000 }); };
const piedino = (page: Page, node: string) => page.locator(`.piedino[data-node="${node}"]`);
const posa = async (page: Page, rosso: string, nero: string): Promise<void> => { await page.click('#togli-puntali'); await piedino(page, rosso).click(); await piedino(page, nero).click(); await passi(page, 6); };
const lettura = (page: Page) => banco(page, g => g.stato.reading!);

const browser = await chromium.launch({ args: ['--headless=new'] });
try {
  const contesto = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await contesto.newPage(); ascolta(page);

  await prova('il menu: titolo, ventiquattro esercizi in sette capitoli, il banco libero, la versione', async () => {
    await page.goto(base);
    assert.match(await page.title(), /Banco di prova/);
    await page.locator('.esercizio').first().waitFor();
    assert.equal(await page.locator('.esercizio').count(), 25); assert.equal(await page.locator('.capitolo').count(), 8);
    assert.match(await page.locator('.esercizio.prossimo').innerText(), /Il codice colori[\s\S]*comincia da qui/);
    await page.waitForFunction(() => /^v\d+\.\d+\.\d+$/.test(document.querySelector('.versione')?.textContent ?? ''));
    await page.screenshot({ path: `${scatti}/01-menu.png`, fullPage: true });
  });

  await prova('il codice colori: si posa il multimetro, si legge, si risponde, e le stelle restano', async () => {
    await page.click('.esercizio[data-id=colori]'); await page.locator('.scena').waitFor();
    assert.equal(await page.locator('#lcd').innerText(), '', 'spento'); assert.match(await page.locator('#nota').innerText(), /spento/);
    await page.click('.pos[data-dial=ohm]'); await passi(page, 6);
    assert.equal((await lettura(page)).display, 'OL'); assert.match(await page.locator('#nota').innerText(), /non collegati/);
    await posa(page, 'R1.1', 'R1.2');
    const r = await lettura(page), q = await banco(page, g => g.stato.bench!.exercise!.question as { expected: number; unit: string });
    const scala = q.unit === 'MΩ' ? 1e6 : q.unit === 'kΩ' ? 1e3 : 1;
    assert.ok(Math.abs(r.value / scala - q.expected) < q.expected * 0.05, `il multimetro legge ${r.value} Ω, il nominale è ${q.expected} ${q.unit}`);
    assert.equal(await page.locator('#lcd').innerText(), r.display); assert.equal(await page.locator('.puntale').count(), 2);
    await page.screenshot({ path: `${scatti}/02-resistenza.png`, fullPage: true });
    await page.fill('#risposta', '0,001'); await page.click('#conferma');
    assert.match(await page.locator('#esito').innerText(), /Non è questa/);
    if (Math.abs(r.value / scala - q.expected) > q.expected * 0.005) { await page.fill('#risposta', (r.value / scala).toFixed(2)); await page.click('#conferma'); assert.match(await page.locator('#esito').innerText(), /valore misurato/, 'scritto il valore letto: il gioco spiega'); }
    await page.fill('#risposta', String(q.expected).replace('.', ',')); await page.click('#conferma');
    assert.match(await page.locator('#esito').innerText(), /Giusto ★★☆/, 'dopo uno sbaglio: due stelle');
    assert.equal(await banco(page, g => g.stato.save.stars.colori), 2);
    await page.reload(); await page.locator('.esercizio[data-id=colori]').waitFor();
    assert.match(await page.locator('.esercizio[data-id=colori]').innerText(), /★★☆/, 'dopo aver ricaricato le stelle ci sono ancora');
  });

  await prova('il catodo: la prova diodi conduce in un verso solo, e ritoccare un piedino toglie il puntale', async () => {
    await page.click('.esercizio[data-id=catodo]'); await page.locator('.scena').waitFor();
    await page.click('.pos[data-dial=diode]'); await posa(page, 'D1.1', 'D1.2');
    const a = await lettura(page); await posa(page, 'D1.2', 'D1.1'); const b = await lettura(page);
    assert.notEqual(a.display === 'OL', b.display === 'OL', `un verso conduce e l'altro no: ${a.display} / ${b.display}`);
    const conduce = a.display === 'OL' ? b : a; assert.ok(conduce.value > 0.5 && conduce.value < 0.7, `caduta ${conduce.value}`);
    await page.click('#scegli-nero'); await piedino(page, 'D1.1').click(); await passi(page, 6);
    assert.equal(await banco(page, g => g.stato.bench!.probes.black), null, 'ritoccato: puntale tolto');
    await page.click(`.scelta[data-scelta="${a.display === 'OL' ? 0 : 1}"]`);       // conduce col rosso a sinistra → catodo a destra
    assert.match(await page.locator('#esito').innerText(), /Giusto ★★★/);
    await page.screenshot({ path: `${scatti}/03-diodo.png`, fullPage: true });
  });

  await prova('il circuito col LED: è acceso, col ponticello aperto si spegne, e l\'amperometro in serie legge la corrente', async () => {
    await page.click('#al-menu'); await page.click('.esercizio[data-id=corrente-led]'); await page.locator('.scena').waitFor(); await passi(page, 6);
    const alone = (): Promise<number> => page.evaluate(() => Number(document.querySelector('[data-led=L1]')!.getAttribute('opacity')));
    assert.ok(await alone() > 0.5, 'il LED brilla');
    await page.locator('[data-switch=S1]').click(); await passi(page, 6); assert.ok(await alone() < 0.01, 'ponticello aperto: spento');
    await page.click('.boccola[data-jack=ma]'); await page.click('.pos[data-dial=ma]'); await posa(page, 'S1.1', 'S1.2');
    const r = await lettura(page), q = await banco(page, g => g.stato.bench!.exercise!.question as { expected: number });
    assert.equal(r.unit, 'mA'); assert.ok(Math.abs(r.value * 1000 - q.expected) < q.expected * 0.02, `legge ${r.value * 1000} mA, attesi ${q.expected}`);
    assert.ok(await alone() > 0.5, 'con l\'amperometro in serie il LED è di nuovo acceso: la corrente passa dallo strumento');
    await page.screenshot({ path: `${scatti}/04-corrente-led.png`, fullPage: true });
    await page.fill('#risposta', (q.expected).toFixed(1).replace('.', ',')); await page.click('#conferma');
    assert.match(await page.locator('#esito').innerText(), /Giusto ★★★/); assert.match(await page.locator('#esito').innerText(), /in serie|interrompendo/);
  });

  await prova('l\'errore classico sul banco libero: puntale in mA, selettore sui volt, sulla pila → fusibile saltato', async () => {
    await page.click('#al-menu'); await page.click('.esercizio[data-id=libero]'); await page.locator('#cassetto').waitFor();
    await page.click('.pezzo[data-pezzo=b-9v]'); await page.locator('.piedino[data-node="X1.1"]').waitFor();
    await page.click('.pos[data-dial=vdc]'); await posa(page, 'X1.1', 'X1.2');
    assert.ok(Math.abs((await lettura(page)).value - 9.38) < 0.05, 'la pila a vuoto');
    await page.click('.boccola[data-jack=ma]'); await passi(page, 6);
    assert.equal(await banco(page, g => g.stato.bench!.meter.fuseMaBlown), true); assert.equal(await banco(page, g => g.stato.bench!.fusesBlown), 1);
    await page.locator('#cambia-ma').waitFor(); assert.match(await page.locator('#nota').innerText(), /PUM|boccola di corrente|cortocircuito/);
    await page.screenshot({ path: `${scatti}/05-fusibile-saltato.png`, fullPage: true });
    await page.click('.boccola[data-jack=v]'); await page.click('#cambia-ma'); await passi(page, 6);
    assert.equal(await banco(page, g => g.stato.bench!.meter.fuseMaBlown), false); assert.equal(await page.locator('#cambia-ma').count(), 0);
    assert.ok(Math.abs((await lettura(page)).value - 9.38) < 0.05, 'cambiato il fusibile e rimesso il puntale, torna a misurare');
  });

  await prova('il condensatore sotto l\'ohmetro: la lettura sale da sola; il fusibile fa suonare la continuità', async () => {
    await page.click('.pezzo[data-pezzo=c-1000]'); await page.locator('.piedino[data-node="X1.1"]').waitFor();
    await page.click('.pos[data-dial=ohm]'); await posa(page, 'X1.1', 'X1.2');
    const prima = (await lettura(page)).value; await passi(page, 90); const dopo = (await lettura(page)).value;
    assert.ok(dopo > prima * 2, `sale: ${prima} → ${dopo}`);
    await page.click('.pezzo[data-pezzo=f]'); await page.locator('.piedino[data-node="X1.1"]').waitFor();
    await page.click('.pos[data-dial=cont]'); await posa(page, 'X1.1', 'X1.2');
    assert.equal((await lettura(page)).beep, true); assert.equal(await page.locator('#lcd-spia').innerText(), '·)))');
    await page.click('.pezzo[data-pezzo=q-npn]'); await page.locator('.piedino[data-node="X1.3"]').waitFor();
    await page.click('.pos[data-dial=diode]'); await posa(page, 'X1.2', 'X1.1');
    assert.ok((await lettura(page)).value > 0.5, 'transistor: dalla base (al centro) verso un altro piedino conduce'); assert.match(await page.locator('.scena').innerHTML(), /BC547/, 'sul banco libero la sigla si legge');
    await page.screenshot({ path: `${scatti}/06-transistor.png`, fullPage: true });
  });

  await prova('il guasto: il circuito si vede, il LED è spento, e l\'aiuto costa una stella', async () => {
    await page.click('#al-menu'); await page.click('.esercizio[data-id=guasto]'); await page.locator('.scena').waitFor(); await passi(page, 6);
    assert.ok(await page.evaluate(() => Number(document.querySelector('[data-led=L1]')!.getAttribute('opacity'))) < 0.01);
    assert.equal(await page.locator('.scena .filo').count() >= 5, true); assert.doesNotMatch(await page.locator('.scena').innerHTML(), /BC5/);
    await page.click('#chiedi-aiuto'); assert.match(await page.locator('#aiuto').innerText(), /Segui la tensione/);
    const giusta = await banco(page, g => g.stato.bench!.exercise!.question.correct as number);
    await page.click('.pos[data-dial=vdc]'); await posa(page, 'B1.1', 'B1.2'); await page.screenshot({ path: `${scatti}/07-guasto.png`, fullPage: true });
    await page.click(`.scelta[data-scelta="${giusta}"]`); assert.match(await page.locator('#esito').innerText(), /Giusto ★★☆/);
  });

  await prova('la pagina «come funziona» dice cosa fa il multimetro e cosa manca', async () => {
    await page.click('#al-menu'); await page.click('#vai-come'); await page.locator('.come').waitFor();
    const t = await page.locator('.come').innerText();
    for (const parola of ['risolutore', '10 MΩ', 'fusibile', 'Shockley', '230 V']) assert.ok(t.includes(parola), `manca «${parola}»`);
    await page.screenshot({ path: `${scatti}/08-come-funziona.png`, fullPage: true });
  });

  await prova('sul telefono: niente scorrimento laterale, e si gioca col tocco', async () => {
    const tel = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await tel.newPage(); ascolta(p);
    const largo = (): Promise<boolean> => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    await p.goto(base); await p.locator('.esercizio').first().waitFor(); assert.ok(await largo(), 'menu');
    await p.screenshot({ path: `${scatti}/09-telefono-menu.png`, fullPage: true });
    await p.tap('.esercizio[data-id=fusibili]'); await p.locator('.scena').waitFor(); assert.ok(await largo(), 'banco');
    await p.tap('.pos[data-dial=cont]');
    const saltato = await p.evaluate(() => (window as any).__banco.stato.bench.exercise.question.correct as number);
    for (const i of [0, 1, 2]) {
      await p.tap('#togli-puntali'); await p.locator(`.piedino[data-node="F${i + 1}.1"]`).tap(); await p.locator(`.piedino[data-node="F${i + 1}.2"]`).tap();
      await p.waitForFunction(n => { const s = (window as any).__banco.stato; return s.bench.probes.black === n && s.reading; }, `F${i + 1}.2`); await p.waitForTimeout(200);
      assert.equal(await p.evaluate(() => (window as any).__banco.stato.reading.beep), i !== saltato, `fusibile ${i + 1}`);
    }
    await p.screenshot({ path: `${scatti}/10-telefono-banco.png`, fullPage: true });
    await p.tap(`.scelta[data-scelta="${saltato}"]`); assert.match(await p.locator('#esito').innerText(), /Giusto ★★★/); assert.ok(await largo(), 'dopo la risposta');
    await tel.close();
  });


  await prova('oscilloscopio: due canali, puntali sui piedini, scale, accoppiamento e trigger', async () => {
    await page.goto(base); await page.click('.esercizio[data-id=ac-peak]');
    await page.click('#scope-0-probe'); await piedino(page, 'T1.1').click();
    await page.click('#scope-0-ground'); await piedino(page, 'T1.2').click();
    await page.selectOption('#scope-1-probe-node', 'T1.2'); await page.selectOption('#scope-1-ground-node', 'T1.1');
    await passi(page, 24);
    assert.equal(await page.locator('#scope-screen polyline').count(), 2);
    assert.equal(await page.locator('#scope-screen .scope-grid line').count(), 20);
    assert.equal(await page.locator('.puntale[class*="scope-"]').count(), 4);
    assert.match(await page.locator('#scope-status').innerText(), /agganciato/);
    const points = await page.locator('[data-trace="0"]').getAttribute('points');
    assert.ok(points && points.length > 500);
    await page.selectOption('#scope-0-volt', '10'); await page.selectOption('#scope-time', '5');
    await passi(page, 12); assert.notEqual(await page.locator('[data-trace="0"]').getAttribute('points'), points);
    await page.fill('#scope-trigger', '100'); await page.locator('#scope-trigger').blur(); await passi(page, 6);
    assert.match(await page.locator('#scope-status').innerText(), /Corsa libera/);
    await page.fill('#scope-trigger', '0'); await page.locator('#scope-trigger').blur();
    await page.selectOption('#scope-trigger-channel', '1'); await page.selectOption('#scope-0-coupling', 'ac'); await passi(page, 12);
    assert.match(await page.locator('#scope-status').innerText(), /agganciato/);
    await page.click('.pos[data-dial=vac]'); await posa(page, 'T1.1', 'T1.2');
    const measured = (await lettura(page)).value;
    const peakText = await page.locator('#scope-stats-0').innerText();
    const peak = Number(peakText.match(/max ([\d,]+) V/)![1].replace(',', '.'));
    assert.ok(Math.abs(measured - peak / Math.SQRT2) < .01);
    await page.fill('#risposta', String(peak / Math.SQRT2)); await page.click('#conferma');
    assert.match(await page.locator('#esito').innerText(), /Giusto/);
    await page.screenshot({ path: `${scatti}/11-oscilloscopio.png`, fullPage: true });
  });

  await prova('frequenza: il periodo letto sullo schermo risolve la domanda', async () => {
    await page.click('#al-menu'); await page.click('.esercizio[data-id=ac-frequency]');
    await page.selectOption('#scope-0-probe-node', 'T1.1'); await page.selectOption('#scope-0-ground-node', 'T1.2');
    await passi(page, 18);
    const t = await page.locator('#scope-stats-0').innerText();
    const ms = Number(t.match(/periodo ([\d,]+) ms/)![1].replace(',', '.'));
    await page.fill('#risposta', String(1000 / ms)); await page.click('#conferma');
    assert.match(await page.locator('#esito').innerText(), /Giusto/);
  });

  await prova('ponte con filtro: ripple misurabile, meno con capacità doppia e più con carico maggiore', async () => {
    await page.click('#al-menu'); await page.click('.esercizio[data-id=bridge-ripple]');
    await page.selectOption('#scope-0-probe-node', 'C1.1'); await page.selectOption('#scope-0-ground-node', 'C1.2');
    await page.selectOption('#scope-0-coupling', 'ac'); await page.selectOption('#scope-0-volt', '0.2');
    const ripple = async () => { await passi(page, 30); const t = await page.locator('#scope-stats-0').innerText(); return Number(t.match(/picco-picco ([\d,]+) V/)![1].replace(',', '.')); };
    const initial = await ripple(); assert.ok(initial > .05 && initial < 5);
    await page.click('#filter-capacity'); const moreC = await ripple(); assert.ok(moreC < initial * .65);
    await page.click('#filter-load'); const moreLoad = await ripple(); assert.ok(moreLoad > initial * 1.5);
    await page.click('#filter-reset'); const restored = await ripple(); assert.ok(Math.abs(restored / initial - 1) < .03);
    await page.fill('#risposta', String(restored)); await page.click('#conferma'); assert.match(await page.locator('#esito').innerText(), /Giusto/);
    await page.screenshot({ path: `${scatti}/12-ponte-filtro.png`, fullPage: true });
  });

  await prova('oscilloscopio a 390 px: sonde col tocco, tutti i comandi accessibili e nessuno scorrimento laterale', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await context.newPage(); ascolta(p); await p.goto(base);
    await p.tap('.esercizio[data-id=bridge-ripple]'); await p.tap('#scope-0-probe'); await piedino(p, 'C1.1').tap();
    await p.tap('#scope-0-ground'); await piedino(p, 'C1.2').tap();
    await p.selectOption('#scope-0-coupling', 'ac'); await p.selectOption('#scope-0-volt', '0.2'); await passi(p, 24);
    assert.equal(await p.locator('#scope-screen polyline').count(), 1);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391));
    assert.ok(await p.evaluate(() => [...document.querySelectorAll('#oscilloscopio button, #oscilloscopio select, #oscilloscopio input, #scope-screen')].every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= 391; })));
    await p.screenshot({ path: `${scatti}/13-telefono-oscilloscopio.png`, fullPage: true }); await context.close();
  });

  await prova('il server dice chi è e che versione serve', async () => {
    const r = await (await fetch(`${base}/api/health`)).json() as { ok: boolean; gioco: string; versione: string };
    assert.equal(r.gioco, 'Banco di prova'); assert.match(r.versione, /^\d+\.\d+\.\d+$/);
  });

  assert.deepEqual(errori, [], 'errori nella console del browser');
  assert.deepEqual(mancanti, [], 'risorse mancanti');
  console.log(`\n${fatte} prove nel browser riuscite.`);
} finally {
  await browser.close();
  await app.close();
}
