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
