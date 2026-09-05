// Calibración headless del prototipo: extrae el motor del HTML (los <script
// id="motor*">) y lo corre en Node. Una sola copia del código, cero deriva.
//
// Uso:  node prototipos/calibrar.cjs [partidos]

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'motor-partido.html'), 'utf8');
const bloques = [...html.matchAll(/<script id="motor\d*">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (bloques.length === 0) {
  console.error('No encontré los <script id="motor*"> en motor-partido.html');
  process.exit(1);
}
const ctx = { module: { exports: {} }, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(bloques.join('\n'), ctx);
const { simularPartido, simularBatch } = ctx.module.exports;

const N = Math.max(20, parseInt(process.argv[2], 10) || 300);
const base = {
  nombreNos: 'Barrio Sur', nombreEllos: 'Rival',
  nivelNos: 58, ataque: 'equipo', defensa: 'zona', defensaRival: 'hombre',
};

console.log(`Calibrando con ${N} partidos por nivel rival (nuestro nivel: ${base.nivelNos})\n`);
const res = simularBatch(base, [45, 55, 65, 75, 85, 95], N);

console.log('nivel rival | % vict | margen | nuestros pts | sus pts | |m|>=15 | |m|>=20 | peor | mejor');
console.log('------------|--------|--------|--------------|---------|---------|---------|------|------');
for (const f of res.filas) {
  console.log(
    `${String(f.nivel).padStart(11)} | ${`${(f.victorias * 100).toFixed(0)}%`.padStart(6)} | ` +
    `${f.margen.toFixed(1).padStart(6)} | ${f.ptsNos.toFixed(1).padStart(12)} | ${f.ptsEllos.toFixed(1).padStart(7)} | ` +
    `${`${(f.p15 * 100).toFixed(0)}%`.padStart(7)} | ${`${(f.p20 * 100).toFixed(0)}%`.padStart(7)} | ` +
    `${String(f.peor).padStart(4)} | ${String(f.mejor).padStart(5)}`
  );
}
console.log(`\nPuntos por equipo: media ${res.mediaPuntos.toFixed(1)} | p10 ${res.p10} | p90 ${res.p90} | min ${res.min} | max ${res.max}`);
console.log('Objetivo: media ~63, y que nivel 95 gane por ~20.\n');

// Perfil de tiro de un partido suelto, para ver que los porcentajes sean de básquet.
const g = simularPartido({ ...base, nivelEllos: 60, seed: 12345 });
for (const eq of [g.nos, g.ellos]) {
  let t2c = 0, t2i = 0, t3c = 0, t3i = 0, tlc = 0, tli = 0, ast = 0, per = 0, rebO = 0, rebD = 0, fal = 0;
  for (const j of eq.jugadores) {
    const b = eq.box[j.id];
    t2c += b.t2c; t2i += b.t2i; t3c += b.t3c; t3i += b.t3i; tlc += b.tlc; tli += b.tli;
    ast += b.ast; per += b.per; rebO += b.rebO; rebD += b.rebD; fal += b.fal;
  }
  const pc = (c, i) => (i ? `${((c / i) * 100).toFixed(1)}%` : '—');
  console.log(
    `${eq.nombre.padEnd(12)} ${eq.puntos} pts · T2 ${t2c}/${t2i} (${pc(t2c, t2i)}) · T3 ${t3c}/${t3i} (${pc(t3c, t3i)}) · ` +
    `TL ${tlc}/${tli} (${pc(tlc, tli)}) · AS ${ast} · PE ${per} · REB ${rebO}+${rebD} · FP ${fal} · cuartos ${eq.porCuarto.join('-')}`
  );
}
