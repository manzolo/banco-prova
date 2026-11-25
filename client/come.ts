// La pagina «come funziona»: cosa fa davvero il multimetro simulato, e cosa il simulatore non fa.
export const COME_HTML = `
<h2>Come funziona</h2>
<p>Qui non c'è una tabella di risposte: c'è un piccolo <b>risolutore di circuiti</b>. Il multimetro non «sa» quanto vale un componente: entra nel circuito come un pezzo in più e mostra quello che ne risulta. Per questo gli errori veri hanno le conseguenze vere.</p>

<h3>Che cosa mette in circuito il multimetro</h3>
<ul>
<li><b>Voltmetro (V⎓, V~)</b>: una resistenza da 10 MΩ fra i puntali. Su un punto ad alta resistenza legge meno del vero, perché lo carica.</li>
<li><b>Ohmetro e continuità (Ω, ·)))</b>: un generatore debole, 0,6 V attraverso 1 kΩ. Legge il rapporto fra tensione e corrente. Il cicalino suona sotto i 50 Ω. Con 0,6 V un diodo non si apre: per i diodi c'è la sua posizione.</li>
<li><b>Prova diodi (▶|)</b>: 3 V attraverso 2,2 kΩ, circa 1 mA. Mostra la caduta di tensione; oltre 2,5 V scrive OL.</li>
<li><b>Capacità (⊣⊢)</b>: somma i condensatori che stanno fra i puntali, se non c'è una via in continua che li scarica.</li>
<li><b>Amperometro (mA, 10 A)</b>: uno shunt, cioè quasi un filo: 1,2 Ω nella boccola mA (fusibile da 400 mA), 0,02 Ω nella boccola 10 A (fusibile da 10 A). È nel circuito <b>appena il puntale rosso sta in quella boccola</b>, qualunque cosa dica il selettore.</li>
</ul>

<h3>Gli errori che qui si possono fare senza danni</h3>
<ul>
<li>Lasciare il puntale rosso nella boccola mA e misurare una tensione: cortocircuito sul generatore, fusibile saltato.</li>
<li>Misurare gli ohm su un circuito acceso: la lettura non vale.</li>
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
<li>Solo continua, più le tensioni alternate lette col loro valore efficace: niente frequenza, niente oscilloscopio, niente reattanze.</li>
<li>I numeri del multimetro (10 MΩ, 0,6 V, 50 Ω, i fusibili) sono valori tipici di uno strumento economico, non quelli di un modello preciso. Il tuo può suonare a 30 Ω o provare i diodi a 2 V.</li>
<li>Niente tensioni pericolose: qui si lavora a 9 V. <b>Sulla rete a 230 V queste prove non si improvvisano.</b></li>
</ul>
<p class="piccolo">Suoni sintetizzati. Niente dati lasciano il tuo browser: il salvataggio sta qui.</p>
`;
