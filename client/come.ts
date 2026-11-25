// La pagina «come funziona»: cosa fa davvero il multimetro simulato, e cosa il simulatore non fa.
export const COME_HTML = `
<h2>Come funziona</h2>
<p>Qui non c'è una tabella di risposte: c'è un piccolo <b>risolutore di circuiti</b>. Il multimetro e l’oscilloscopio non «sanno» quanto vale un componente: entrano nel circuito come pezzi in più e mostrano quello che ne risulta. Per questo gli errori veri hanno le conseguenze vere.</p>

<h3>Che cosa mette in circuito il multimetro</h3>
<ul>
<li><b>Voltmetro (V⎓, V~)</b>: una resistenza da 10 MΩ fra i puntali. Su un punto ad alta resistenza legge meno del vero, perché lo carica.</li>
<li><b>Ohmetro e continuità (Ω, ·)))</b>: un generatore debole, 0,6 V attraverso 1 kΩ. Legge il rapporto fra tensione e corrente. Il cicalino suona sotto i 50 Ω. Con 0,6 V un diodo non si apre: per i diodi c'è la sua posizione.</li>
<li><b>Prova diodi (▶|)</b>: 3 V attraverso 2,2 kΩ, circa 1 mA. Mostra la caduta di tensione; oltre 2,5 V scrive OL.</li>
<li><b>Capacità (⊣⊢)</b>: somma i condensatori che stanno fra i puntali, se non c'è una via in continua che li scarica.</li>
<li><b>Amperometro (mA, 10 A)</b>: uno shunt, cioè quasi un filo: 1,2 Ω nella boccola mA (fusibile da 400 mA), 0,02 Ω nella boccola 10 A (fusibile da 10 A). È nel circuito <b>appena il puntale rosso sta in quella boccola</b>, qualunque cosa dica il selettore. In alternata la soglia del fusibile viene controllata a ogni passo: lo scatto è istantaneo sul picco, senza un modello termico.</li>
</ul>

<h3>Alternata e oscilloscopio</h3>
<p>Il generatore alternato produce una sinusoide: v(t) = √2 · Veff · sin(2πft), normalmente a 50 Hz. Il picco vale √2 volte il valore efficace. Il circuito si risolve nel tempo a passi di massimo 0,1 ms, con almeno 128 passi per periodo. I condensatori ricordano la carica: qui il ponte raddrizzatore e il filtro funzionano davvero attraverso le correnti calcolate.</p>
<p><b>Due canali da 1 MΩ</b>, ognuno fra la sua sonda e la sua massa. Sono ingressi differenziali isolati: le due masse non sono collegate fra loro, a differenza delle masse comuni di molti oscilloscopi da banco. Anche il multimetro collegato nello stesso momento carica il circuito.</p>
<p>Il reticolo ha <b>10 × 8 divisioni</b>. V/div e ms/div stabiliscono le scale; DC mostra tutto il segnale, AC centra la traccia togliendo la media della registrazione. È un accoppiamento ideale, senza il condensatore e la banda passante dello strumento reale. Il trigger aggancia il fronte di salita al livello scelto; se non lo trova lo schermo dichiara «corsa libera». Le misure numeriche usano il segnale completo prima dell’accoppiamento: minimo, massimo, picco-picco, efficace AC e periodo.</p>
<p><b>V⎓ legge la media; V~ l’efficace della componente alternata</b>, calcolato dai campioni con il suo ingresso da 10 MΩ. Su una sinusoide coincide con Vpicco/√2. Sul filtro legge l’efficace dell’ondulazione, non la tensione totale. La finestra copre un periodo della sorgente più lenta; con frequenze diverse non commensurabili è solo una stima su quella finestra.</p>
<p>Il ponte contiene quattro diodi, due in conduzione per semiperiodo: il filtro si ricarica a 100 Hz con ingresso a 50 Hz. Fra le creste il condensatore alimenta il carico. Il <b>ripple</b> è massimo meno minimo; per piccole ondulazioni ΔV ≈ I/(2fC). Capacità doppia riduce il ripple; resistenza dimezzata aumenta il carico e il ripple. Dopo ogni cambio aspetta il nuovo regime. La sostituzione ideale della capacità conserva la tensione, non la carica.</p>

<h3>Gli errori che qui si possono fare senza danni</h3>
<ul>
<li>Lasciare il puntale rosso nella boccola mA e misurare una tensione: cortocircuito sul generatore, fusibile saltato.</li>
<li>Misurare gli ohm su un circuito acceso: la lettura non vale. Una sorgente alternata nella scena fa segnalare circuito acceso anche quando passa per zero.</li>
<li>Giudicare una pila a vuoto: quella scarica sembra buona finché non le si chiede corrente.</li>
<li>Misurare una tensione alternata col selettore sulla continua: zero, anche se la tensione c'è.</li>
</ul>

<h3>Come sono fatti i componenti</h3>
<ul>
<li><b>Resistenze</b>: il valore vero sta dentro la tolleranza, non è mai identico al nominale. Guasti: interrotta, oppure salita di valore.</li>
<li><b>Diodi, LED, zener</b>: la curva vera corrente-tensione (equazione di Shockley), con parametri scelti per dare le cadute tipiche a 1 mA: silicio 0,6 V, Schottky 0,2 V, LED rosso 1,8 V, verde 2,1 V, blu 2,9 V.</li>
<li><b>Condensatori</b>: in continua sono aperti; attraverso l'ohmetro si caricano col loro tempo (resistenza per capacità), ed è per questo che la lettura sale da sola.</li>
<li><b>Bobine</b>: in continua sono il loro filo, pochi ohm. L'induttanza col multimetro non si misura.</li>
<li><b>Transistor</b>: visti col multimetro sono due giunzioni che partono dalla base. Il simulatore non li fa amplificare.</li>
<li><b>Pile</b>: scaricandosi la tensione a vuoto cala poco, la resistenza interna cresce molto.</li>
</ul>

<h3>Che cosa non c'è</h3>
<ul>
<li>Continua e alternata nel tempo con resistenze, diodi e condensatori. Le bobine restano soltanto la resistenza del filo: niente transitori induttivi. Mancano ESR dei condensatori, recupero inverso dei diodi, rumore e dettagli molto più veloci del passo di calcolo. Il generatore regolabile nel cassetto resta da aggiungere.</li>
<li>I numeri del multimetro (10 MΩ, 0,6 V, 50 Ω, i fusibili) sono valori tipici di uno strumento economico, non quelli di un modello preciso. Il tuo può suonare a 30 Ω o provare i diodi a 2 V.</li>
<li>Niente tensioni pericolose: qui si lavora con pile e secondari isolati a bassa tensione. <b>Sulla rete a 230 V queste prove non si improvvisano.</b></li>
</ul>
<p class="piccolo">Suoni sintetizzati. Niente dati lasciano il tuo browser: il salvataggio sta qui.</p>
`;

