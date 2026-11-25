// Gli appunti: la teoria che serve per gli esercizi, in breve, con un esempio per ogni argomento. Scritti per questo
// gioco (non vengono da corsi o dispense di altri): si possono pubblicare con il resto, sotto licenza MIT.
export const APPUNTI_HTML = `
<h2>Appunti</h2>
<p>La teoria che serve per gli esercizi, in poche righe per argomento. Ogni paragrafo ha un esempio da rifare a mano e poi sul banco.</p>
<nav class="indice-appunti"><a href="#a-ohm">Ohm</a> · <a href="#a-serie">Serie e parallelo</a> · <a href="#a-colori">Codici</a> · <a href="#a-cond">Condensatori</a> · <a href="#a-bobine">Bobine</a> · <a href="#a-diodi">Diodi</a> · <a href="#a-transistor">Transistor</a> · <a href="#a-multimetro">Multimetro</a> · <a href="#a-alternata">Alternata</a> · <a href="#a-alimentatore">Alimentatore</a></nav>

<h3 id="a-ohm">Tensione, corrente, resistenza</h3>
<p>La <b>tensione</b> (volt, V) è la spinta; la <b>corrente</b> (ampere, A) è quanta carica passa ogni secondo; la <b>resistenza</b> (ohm, Ω) è quanto il pezzo si oppone. Le lega la legge di Ohm, e la potenza dice quanto scalda.</p>
<div class="formula">V = R · I &nbsp;&nbsp; I = V / R &nbsp;&nbsp; P = V · I = R · I²</div>
<p class="es"><b>Esempio.</b> 9 V su 1 kΩ: I = 9 / 1000 = 9 mA; P = 9 · 0,009 = 81 mW. Una resistenza da ¼ W basta.</p>

<h3 id="a-serie">Serie, parallelo, partitore</h3>
<p>In <b>serie</b> la corrente è la stessa in tutti i pezzi e le resistenze si sommano. In <b>parallelo</b> la tensione è la stessa e il totale è sempre più piccolo della resistenza più piccola. Due resistenze in serie fanno un <b>partitore</b>: la tensione si divide in proporzione.</p>
<div class="formula">serie: R = R₁ + R₂ &nbsp;&nbsp; parallelo: R = R₁ · R₂ / (R₁ + R₂) &nbsp;&nbsp; partitore: V₂ = V · R₂ / (R₁ + R₂)</div>
<p class="es"><b>Esempio.</b> 2,2 kΩ e 3,3 kΩ in parallelo: 2,2 · 3,3 / 5,5 = 1,32 kΩ. Con 1 kΩ in serie: 2,32 kΩ. Con 9 V su 1 kΩ + 2 kΩ, sui 2 kΩ cadono 6 V.</p>

<h3 id="a-colori">Leggere i componenti</h3>
<p><b>Resistenze</b>: quattro bande, con la tolleranza (spesso oro) a destra. Prima e seconda banda sono cifre, la terza dice quanti zeri. Nero 0, marrone 1, rosso 2, arancio 3, giallo 4, verde 5, blu 6, viola 7, grigio 8, bianco 9; oro come terza banda vuol dire «diviso 10». I valori in commercio sono quelli della serie E12: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 e i loro multipli.</p>
<p><b>Condensatori ceramici</b>: tre cifre in picofarad, le prime due più tanti zeri quanti dice la terza. <b>Tolleranza</b>: il pezzo vero può scostarsi dal nominale di quella percentuale, ed è normale che il multimetro non legga il numero tondo.</p>
<p class="es"><b>Esempio.</b> Marrone, nero, arancio, oro: 1 e 0, più tre zeri: 10 000 Ω = 10 kΩ, ±5%, quindi va bene fra 9,5 e 10,5 kΩ. «473» su un ceramico: 47 000 pF = 47 nF.</p>

<h3 id="a-cond">Condensatori</h3>
<p>Un condensatore accumula carica: in continua, una volta carico, <b>non fa passare corrente</b>. Attraverso una resistenza si carica con un ritmo dato dalla <b>costante di tempo</b>: dopo τ è al 63%, dopo 5τ è carico. Gli <b>elettrolitici</b> hanno un verso (la striscia è il negativo) e invecchiando si seccano: perdono capacità, oppure perdono corrente.</p>
<div class="formula">τ = R · C &nbsp;&nbsp; Q = C · V</div>
<p class="es"><b>Esempio.</b> 1000 µF caricati attraverso 1 kΩ: τ = 1000 · 0,001 = 1 s. Sotto l'ohmetro la lettura sale da sola per qualche secondo, poi va fuori scala: è il condensatore che si carica.</p>

<h3 id="a-bobine">Bobine</h3>
<p>Una bobina si oppone ai <b>cambiamenti</b> di corrente. In continua è solo il suo filo: pochi ohm. Il multimetro la prova a continuità (se è interrotta tace) ma non ne misura l'induttanza, che si misura con un LCR-metro.</p>

<h3 id="a-diodi">Diodi, LED, zener</h3>
<p>Il diodo fa passare la corrente in un verso solo, dall'<b>anodo</b> al <b>catodo</b> (la fascia sul corpo). In conduzione ha ai capi una caduta quasi fissa: 0,6–0,7 V il silicio, 0,2–0,3 V lo Schottky, 1,8–3 V i LED secondo il colore. Un <b>LED</b> va sempre con una resistenza in serie, che decide la corrente. Lo <b>zener</b>, montato al contrario, tiene ai suoi capi la sua tensione: è lo stabilizzatore più semplice.</p>
<div class="formula">resistenza del LED: R = (V − V_LED) / I</div>
<p class="es"><b>Esempio.</b> LED rosso (1,9 V) a 15 mA da una pila da 9 V: R = (9 − 1,9) / 0,015 = 473 Ω: si mette la più vicina, 470 Ω.</p>

<h3 id="a-transistor">Transistor</h3>
<p>Col multimetro un transistor bipolare si vede come <b>due diodi che partono dalla base</b>. NPN: conduce col puntale rosso sulla base verso collettore ed emettitore; PNP: col nero sulla base. Fra collettore ed emettitore, in nessun verso. La giunzione base-emettitore cade un filo più della base-collettore: così si distinguono.</p>

<h3 id="a-multimetro">Usare il multimetro</h3>
<ul>
<li><b>Tensione</b>: in parallelo, sul circuito acceso. Il nero sul riferimento (la massa), il rosso sul punto da misurare. Se il numero è negativo, i puntali sono invertiti.</li>
<li><b>Corrente</b>: in <b>serie</b>. Si apre il circuito, si sposta il rosso nella boccola della corrente e lo strumento fa da ponte. Mai in parallelo a un generatore: è un cortocircuito, e salta il fusibile. Finito, il rosso torna in VΩ.</li>
<li><b>Resistenza, continuità, diodi, capacità</b>: solo a <b>circuito spento</b>, e meglio col pezzo staccato: in circuito si legge anche tutto ciò che gli sta in parallelo. I condensatori si scaricano prima.</li>
<li><b>Pile</b>: si giudicano sotto carico. A vuoto anche una pila scarica segna quasi la sua tensione.</li>
</ul>

<h3 id="a-alternata">Alternata e oscilloscopio</h3>
<p>Una tensione <b>alternata</b> cambia verso di continuo; quella di rete e dei trasformatori fa 50 cicli al secondo (50 Hz). Il multimetro in V~ legge il <b>valore efficace</b>, quello che scalda una resistenza quanto la continua dello stesso valore. La cresta, il <b>picco</b>, è √2 volte più alta. In continua (V⎓) un'alternata legge zero.</p>
<div class="formula">V_picco = √2 · V_eff ≈ 1,414 · V_eff &nbsp;&nbsp; f = 1 / T</div>
<p>L'<b>oscilloscopio</b> disegna la tensione nel tempo. In verticale si contano le divisioni e si moltiplicano per V/div; in orizzontale per tempo/div. DC mostra tutto il segnale, AC toglie la media per vedere ingrandita una piccola ondulazione. Le masse delle sonde sono in comune: vanno sullo stesso punto.</p>
<p class="es"><b>Esempio.</b> Una sinusoide con la cresta a 3,4 divisioni sopra lo zero, a 5 V/div: picco 17 V, efficace 17 / 1,414 = 12 V. Un periodo lungo 4 divisioni a 5 ms/div: T = 20 ms, f = 50 Hz.</p>

<h3 id="a-alimentatore">Dall'alternata alla continua</h3>
<p>Un <b>diodo</b> lascia passare una sola semionda; un <b>ponte</b> di quattro diodi le raddrizza tutte e due (due diodi conducono alla volta, quindi si perdono due cadute). Il <b>condensatore di filtro</b> si carica sulle creste e alimenta il carico fra una e l'altra: resta un'<b>ondulazione</b> (ripple), tanto più piccola quanto più grande è il condensatore e quanto meno corrente si chiede.</p>
<div class="formula">ripple ≈ I / (2 · f · C) &nbsp;&nbsp; (ponte, stima per eccesso)</div>
<p class="es"><b>Esempio.</b> Secondario da 12 V: picco 17 V; meno due diodi, circa 15 V sul condensatore. Con 470 Ω di carico (32 mA) e 470 µF: ripple ≈ 0,032 / (2 · 50 · 0,00047) = 0,68 V. Sul banco ne misuri un po' meno: la formula suppone che il condensatore si scarichi per tutti i 10 ms.</p>
<p class="piccolo">Appunti scritti per questo gioco. Le formule sono quelle dei manuali di elettrotecnica; i valori tipici (cadute dei diodi, fattori dei trasformatori) sono valori comuni, non specifiche di un componente preciso.</p>
`;

