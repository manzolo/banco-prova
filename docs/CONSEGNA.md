# Banco di prova — stato dei lavori

**Versione 0.2 (2026-11-25), pubblicata su GitHub Pages** col sì di Andrea: <https://manzolo.github.io/banco-prova/>,
repo pubblico `github.com/manzolo/banco-prova`, licenza MIT. Italiano di default, inglese a scelta (tasto nel menu o
`?lang=en`). Nome provvisorio, scelto da Claude: lo conferma o lo cambia Andrea. Accolte una revisione critica
(sull'oscilloscopio e gli esercizi nuovi, fatta da un agente perché Codex aveva finito il credito) e la richiesta di
Andrea di avere aiutini e appunti.

## Che cosa c'è

- `shared/circuit.ts`: risolutore in continua e nel tempo (analisi nodale, Gauss col perno, diodi di Shockley con Newton e
  ginocchio di zener, condensatori nel tempo con Eulero all'indietro, generatori in alternata istantanei, memoria dei condensatori e riuso delle tensioni per Newton).
- `shared/transient.ts`, `shared/scope.ts`: avanzamento deterministico nel tempo, registrazioni, misure dai campioni, due ingressi da 1 MΩ, trigger crescente e accoppiamento DC/AC.
- `shared/parts.ts`: resistenze (codice colori, tolleranza, guasti), condensatori ceramici ed elettrolitici (codice
  a tre cifre, in corto, in perdita, secchi, interrotti), bobine, diodi, LED, zener, transistor come due giunzioni,
  fusibili, pile con la resistenza interna, potenziometro, ponticello, trasformatore e ponte a quattro diodi.
- `shared/meter.ts`: il multimetro come elemento del circuito. Volt in continua e alternata, ohm, continuità col
  cicalino, prova diodi, capacità, corrente su due boccole coi loro fusibili; display a 4000 punti.
- `shared/scene.ts`: la fila di pezzi sciolti e il circuito ad anello, con la geometria per disegnarli.
- `shared/exercises.ts`: ventiquattro esercizi in sette capitoli, ognuno con varianti ripetibili, più il cassetto del banco
  libero (sedici pezzi, col generatore di funzioni). Testi in italiano e inglese.
- `shared/game.ts`, `shared/save.ts`: lo stato del banco, le stelle, il salvataggio con versione.
- `client/`: menu, banco in SVG, multimetro, pannello delle domande, pagina «come funziona», suoni; `i18n.ts`
  (italiano e inglese), `aiutini.ts` (il «?» sul banco: tabelle in sovraimpressione, gratis), `appunti.ts` (la teoria
  degli esercizi con un esempio per argomento, scritta per il gioco: la dispensa del corso ARI non va pubblicata). Oscilloscopio SVG 10×8 con scale, trigger, due coppie di sonde e selettori dei piedini accessibili anche sul telefono.

## Nuovo capitolo: Alternata e oscilloscopio

- Dal picco al valore efficace, con confronto V~.
- Frequenza da un periodo misurato (varianti a 50, 100 e 1000 Hz).
- Raddrizzatore a semionda: massimo sul carico.
- Ponte e filtro: ripple misurato, capacità doppia e resistenza di carico dimezzata, ripristino dei valori iniziali.

I procedimenti in `tests/esercizi.test.ts` risolvono tutti gli esercizi su venti varianti usando solo ciò che
si vede e le misure. Per il nuovo capitolo si usa anche l'oscilloscopio. Il ponte ha controlli indipendenti di
picco, frequenza di ricarica, scarica RC, ripple e sensibilità al passo in `tests/transient.test.ts`.
Le sonde restano collegate mentre si usa il multimetro: tutti gli ingressi caricano lo stesso circuito.

## Cose note, da guardare giocando

- **Nessuno l'ha ancora giocato a mano**: gli esercizi li risolve una prova, con le misure che farebbe una persona.
- I puntali si posano con un clic sul piedino, non si trascinano.
- Il potenziometro c'è nel modello ma non nel cassetto né negli esercizi (manca il cursore da muovere).
- Nei circuiti ci sono pile e secondari alternati isolati; manca ancora un alimentatore o generatore regolabile nel cassetto.
- Il transistor si prova solo «a diodi»: non amplifica, non c'è la misura dell'hFE.

## Idee per dopo

1. Generatore di funzioni regolabile nel cassetto (frequenza e forma quadra sono già supportate nel modello).
2. Transitori delle bobine, solo insieme a esercizi dedicati; ESR del filtro e banda passante degli strumenti.
3. Pinza amperometrica e capitolo sulle saldature fredde e sui falsi contatti.

## La revisione critica dell'oscilloscopio (2026-11-25)

Accolte: fusibile che salta in alternata senza annunciarsi; accoppiamento AC su un numero intero di periodi; esercizi
vincibili senza misurare (trasformatore realistico a vuoto, domanda sul picco, carichi della semionda che spostano la
caduta, niente misure automatiche negli esercizi ma cursori, suddivisioni sul reticolo); falso «circuito acceso» mentre
l'ohmetro carica il condensatore; masse delle sonde in comune; pannello dell'oscilloscopio solo dove serve; sonda,
poi massa, poi di nuovo il multimetro; formula del ripple dichiarata come stima per eccesso; valori del filtro in
ohm; generatore di funzioni al posto del trasformatore a 100 e 1000 Hz; registrazione che non si cancella girando il
selettore; procedimenti delle prove che leggono la traccia coi cursori sul percorso vero del banco. Non accolte: le
misure di prestazione sul telefono (da guardare giocando); l'amperometro nel tempo mostra ancora la corrente
istantanea (dichiarato nella pagina «come funziona»).

## Pubblicare

Su GitHub Pages: `make bump PARTE=minor` (verifica, commit, tag), poi `git push github main --tags`. Il flusso
`.github/workflows/pages.yml` ricontrolla (compilazione, prove, difetti, file pubblicabili) e pubblica la cartella
`dist`. Le prove nel browser si fanno in locale prima del tag.

## Da decidere con Andrea

- Il nome definitivo. La voce nella vetrina di manzolo.it.
