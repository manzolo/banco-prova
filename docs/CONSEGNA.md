# Banco di prova — stato dei lavori

**Prima versione completa e giocabile in locale (2026-11-25), v0.1.0, niente push.** Nome provvisorio, scelto da
Claude: lo conferma o lo cambia Andrea. 58 prove con valori noti, 69 difetti iniettati tutti colti, 10 prove nel
browser (anche a misura di telefono).

## Che cosa c'è

- `shared/circuit.ts`: risolutore in continua (analisi nodale, Gauss col perno, diodi di Shockley con Newton e
  ginocchio di zener, condensatori nel tempo con Eulero all'indietro, generatori in alternata letti a parte).
- `shared/parts.ts`: resistenze (codice colori, tolleranza, guasti), condensatori ceramici ed elettrolitici (codice
  a tre cifre, in corto, in perdita, secchi, interrotti), bobine, diodi, LED, zener, transistor come due giunzioni,
  fusibili, pile con la resistenza interna, potenziometro, ponticello, trasformatore.
- `shared/meter.ts`: il multimetro come elemento del circuito. Volt in continua e alternata, ohm, continuità col
  cicalino, prova diodi, capacità, corrente su due boccole coi loro fusibili; display a 4000 punti.
- `shared/scene.ts`: la fila di pezzi sciolti e il circuito ad anello, con la geometria per disegnarli.
- `shared/exercises.ts`: venti esercizi in sei capitoli, ognuno con varianti ripetibili, più il cassetto del banco
  libero (quindici pezzi).
- `shared/game.ts`, `shared/save.ts`: lo stato del banco, le stelle, il salvataggio con versione.
- `client/`: menu, banco in SVG, multimetro, pannello delle domande, pagina «come funziona», suoni.

## Cose note, da guardare giocando

- **Nessuno l'ha ancora giocato a mano**: gli esercizi li risolve una prova, con le misure che farebbe una persona.
- I puntali si posano con un clic sul piedino, non si trascinano.
- Il potenziometro c'è nel modello ma non nel cassetto né negli esercizi (manca il cursore da muovere).
- Nei circuiti il generatore è sempre una pila da 9 V: niente alimentatore regolabile.
- Il transistor si prova solo «a diodi»: non amplifica, non c'è la misura dell'hFE.

## Idee per dopo

- Ponte raddrizzatore col trasformatore e il condensatore di filtro (serve l'alternata nel tempo, non solo il
  valore efficace). Oscilloscopio. Pinza amperometrica. Capitolo sulle saldature fredde e sui falsi contatti.

## Da decidere con Andrea

- Il nome. Poi repo, sottodominio, `make deploy` e voce in vetrina, come per CQ CQ.