export const APPUNTI_HTML_EN = `
<h2>Notes</h2>
<p>The theory you need for the exercises, a few lines per topic. Each section has an example to work out by hand and then on the bench.</p>
<nav class="indice-appunti"><a href="#a-ohm">Ohm</a> · <a href="#a-serie">Series and parallel</a> · <a href="#a-colori">Codes</a> · <a href="#a-cond">Capacitors</a> · <a href="#a-bobine">Inductors</a> · <a href="#a-diodi">Diodes</a> · <a href="#a-transistor">Transistors</a> · <a href="#a-multimetro">Multimeter</a> · <a href="#a-alternata">AC</a> · <a href="#a-alimentatore">Power supply</a></nav>

<h3 id="a-ohm">Voltage, current, resistance</h3>
<p><b>Voltage</b> (volts, V) is the push; <b>current</b> (amperes, A) is how much charge flows each second; <b>resistance</b> (ohms, Ω) is how much the part opposes it. Ohm's law ties them together, and power tells you how hot it gets.</p>
<div class="formula">V = R · I &nbsp;&nbsp; I = V / R &nbsp;&nbsp; P = V · I = R · I²</div>
<p class="es"><b>Example.</b> 9 V across 1 kΩ: I = 9 / 1000 = 9 mA; P = 9 · 0.009 = 81 mW. A ¼ W resistor is enough.</p>

<h3 id="a-serie">Series, parallel, voltage divider</h3>
<p>In <b>series</b> the current is the same through every part and the resistances add up. In <b>parallel</b> the voltage is the same and the total is always smaller than the smallest resistance. Two resistors in series make a <b>divider</b>: the voltage splits in proportion.</p>
<div class="formula">series: R = R₁ + R₂ &nbsp;&nbsp; parallel: R = R₁ · R₂ / (R₁ + R₂) &nbsp;&nbsp; divider: V₂ = V · R₂ / (R₁ + R₂)</div>
<p class="es"><b>Example.</b> 2.2 kΩ and 3.3 kΩ in parallel: 2.2 · 3.3 / 5.5 = 1.32 kΩ. With 1 kΩ in series: 2.32 kΩ. With 9 V across 1 kΩ + 2 kΩ, the 2 kΩ gets 6 V.</p>

<h3 id="a-colori">Reading the parts</h3>
<p><b>Resistors</b>: four bands, with the tolerance band (often gold) on the right. The first and second bands are digits, the third says how many zeros. Black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9; gold as third band means "divide by 10". The values on sale are the E12 series: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 and their multiples.</p>
<p><b>Ceramic capacitors</b>: three digits in picofarads, the first two plus as many zeros as the third says. <b>Tolerance</b>: the real part may differ from the nominal by that percentage, so it is normal for the meter not to read the round number.</p>
<p class="es"><b>Example.</b> Brown, black, orange, gold: 1 and 0, plus three zeros: 10000 Ω = 10 kΩ, ±5%, so anything between 9.5 and 10.5 kΩ is fine. "473" on a ceramic: 47000 pF = 47 nF.</p>

<h3 id="a-cond">Capacitors</h3>
<p>A capacitor stores charge: in DC, once charged, <b>no current flows</b>. Through a resistor it charges at a pace set by the <b>time constant</b>: after τ it is at 63%, after 5τ it is full. <b>Electrolytics</b> have a polarity (the stripe is negative) and dry out with age: they lose capacitance, or they leak.</p>
<div class="formula">τ = R · C &nbsp;&nbsp; Q = C · V</div>
<p class="es"><b>Example.</b> 1000 µF charged through 1 kΩ: τ = 1000 · 0.001 = 1 s. Under the ohmmeter the reading climbs by itself for a few seconds, then goes over range: that is the capacitor charging.</p>

<h3 id="a-bobine">Inductors</h3>
<p>An inductor opposes <b>changes</b> in current. In DC it is just its wire: a few ohms. The multimeter checks it with continuity (if it is open it stays silent) but cannot measure its inductance, which needs an LCR meter.</p>

<h3 id="a-diodi">Diodes, LEDs, zeners</h3>
<p>A diode lets current through one way only, from <b>anode</b> to <b>cathode</b> (the band on the body). When conducting it has an almost fixed drop: 0.6–0.7 V for silicon, 0.2–0.3 V for Schottky, 1.8–3 V for LEDs depending on colour. An <b>LED</b> always needs a series resistor, which sets the current. A <b>zener</b>, fitted reversed, holds its own voltage across it: the simplest regulator.</p>
<div class="formula">LED resistor: R = (V − V_LED) / I</div>
<p class="es"><b>Example.</b> Red LED (1.9 V) at 15 mA from a 9 V battery: R = (9 − 1.9) / 0.015 = 473 Ω: use the nearest value, 470 Ω.</p>

<h3 id="a-transistor">Transistors</h3>
<p>Seen with a multimeter, a bipolar transistor is <b>two diodes starting from the base</b>. NPN: it conducts with the red lead on the base towards collector and emitter; PNP: with the black lead on the base. Between collector and emitter it conducts in neither direction. The base-emitter junction drops a little more than the base-collector one: that is how you tell them apart.</p>

<h3 id="a-multimetro">Using the multimeter</h3>
<ul>
<li><b>Voltage</b>: in parallel, with the circuit powered. Black on the reference (ground), red on the point to measure. A negative number means the leads are swapped.</li>
<li><b>Current</b>: in <b>series</b>. Open the circuit, move the red lead to the current jack and let the meter bridge the gap. Never across a source: it is a short circuit and the fuse blows. When done, put the red lead back in VΩ.</li>
<li><b>Resistance, continuity, diodes, capacitance</b>: with the <b>power off</b> only, and preferably with the part removed: in circuit you also read everything in parallel with it. Discharge capacitors first.</li>
<li><b>Batteries</b>: judge them under load. With no load even a flat battery shows almost its full voltage.</li>
</ul>

<h3 id="a-alternata">AC and the oscilloscope</h3>
<p>An <b>alternating</b> voltage keeps reversing; mains and transformers run at 50 cycles per second (50 Hz). The multimeter on V~ reads the <b>RMS value</b>, the one that heats a resistor as much as the same DC voltage would. The crest, the <b>peak</b>, is √2 times higher. On DC (V⎓) an AC voltage reads zero.</p>
<div class="formula">V_peak = √2 · V_rms ≈ 1.414 · V_rms &nbsp;&nbsp; f = 1 / T</div>
<p>The <b>oscilloscope</b> draws voltage against time. Vertically, count the divisions and multiply by V/div; horizontally, by time/div. DC shows the whole signal, AC removes the average to magnify a small ripple. The probe grounds are common: they go on the same point.</p>
<p class="es"><b>Example.</b> A sine wave with its crest 3.4 divisions above zero, at 5 V/div: peak 17 V, RMS 17 / 1.414 = 12 V. A period 4 divisions long at 5 ms/div: T = 20 ms, f = 50 Hz.</p>

<h3 id="a-alimentatore">From AC to DC</h3>
<p>A <b>diode</b> lets one half wave through; a <b>bridge</b> of four diodes rectifies both (two diodes conduct at a time, so you lose two drops). The <b>filter capacitor</b> charges on the crests and feeds the load in between: a <b>ripple</b> remains, smaller the bigger the capacitor and the less current you draw.</p>
<div class="formula">ripple ≈ I / (2 · f · C) &nbsp;&nbsp; (bridge, an overestimate)</div>
<p class="es"><b>Example.</b> 12 V secondary: 17 V peak; minus two diodes, about 15 V on the capacitor. With a 470 Ω load (32 mA) and 470 µF: ripple ≈ 0.032 / (2 · 50 · 0.00047) = 0.68 V. On the bench you measure a little less: the formula assumes the capacitor discharges for the whole 10 ms.</p>
<p class="piccolo">Notes written for this game. The formulas are the textbook ones; typical values (diode drops, transformer factors) are common values, not the specs of a particular part.</p>
`;
