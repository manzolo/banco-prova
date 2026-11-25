// Tutti i numeri del modello. Quelli marcati «regola» sono scelte del gioco: valori tipici di un multimetro da banco
// economico e di componenti comuni, non le specifiche di un modello preciso (docs/MODELLO.md dice quanto fidarsi).

/** Tensione termica a temperatura ambiente, in volt: kT/q a 300 K. */
export const VT = 0.025852;

/** Conduttanza minima verso massa di ogni nodo, in siemens: tiene risolvibile un nodo lasciato in aria. */
export const GMIN = 1e-12;

/** Un filo o un ponticello: un milliohm. */
export const WIRE_OHM = 0.001;

export const METER = {
  inputOhm: 10e6,                 // regola: resistenza d'ingresso del voltmetro (10 MΩ, tipica dei digitali)
  ohmsVolt: 0.6, ohmsSeriesOhm: 1000,     // regola: in ohm e continuità il multimetro applica 0,6 V attraverso 1 kΩ: troppo poco per aprire un diodo
  ohmsMax: 40e6,                  // oltre 40 MΩ il display dice OL
  continuityBeepOhm: 50,          // regola: il cicalino suona sotto i 50 Ω
  continuityMaxOhm: 400,
  diodeVolt: 3.0, diodeSeriesOhm: 2200,   // regola: nella prova diodi 3 V attraverso 2,2 kΩ, circa 1 mA
  diodeMaxVolt: 2.5,              // sopra, il display dice OL (un LED blu o bianco non si legge)
  shuntMaOhm: 1.2, fuseMaAmp: 0.4,        // boccola mA: 1,2 Ω fra shunt e fusibile, fusibile da 400 mA
  shuntAOhm: 0.02, fuseAAmp: 10,          // boccola 10 A
  liveOhmsVolt: 0.05,             // oltre 50 mV di tensione esterna la misura in ohm non vale
  capMinLeakOhm: 2e6,             // sotto, un condensatore «perde» troppo per misurarne la capacità
  counts: 4000,                   // display a 4000 punti
} as const;

/** Modelli dei diodi: corrente di saturazione (A), coefficiente di idealità, resistenza serie (Ω). Danno le cadute tipiche a 1 mA. */
export const DIODES = {
  '1N4148': { name: '1N4148 (segnale)', is: 4e-9, n: 1.9, rs: 0.6 },          // ≈ 0,61 V a 1 mA
  '1N4007': { name: '1N4007 (raddrizzatore)', is: 5e-9, n: 1.8, rs: 0.04 },    // ≈ 0,57 V a 1 mA
  schottky: { name: '1N5819 (Schottky)', is: 3e-6, n: 1.05, rs: 0.05 },        // ≈ 0,16 V a 1 mA
  'led-red': { name: 'LED rosso', is: 1e-18, n: 2.0, rs: 4 },                   // ≈ 1,79 V a 1 mA
  'led-green': { name: 'LED verde', is: 2e-21, n: 2.0, rs: 5 },                 // ≈ 2,11 V a 1 mA
  'led-blue': { name: 'LED blu', is: 1e-27, n: 2.0, rs: 8 },                    // ≈ 2,85 V a 1 mA: la prova diodi dice OL
  germanium: { name: 'OA90 (germanio)', is: 2e-6, n: 1.3, rs: 5 },             // ≈ 0,21 V a 1 mA
} as const;
export type DiodeModel = keyof typeof DIODES;

/** Rottura inversa (zener): ginocchio netto attorno alla tensione nominale. */
export const ZENER = { kneeAmp: 1e-3, slopeVolt: 0.04 } as const;

/** Giunzioni di un transistor bipolare al silicio viste con la prova diodi: la base-collettore cade un filo meno della base-emettitore. */
export const BJT = { be: { is: 2e-14, n: 1.0, rs: 2 }, bc: { is: 6e-14, n: 1.0, rs: 2 } } as const;   // ≈ 0,64 V e 0,61 V a 1 mA

/** Serie E12: i valori che esistono davvero in commercio. */
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82] as const;
export const BAND_COLORS = ['nero', 'marrone', 'rosso', 'arancio', 'giallo', 'verde', 'blu', 'viola', 'grigio', 'bianco'] as const;
export const TOLERANCE_COLORS: Record<number, string> = { 1: 'marrone', 2: 'rosso', 5: 'oro', 10: 'argento' };
