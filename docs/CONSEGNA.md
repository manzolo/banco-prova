# Banco di prova — stato dei lavori

**Prima versione completa e giocabile in locale (2026-11-25), v0.1.0, niente push.** Nome provvisorio, scelto da
Claude: lo conferma o lo cambia Andrea. Ampliata con alternata nel tempo e oscilloscopio: 75 prove del modello, 101 difetti iniettati e 14 prove nel browser (anche a 390 px). `make test-all` riuscito: compilazione, 75/75 prove, 101/101 difetti colti e 14/14 prove nel browser.

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
  libero (quindici pezzi).
- `shared/game.ts`, `shared/save.ts`: lo stato del banco, le stelle, il salvataggio con versione.
- `client/`: menu, banco in SVG, multimetro, pannello delle domande, pagina «come funziona», suoni. Oscilloscopio SVG 10×8 con scale, trigger, due coppie di sonde e selettori dei piedini accessibili anche sul telefono.

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

## Da decidere con Andrea

- Il nome. Poi repo, sottodominio, `make deploy` e voce in vetrina, come per CQ CQ.

## Note di questa modifica

Nessuna operazione Git, commit o pubblicazione. `DEPLOY_VER` nel Makefile viene ora valutato soltanto quando
serve alla pubblicazione: `make test-all` non esegue più implicitamente `git show` durante la lettura del file.
Le prove nel browser avviano un server temporaneo e lo chiudono al termine. Nessuna risorsa esterna aggiunta.
