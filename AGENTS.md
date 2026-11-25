# Banco di prova — regole per gli agenti

- Tutto ciò che si legge è in italiano (interfaccia, README, `docs/`, commenti, commit, nomi delle prove).
  **Identificatori, nomi dei file e campi dei dati in inglese.**
- Node 26 da nvm: `export PATH=/home/manzolo/.nvm/versions/node/v26.13.0/bin:$PATH` prima di `npm`/`node`
  (il `Makefile` lo fa da solo).
- Gioco sulla porta 8803, Vite in sviluppo sulla 5183. Container e immagine `banco-prova`.
- **Il modello sta in `shared/`**: funzioni pure e deterministiche, senza DOM e senza orologio. Tutti i numeri
  (multimetro, diodi, fusibili) stanno in `shared/config.ts`. `client/` disegna e raccoglie i gesti: non calcola
  niente di elettrico.
- **Il multimetro non legge i valori dei componenti**: entra nel circuito come un elemento in più e mostra quello
  che il risolutore ne ricava. Non aggiungere scorciatoie («se è una resistenza, mostra il suo valore»): è così che
  gli errori veri hanno le conseguenze vere.
- **Ogni regola ha tre cose**: il commento, una prova in `tests/` con un valore noto, e la sua riga in
  `docs/MODELLO.md`. Le regole critiche hanno anche un difetto in `scripts/difetti-elenco.ts`.
- **Ogni esercizio deve risolversi con gli strumenti e solo con quelli** (multimetro, oscilloscopio coi cursori): in `tests/esercizi.test.ts` c'è, per ognuno,
  il procedimento scritto come misure, provato su venti varianti. Un esercizio nuovo entra col suo procedimento.
- **Onestà del modello**: continua e alternata nel tempo (niente transitori delle bobine), valori tipici e non di uno strumento preciso; lo dice la pagina «come
  funziona». Niente esercizi sulla tensione di rete.
- Niente risorse scaricate, salvo dati di pubblico dominio o CC0 documentati in `ASSET_LICENSES.md`.
  Suoni sintetizzati in WebAudio. Mai chiedere chiavi API o account.
- `prompts/` e `assets/raw/` non vanno né nel repo né nell'immagine Docker.
- `make test-all` verde prima di ogni commit. Commit locali con autore `manzolo@libero.it`, messaggi in
  italiano. **Push, remote, `make deploy`, sottodominio e vetrina li decide Andrea.**
- Qui `make build` costruisce l'immagine Docker; la compilazione è `make compila`.
- Che cosa c'è, che cosa manca e le fette successive in ordine: `docs/CONSEGNA.md`.
