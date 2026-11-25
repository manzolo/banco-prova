# 🔧 Banco di prova

Simulatore di componenti elettronici e multimetro, da giocare nel browser: **resistenze, condensatori, bobine, diodi,
LED, zener, transistor, fusibili e pile** da misurare con un multimetro che si usa come quello vero (selettore,
boccole, puntali) e che sbaglia come quello vero: il puntale nella boccola sbagliata fa saltare il fusibile, gli ohm
su un circuito acceso non valgono, una pila scarica a vuoto sembra buona. Venti esercizi con varianti e un banco libero.

Un progetto di Andrea Manzi (IU5VMO). Sotto c'è un piccolo risolutore di circuiti in continua: che cosa calcola e
quanto fidarsi sta in `docs/MODELLO.md`.

## Provarlo

```sh
make install     # una volta: dipendenze dal lockfile, con Node 26
make dev         # sviluppo con ricarica su http://localhost:5183
make play        # il gioco compilato su http://localhost:8803
make up          # lo stesso in Docker, in background
```

## Verificarlo

```sh
make test          # prove del modello con valori noti
make test-difetti  # inietta i difetti uno alla volta: le prove devono coglierli
make test-e2e      # prova nel browser (Playwright)
make test-all      # tutto insieme: va lanciato prima di ogni commit
```

## Com'è fatto

- `shared/` — il modello: `circuit.ts` (analisi nodale, diodi con Newton, condensatori nel tempo), `parts.ts`
  (componenti, codici, guasti), `meter.ts` (il multimetro come elemento del circuito), `scene.ts`, `exercises.ts`,
  `game.ts`, `save.ts`. I numeri in `shared/config.ts`.
- `client/` — il banco disegnato in SVG e l'interfaccia: mostra quello che il modello calcola.
- `server/` — serve la build e `/api/health` con la versione.
- `tests/`, `scripts/difetti*.ts` — le prove e i difetti iniettati.
- `docs/CONSEGNA.md` — stato dei lavori; `docs/MODELLO.md` — formule e approssimazioni.

## Pubblicare

Come gli altri giochi: `make bump PARTE=minor` (verifica, commit, tag), poi `make deploy` con `deploy.local.mk`
(fuori da git: `DEPLOY_HOST`, `DEPLOY_DIR`, `DEPLOY_URL`). Lo decide Andrea.
