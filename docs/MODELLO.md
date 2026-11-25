# Banco di prova — il modello

Gradi di fiducia: **E** formula esatta di manuale; **A** approssimazione ingegneristica; **R** regola del gioco o
valore tipico, da dichiarare anche nella pagina «come funziona».

## Il circuito

| Cosa | Come | Fiducia |
|---|---|---|
| Legge dei nodi | per ogni nodo la somma delle correnti è zero; sistema G·v = i risolto con Gauss e perno parziale | E |
| Resistenza | conduttanza 1/R fra i due nodi | E |
| Generatore reale | tensione a vuoto V con resistenza interna r, scritto come equivalente di Norton (V/r in parallelo a 1/r) | E |
| Diodo | i = Is·(e^(v/(n·Vt)) − 1), Vt = 25,85 mV; risolto per iterazioni di Newton con un freno sul passo | E la formula; **R** i parametri |
| Zener | al diodo si aggiunge un ginocchio esponenziale attorno alla tensione nominale | A |
| Condensatore | in continua aperto; nel tempo una conduttanza C/dt più un generatore che ricorda la tensione (Eulero all'indietro) | A: buono con passi piccoli rispetto a R·C |
| Bobina | la sola resistenza del filo | A: niente transitori |
| Alternata | i generatori in alternata valgono zero in continua; in V~ si risolve il circuito coi soli generatori alternati, trattandolo come lineare, e si legge il valore efficace | R: vale per un trasformatore con carichi resistivi |
| Nodi in aria | ogni nodo ha 1 pS verso il riferimento | R: serve solo a far tornare i conti |

## I componenti

| Cosa | Valori | Fiducia |
|---|---|---|
| Cadute dei diodi a 1 mA | 1N4148 0,61 V; 1N4007 0,57 V; Schottky 0,16 V; germanio 0,21 V; LED rosso 1,79 V; verde 2,11 V; blu 2,85 V | R: parametri scelti per dare valori tipici |
| Transistor | due giunzioni dalla base: base-emettitore 0,64 V, base-collettore 0,61 V a 1 mA | R |
| Pila da 9 V | a vuoto 7,4 + 2,2·carica volt; resistenza interna 2 + 60·(1 − carica)² Ω | R |
| Guasti | resistenza salita del 38% o interrotta; condensatore in corto (0,4 Ω), in perdita (18 kΩ), secco (30% della capacità), interrotto | R |
| Codice colori e codice dei condensatori | quattro bande; tre cifre in picofarad | E |

## Il multimetro

| Funzione | Che cosa mette fra i puntali | Fiducia |
|---|---|---|
| V⎓, V~ | 10 MΩ | R: tipico dei digitali |
| Ω, continuità | 0,6 V attraverso 1 kΩ; legge V/I; cicalino sotto 50 Ω; OL oltre 40 MΩ | R |
| Prova diodi | 3 V attraverso 2,2 kΩ; mostra la tensione; OL oltre 2,5 V | R |
| Capacità | somma dei condensatori fra i puntali, se la resistenza in continua fra i puntali supera 2 MΩ | R: un capacimetro vero misura un tempo di carica |
| mA | shunt da 1,2 Ω, fusibile da 400 mA | R |
| 10 A | shunt da 0,02 Ω, fusibile da 10 A | R |
| Circuito acceso | se fra i puntali c'erano già più di 50 mV, ohm, continuità, diodi e capacità segnalano che la misura non vale | R |
| Display | 4000 punti, la virgola si sposta da sola | R |

Lo shunt è nel circuito appena il puntale rosso sta in una boccola di corrente, qualunque sia il selettore: è questo
che fa saltare il fusibile quando si misura una tensione col puntale dimenticato lì.

## Che cosa non c'è

Frequenza, reattanze, transitori delle bobine, rumore, precisione dello strumento (legge il valore esatto, arrotondato
al display), effetti termici, tensioni pericolose.