/** La stessa pagina in inglese. */
export const COME_HTML_EN = `
<h2>How it works</h2>
<p>There is no answer table here: there is a small <b>circuit solver</b>. The multimeter and the oscilloscope do not "know" a component's value: they join the circuit as extra parts and show what comes out. That is why real mistakes have real consequences.</p>

<h3>What the multimeter puts into the circuit</h3>
<ul>
<li><b>Voltmeter (V⎓, V~)</b>: a 10 MΩ resistance between the leads. On a high-resistance point it reads low, because it loads it.</li>
<li><b>Ohmmeter and continuity (Ω, ·)))</b>: a weak source, 0.6 V through 1 kΩ. It reads the ratio of voltage to current. The beeper sounds below 50 Ω. 0.6 V does not turn a diode on: diodes have their own position.</li>
<li><b>Diode test (▶|)</b>: 3 V through 2.2 kΩ, about 1 mA. It shows the voltage drop; above 2.5 V it shows OL.</li>
<li><b>Capacitance (⊣⊢)</b>: adds up the capacitors between the leads, if there is no DC path discharging them.</li>
<li><b>Ammeter (mA, 10 A)</b>: a shunt, almost a wire: 1.2 Ω in the mA jack (400 mA fuse), 0.02 Ω in the 10 A jack (10 A fuse). It is in the circuit <b>as soon as the red lead sits in that jack</b>, whatever the dial says. With AC the fuse limit is checked at every step: it trips instantly on the peak, with no thermal model.</li>
</ul>

<h3>AC and the oscilloscope</h3>
<p>The AC source produces a sine wave: v(t) = √2 · Vrms · sin(2πft), normally at 50 Hz. The peak is √2 times the RMS value. The circuit is solved in time with steps of at most 0.1 ms, at least 128 per period. Capacitors remember their charge: here the bridge rectifier and the filter really work through the computed currents.</p>
<p><b>Two 1 MΩ channels</b>, each between its probe and its ground. They are isolated differential inputs: the two grounds are not connected to each other, unlike the common grounds of many bench scopes. A multimeter connected at the same time also loads the circuit.</p>
<p>The graticule has <b>10 × 8 divisions</b>. V/div and ms/div set the scales; DC shows the whole signal, AC centres the trace by removing the average of the record. It is an ideal coupling, without the capacitor and bandwidth of a real instrument. The trigger locks onto the rising edge at the chosen level; if it finds none the screen says "free running". The numeric readouts use the whole signal before coupling: minimum, maximum, peak-to-peak, AC RMS and period.</p>
<p><b>V⎓ reads the average; V~ the RMS of the AC component</b>, computed from the samples with its 10 MΩ input. On a sine wave it equals Vpeak/√2. On the filter it reads the RMS of the ripple, not the total voltage.</p>
<p>The bridge has four diodes, two conducting in each half cycle: the filter is recharged at 100 Hz from a 50 Hz input. Between the peaks the capacitor feeds the load. <b>Ripple</b> is maximum minus minimum; for small ripple ΔV ≈ I/(2fC). Double capacitance reduces ripple; half the resistance draws more current and increases it. After each change wait for the new steady state.</p>

<h3>Mistakes you can make here without damage</h3>
<ul>
<li>Leaving the red lead in the mA jack and measuring a voltage: short circuit across the source, blown fuse.</li>
<li>Measuring ohms on a live circuit: the reading is not valid. An AC source in the scene makes the circuit count as live even when it crosses zero.</li>
<li>Judging a battery with no load: a flat one looks fine until you ask it for current.</li>
<li>Measuring an AC voltage with the dial on DC: zero, even though the voltage is there.</li>
</ul>

<h3>How the parts are made</h3>
<ul>
<li><b>Resistors</b>: the true value lies within the tolerance, never exactly the nominal. Faults: open, or drifted up.</li>
<li><b>Diodes, LEDs, zeners</b>: the real current-voltage curve (Shockley equation), with parameters chosen to give typical drops at 1 mA: silicon 0.6 V, Schottky 0.2 V, red LED 1.8 V, green 2.1 V, blue 2.9 V.</li>
<li><b>Capacitors</b>: open in DC; through the ohmmeter they charge with their own time constant (resistance times capacitance), which is why the reading climbs by itself.</li>
<li><b>Inductors</b>: in DC they are their wire, a few ohms. Inductance cannot be measured with a multimeter.</li>
<li><b>Transistors</b>: seen by the multimeter they are two junctions starting from the base. The simulator does not make them amplify.</li>
<li><b>Batteries</b>: as they run down the open-circuit voltage drops a little, the internal resistance grows a lot.</li>
</ul>

<h3>What is not here</h3>
<ul>
<li>DC and AC in time with resistors, diodes and capacitors. Inductors remain just the resistance of their wire: no inductive transients. No capacitor ESR, no diode reverse recovery, no noise, nothing much faster than the calculation step.</li>
<li>The multimeter figures (10 MΩ, 0.6 V, 50 Ω, the fuses) are typical of a cheap instrument, not of a specific model. Yours may beep at 30 Ω or test diodes at 2 V.</li>
<li>No dangerous voltages: here you work with batteries and low-voltage isolated secondaries. <b>Do not improvise these tests on 230 V mains.</b></li>
</ul>
<p class="piccolo">Synthesised sounds. No data leaves your browser: progress is saved here.</p>
`;
