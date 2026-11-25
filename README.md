# 🔧 Banco di prova

> **In English:** a browser game to practise with electronic components, a multimeter and an oscilloscope. Real parts, a real meter, real mistakes: leave the red lead in the mA jack and the fuse blows. 24 exercises with variants, a free bench, help tables and study notes. Italian by default, English with the menu button or `?lang=en`. MIT licence.

Simulatore di componenti elettronici, multimetro e oscilloscopio, da giocare nel browser: **resistenze, condensatori, bobine, diodi,
LED, zener, transistor, fusibili e pile** da misurare con un multimetro che si usa come quello vero (selettore,
boccole, puntali) e che sbaglia come quello vero: il puntale nella boccola sbagliata fa saltare il fusibile, gli ohm
su un circuito acceso non valgono, una pila scarica a vuoto sembra buona. Ventiquattro esercizi con varianti e un banco libero. Il capitolo «Alternata e oscilloscopio» comprende picco, frequenza, semionda e ponte raddrizzatore con filtro e ripple.

Un progetto di Andrea Manzi (IU5VMO). Sotto c'è un piccolo risolutore di circuiti in continua e nel tempo: che cosa calcola e
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
  `game.ts`, `save.ts`, `transient.ts` (avanzamento nel tempo), `scope.ts` (due canali da 1 MΩ, tracce e trigger). I numeri in `shared/config.ts`.
- `client/` — il banco disegnato in SVG e l'interfaccia: mostra quello che il modello calcola.
- `server/` — serve la build e `/api/health` con la versione.
- `tests/`, `scripts/difetti*.ts` — le prove e i difetti iniettati.
- `docs/CONSEGNA.md` — stato dei lavori; `docs/MODELLO.md` — formule e approssimazioni.

## Giocarlo

Su <https://manzolo.github.io/banco-prova/> (in inglese: <https://manzolo.github.io/banco-prova/?lang=en>).

## Pubblicare

`make bump PARTE=minor` (verifica, commit e tag), poi `git push github main --tags`: il flusso di GitHub Actions
ricontrolla e pubblica su GitHub Pages. In alternativa, come gli altri giochi, `make deploy` su un server con Docker.

## Licenza

MIT, vedi `LICENSE`. Niente risorse di terzi: disegni in SVG fatti a mano, suoni sintetizzati.
