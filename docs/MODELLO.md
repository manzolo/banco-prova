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
| Bobina | la sola resistenza del filo, anche nelle acquisizioni nel tempo | A: niente transitori induttivi; non servono ai nuovi esercizi |
| Alternata nel tempo | v(t) = √2 · Veff · sin(2πft), f = `hz` oppure 50 Hz; quadra simmetrica opzionale con picco Veff. Le sorgenti continue restano attive | E: sorgente ideale con resistenza interna; R: valori e forma imposta |
| Soluzione statica | senza `time`, resta disponibile la soluzione continua e la vecchia selezione `ac` per circuiti resistivi; gli strumenti in alternata usano invece campioni nel tempo | R: compatibilità del risolutore, non analisi in frequenza |
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
| V⎓, V~ | 10 MΩ; in presenza di alternata V⎓ legge la media, V~ legge √media((v − media(v))²) dei campioni risolti | R: ingresso tipico; E: efficace della componente alternata |
| Ω, continuità | 0,6 V attraverso 1 kΩ; legge V/I; cicalino sotto 50 Ω; OL oltre 40 MΩ | R |
| Prova diodi | 3 V attraverso 2,2 kΩ; mostra la tensione; OL oltre 2,5 V | R |
| Capacità | somma dei condensatori fra i puntali, se la resistenza in continua fra i puntali supera 2 MΩ | R: un capacimetro vero misura un tempo di carica |
| mA | shunt da 1,2 Ω, fusibile da 400 mA | R |
| 10 A | shunt da 0,02 Ω, fusibile da 10 A | R |
| Circuito acceso | se fra i puntali c'erano già più di 50 mV, ohm, continuità, diodi e capacità segnalano che la misura non vale; una sorgente alternata non nulla nella scena fa segnalare circuito acceso anche attraversando zero (controllo conservativo) | R |
| Display | 4000 punti, la virgola si sposta da sola | R |

Lo shunt è nel circuito appena il puntale rosso sta in una boccola di corrente, qualunque sia il selettore: è questo
che fa saltare il fusibile quando si misura una tensione col puntale dimenticato lì.

## Transitori e oscilloscopio

