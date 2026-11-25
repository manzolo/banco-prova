// «Errori introdotti»: una prova che non fallisce mai non prova niente. Qui si inietta un difetto alla volta nel
// modello (in una copia usa e getta di shared/ e tests/) e si pretende che `node --test` lo colga.
// Se un difetto sopravvive, manca una prova: lo script esce con errore e dice quale.
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DIFETTI } from './difetti-elenco.ts';

const radice = new URL('..', import.meta.url).pathname;
const banco = mkdtempSync(join(tmpdir(), 'bancoprova-difetti-'));
let sopravvissuti = 0;
try {
  cpSync(join(radice, 'shared'), join(banco, 'shared'), { recursive: true });
  cpSync(join(radice, 'tests'), join(banco, 'tests'), { recursive: true, filter: p => !p.endsWith('e2e.ts') });
  writeFileSync(join(banco, 'package.json'), '{"type":"module"}');
  const file = readdirSync(join(banco, 'tests')).filter(f => f.endsWith('.test.ts')).map(f => join('tests', f));
  const prove = (): boolean => spawnSync(process.execPath, ['--test', ...file], { cwd: banco, stdio: 'ignore' }).status === 0;
  if (!prove()) { console.error('✗ le prove falliscono già sul modello sano: prima npm test'); process.exit(1); }
  for (const d of DIFETTI) {
    const percorso = join(banco, 'shared', d.file), sano = readFileSync(percorso, 'utf8');
    if (!sano.includes(d.da)) { console.error(`✗ difetto «${d.nome}»: il testo da sostituire non c'è più in shared/${d.file} (aggiorna scripts/difetti-elenco.ts)`); sopravvissuti++; continue; }
    writeFileSync(percorso, sano.replace(d.da, d.a));
    const colto = !prove();
    writeFileSync(percorso, sano);
    console.log(`${colto ? '✓ colto      ' : '✗ SOPRAVVIVE '} ${d.nome}`);
    if (!colto) sopravvissuti++;
  }
} finally {
  rmSync(banco, { recursive: true, force: true });
}
console.log(sopravvissuti ? `\n${sopravvissuti} difetti su ${DIFETTI.length} non colti: mancano prove.` : `\nTutti i ${DIFETTI.length} difetti iniettati sono stati colti dalle prove.`);
process.exit(sopravvissuti ? 1 : 0);
