# 📡 CQ CQ

Simulatore di antenna e trasmissione per radioamatori, da giocare nel browser: **costruisci l'antenna, collegala
alla radio, accorda, sintonizza, premi TRASMETTI** e guarda l'onda formarsi e fin dove arriva. Se l'antenna è
sbagliata il gioco lo fa vedere, con i numeri che lo spiegano.

Un progetto di Andrea Manzi (IU5VMO). Il modello è **didattico**: formule vere dove sono semplici, regole di
massima dichiarate dove la fisica è troppo complessa. Che cosa calcola e quanto fidarsi: `docs/MODELLO.md`.

## Provarlo

```sh
make install     # una volta: dipendenze dal lockfile, con Node 26
make dev         # sviluppo con ricarica su http://localhost:5181
make play        # il gioco compilato su http://localhost:8801
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

- `shared/` — il modello: funzioni pure, senza DOM. I numeri in `shared/config.ts`.
- `client/` — canvas 2D e interfaccia: disegna quello che il modello calcola. Tre livelli (facile, medio,
  avanzato), otto missioni e un banco libero; il salvataggio sta nel browser.
- `server/` — serve la build e `/api/health` con la versione.
- `tests/`, `scripts/difetti*.ts` — le prove e i difetti iniettati.
- `docs/CONSEGNA.md` — stato dei lavori; `docs/MODELLO.md` — formule, fonti e approssimazioni.

## Pubblicare

Come gli altri giochi: `make bump PARTE=minor` (verifica, commit, tag), poi `make deploy` con `deploy.local.mk`
(fuori da git: `DEPLOY_HOST`, `DEPLOY_DIR`, `DEPLOY_URL`). Lo decide Andrea.
