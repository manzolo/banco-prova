import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
// Percorsi relativi: la stessa build gira sotto un sottodominio, sul server Node e su GitHub Pages (manzolo.github.io/banco-prova/).
export default defineConfig({
  base: './',
  define: { __VERSION__: JSON.stringify(version) },
  server: { port: 5183, strictPort: true, proxy: { '/api': 'http://localhost:8803' } },
  build: { target: 'es2022' }
});
