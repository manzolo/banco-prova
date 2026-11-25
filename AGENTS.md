# CQ CQ — regole per gli agenti

- Tutto ciò che si legge è in italiano (interfaccia, README, `docs/`, commenti, commit, nomi delle prove).
  **Identificatori, nomi dei file e campi dei dati in inglese.**
- Node 26 da nvm: `export PATH=/home/manzolo/.nvm/versions/node/v26.13.0/bin:$PATH` prima di `npm`/`node`
  (il `Makefile` lo fa da solo).
- Gioco sulla porta 8801, Vite in sviluppo sulla 5181. Container e immagine `cq-cq`.
- **Il modello sta in `shared/`**: funzioni pure e deterministiche, senza DOM e senza orologio. Tutti i numeri
  (fattori, Q, soglie, tabelle dei cavi e della ionosfera) stanno in `shared/config.ts`. `client/` disegna e
  raccoglie i comandi: non calcola niente di fisico.
- **Ogni formula ha tre cose**: il commento con la formula e le unità, una prova in `tests/` con un valore noto
  (il conto nel commento), e la sua riga in `docs/MODELLO.md` con il grado di fiducia (esatta di manuale,
  approssimazione ingegneristica, regola empirica). Le regole critiche hanno anche un difetto in
  `scripts/difetti-elenco.ts`, che la prova deve cogliere.
- **Onestà del modello**: è didattico, non una previsione. Una regola empirica si dichiara tale anche nel gioco
  (pagina «come calcola»). Fuori dai limiti del modello si dice «qui il modello non arriva», non si inventa un
  numero. Se cambi una formula o una tabella, aggiorna `docs/MODELLO.md` nello stesso commit.
- La grafica disegna le funzioni del modello (per esempio il profilo dell'onda stazionaria), non effetti finti.
- Le bande e i segmenti di `shared/bands.ts` sono una copia del band plan del gemello: in testa al file c'è da
  dove vengono e la data. Si correggono là e si ricopiano, non si divergono qui.
- Niente risorse scaricate, salvo dati di pubblico dominio o CC0 documentati in `ASSET_LICENSES.md`.
  Suoni sintetizzati in WebAudio. Mai chiedere chiavi API o account.
- `prompts/` e `assets/raw/` non vanno né nel repo né nell'immagine Docker.
- `make test-all` verde prima di ogni commit. Commit locali con autore `manzolo@libero.it`, messaggi in
  italiano. **Push, remote, `make deploy`, sottodominio e vetrina li decide Andrea.**
- Qui `make build` costruisce l'immagine Docker; la compilazione è `make compila`.
- Che cosa c'è, che cosa manca e le fette successive in ordine: `docs/CONSEGNA.md`.