| Regola | Formula o comportamento | Fiducia |
|---|---|---|
| Passo elettrico | dt ≤ min(0,1 ms, 1/(128 · fmassima)); ogni passo chiama lo stesso risolutore all'istante finale, mantenendo `capV` | A: Eulero all'indietro, smorza i dettagli veloci |
| Memoria | Gc = C/dt; corrente nel condensatore i = (C/dt) · (vnuova − vprecedente). Le registrazioni consecutive conservano tensione e tempo | E per il circuito equivalente, A per la discretizzazione |
| Newton nel tempo | riusa le tensioni precedenti; accetta variazioni sotto 1 nV oppure residuo della linearizzazione dei diodi sotto 0,1 nA per giunzione. Se non converge, interrompe il calcolo con errore | A: evita falsi fallimenti del modo comune quasi flottante del ponte interdetto |
| Due canali | ogni canale collegato aggiunge 1 MΩ tra sonda e propria massa. **Le masse sono in comune** (0,1 Ω fra loro, lo schermo della sonda), come in un oscilloscopio da banco: due masse su punti diversi li cortocircuitano | R |
| Reticolo | 10 divisioni orizzontali × 8 verticali, x = (t − ttrigger)/tempoDiv; y = 4 − v/voltDiv | R: scala grafica; il segnale fuori schermo viene tagliato |
| Accoppiamento DC/AC | DC mantiene tutta la tensione; AC sottrae alla traccia la media calcolata **su un numero intero di periodi** (fra il primo e l'ultimo fronte di salita a metà altezza). La registrazione dura almeno tre schermate e più di due periodi. Il carico resta 1 MΩ | R: rimozione ideale della continua, non un ingresso passa-alto reale |
| Trigger | ultimo attraversamento crescente del livello, interpolato fra campioni, con un'intera schermata disponibile; canale selezionabile. Se manca: corsa libera dichiarata | A: interpolazione lineare, nessun holdoff o isteresi |
| Cursori | due punti posati sullo schermo: tensione = (4 − y) · V/div del canale 1, tempo = Δx · tempo/div. Negli esercizi sono l'unico modo di misurare: le misure automatiche compaiono solo sul banco libero | E, come su uno strumento vero |
| Misure automatiche (solo banco libero) | min, max, ripple = max − min; media, efficace ed efficace AC su periodi interi. Periodo medio fra fronti crescenti al livello della media, solo se ce ne sono almeno due | E sulle serie discrete; A per periodo interpolato |
| V~ e V⎓ | finestra pari a un periodo della sorgente più lenta (20 ms con sola continua); V~ esclude la continua, quindi su un raddrizzatore legge l'efficace del ripple, non quello totale | E su periodi interi; A per campionamento e sorgenti multiple non commensurabili |
| Fusibile in alternata nel banco | lo shunt e tutti gli ingressi degli strumenti sono nello stesso circuito; la soglia del fusibile è verificata a ogni sottopasso | R: scatto istantaneo di picco, non curva tempo-corrente né fusibile termico |
| Trasformatore | a vuoto 1,12 volte la targa; la differenza cade sulla resistenza del secondario alla corrente di targa (0,4 A): r = 0,12 · V_targa / 0,4 | R: valori tipici dei trasformatori piccoli |
| Generatore di funzioni | sinusoide o quadra, frequenza scelta, uscita da 50 Ω | R |
| Raddrizzatore a semionda | un diodo di Shockley, resistenza interna della sorgente, carico resistivo; uscita negativa quasi nulla | A: nessuna commutazione o capacità di giunzione |
| Ponte con filtro | quattro diodi reali del modello, due in conduzione per semiperiodo; condensatore in parallelo al carico. Ricarica a 2f, scarica circa esponenziale con τ = R·C | A: con le cadute risolte, non una sottrazione fissa di 1,4 V |
| Stima del ripple | a piccolo ripple ΔV ≈ Icarico/(2fC); trascura la durata della ricarica, quindi tende a sovrastimare. Il gioco usa max − min dei campioni, mai questa stima per disegnare | A: formula didattica di controllo |
| Esplorazione del filtro | capacità doppia o resistenza dimezzata rispetto alla variante iniziale; ripristino disponibile. Conserva la tensione di C, svuota la registrazione e attende il nuovo regime | R: sostituzione ideale del pezzo, non conservazione della carica quando cambia C |

`tests/transient.test.ts` controlla picchi, frequenza, quadra, memoria RC, attenuazione RC a 50 Hz, carico di
entrambi i canali, trigger, scale, efficace a 50 e 60 Hz, semionda, ponte, scarica RC e variazioni di carico/capacità.
Nel riferimento 12 V~, 1 kΩ, 470 µF, dimezzare dt da 0,1 a 0,05 ms cambia il ripple di meno del 2%.
Le prove degli esercizi usano venti varianti per ciascuno dei 24 esercizi; i quattro nuovi usano le misure
dell'oscilloscopio, estendendo esplicitamente il precedente requisito del solo multimetro.

Le acquisizioni da fermo per le prove e la correzione iniziano con condensatori scarichi, attendono 0,2 s e
registrano tre schermate. Questo assestamento è verificato per i valori degli esercizi, non è un criterio
universale di regime. Nel banco il tempo continua, la registrazione è scorrevole e i condensatori non si
scaricano cambiando scala o spostando una sonda. Le statistiche dell'oscilloscopio si riferiscono alla
registrazione completa prima dell'accoppiamento, anche quando la traccia mostra solo una schermata.

## Che cosa non c'è

Transitori delle bobine, isteresi magnetica, ESR/ESL dei condensatori, capacità e recupero inverso dei diodi,
rumore, banda passante e precisione reale degli strumenti, effetti termici, tensioni pericolose. Il generatore
ha frequenza configurabile nel modello e nell'esercizio dedicato; non c'è ancora un generatore regolabile nel
cassetto. Il campionamento è scelto sulla frequenza delle sorgenti: circuiti con costanti di tempo molto più
brevi richiedono un passo più piccolo e ulteriori verifiche. Nessuna analisi fasoriale generale.
