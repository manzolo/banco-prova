// Server del gioco: serve la build statica e /api/health con la versione (la controlla make deploy).
// La partita gira tutta nel browser; quando arriverà il multiplayer, la simulazione di shared/ girerà anche qui.
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.md': 'text/markdown; charset=utf-8'
};

export function createApplication() {
  const root = fileURLToPath(new URL('../dist/', import.meta.url));
  const http = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self'; frame-ancestors 'none'");
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, gioco: 'Banco di prova', versione: VERSION }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let path: string;
    try { path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname)); } catch { res.writeHead(400); res.end(); return; }
    if (!path.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const stat = statSync(path);
      if (!stat.isFile()) throw new Error('Non è un file');
      res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600' });
      if (req.method === 'HEAD') res.end(); else createReadStream(path).on('error', () => res.destroy()).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Risorsa non trovata.');
    }
  });
  return { http, close: () => new Promise<void>(done => { http.close(() => done()); http.closeAllConnections(); }) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApplication(), port = Number(process.env.PORT ?? 8803);
  app.http.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`📡 Banco di prova disponibile sulla porta ${port}`));
  const stop = () => { void app.close().then(() => process.exit(0)); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
