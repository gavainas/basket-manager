// Generador de cards del design system para el proyecto "Basket Manager UI"
// de Claude Design (claude.ai/design).
//
// Qué hace:
//   - Lee src/styles.css (la única fuente de verdad de los estilos del juego).
//   - Genera una card HTML autocontenida por cada entrada de CARDS, con el CSS
//     real del juego inyectado inline y un marcador @dsCard en la primera línea.
//
// Qué genera y sobrescribe:
//   - Escribe TODO en design/cards/ (carpeta ignorada por git; ver .gitignore).
//     Cada corrida sobrescribe los HTML de esa carpeta. No toca ningún otro
//     archivo del repo ni sube nada a ningún servicio.
//
// Cómo se sube a Claude Design:
//   - La subida la hace Claude con la herramienta DesignSync leyendo design/cards/.
//     En una sesión de Claude Code: "sincronizá el design system".
//
// Uso: npm run design:sync

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_PATH = join(ROOT, 'src', 'styles.css');
const OUT = join(ROOT, 'design', 'cards');

const css = readFileSync(CSS_PATH, 'utf8');

const page = (group, name, title, extra, body) => `<!-- @dsCard group="${group}" name="${name}" -->
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${css}
</style>
<style>
body { padding: 18px; }
${extra}
</style>
</head>
<body>
${body}
</body>
</html>
`;

const bar = (label, value) => {
  const cls = value >= 65 ? 'good' : value >= 40 ? 'warn' : 'bad';
  return `<div class="bar-row">
  <span class="bar-label">${label}</span>
  <div class="bar-track"><div class="bar-fill ${cls}" style="width:${value}%"></div></div>
  <span class="bar-value">${value}</span>
</div>`;
};

const swatch = (token, hex, label) => `<div class="sw">
  <div class="sw-color" style="background:${hex}"></div>
  <div class="sw-meta"><strong>${label}</strong><code>${token}</code><code>${hex}</code></div>
</div>`;

const CARDS = [
  {
    path: 'foundations/colores.html',
    group: 'Fundamentos',
    name: 'Paleta de colores',
    extra: `.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:0.8rem;}
.sw{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
.sw-color{height:64px;border-bottom:1px solid var(--border);}
.sw-meta{padding:0.5rem 0.7rem;font-size:0.78rem;display:flex;flex-direction:column;gap:0.1rem;}
.sw-meta code{color:var(--text-dim);font-size:0.72rem;}`,
    body: `<h2>Paleta</h2>
<p class="muted">Tokens definidos en <code>src/styles.css</code> (<code>:root</code>). Tema oscuro único.</p>
<div class="sw-grid">
${swatch('--bg', '#0e141f', 'Fondo')}
${swatch('--bg-soft', '#16202e', 'Fondo suave')}
${swatch('--panel', '#1b2739', 'Panel')}
${swatch('--panel-2', '#223148', 'Panel 2')}
${swatch('--border', '#2d3f5a', 'Borde')}
${swatch('--text', '#e8eef7', 'Texto')}
${swatch('--text-dim', '#93a5bf', 'Texto secundario')}
${swatch('--accent', '#f08c2e', 'Acento (naranja básquet)')}
${swatch('--good', '#3ddc84', 'Positivo')}
${swatch('--warn', '#f2c14e', 'Alerta')}
${swatch('--bad', '#ff5d5d', 'Negativo')}
</div>`,
  },
  {
    path: 'foundations/tipografia.html',
    group: 'Fundamentos',
    name: 'Tipografía',
    extra: '',
    body: `<h2>Tipografía</h2>
<p class="muted">Segoe UI / system-ui. Números tabulares para stats y marcadores.</p>
<div class="card">
  <h1>Club Atlético Sur — h1</h1>
  <h2>Temporada 3, Semana 12 — h2</h2>
  <h3>Título de card (uppercase dim) — h3</h3>
  <p>Texto de cuerpo: el equipo llega motivado al clásico después de dos victorias seguidas.</p>
  <p class="muted">Texto secundario (.muted): notas, ayudas y contexto.</p>
  <p style="font-variant-numeric:tabular-nums;font-weight:800;font-size:1.6rem;">84 – 79</p>
</div>`,
  },
  {
    path: 'components/botones.html',
    group: 'Componentes',
    name: 'Botones y tabs',
    extra: '.row{display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1.2rem;}',
    body: `<h2>Botones</h2>
<div class="row">
  <button>Normal</button>
  <button class="primary">Primario</button>
  <button class="danger">Peligro</button>
  <button disabled>Deshabilitado</button>
</div>
<h2>Tabs de navegación</h2>
<div class="tabs">
  <button class="active">Semana</button>
  <button>Plantel</button>
  <button class="attention">Finanzas</button>
  <button>Liga</button>
  <button>Calendario</button>
</div>
<h2>Pasos de la semana</h2>
<div class="steps">
  <span class="step done">Entrenamiento</span>
  <span class="step active">Convocatoria</span>
  <span class="step">Partido</span>
  <span class="step">Resumen</span>
</div>`,
  },
  {
    path: 'components/chips.html',
    group: 'Componentes',
    name: 'Chips de estado',
    extra: '.row{display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:1rem;}',
    body: `<h2>Chips</h2>
<p class="muted">Estados de jugadores, cuotas y roles.</p>
<div class="row">
  <span class="chip">Neutral</span>
  <span class="chip good">En forma</span>
  <span class="chip warn">Cuota atrasada</span>
  <span class="chip bad">Lesionado</span>
  <span class="chip accent">Titular</span>
  <span class="chip rotation-chip">Rotación</span>
  <span class="chip accent">⭐ MVP ×2</span>
</div>`,
  },
  {
    path: 'components/barras.html',
    group: 'Componentes',
    name: 'Barras de atributos',
    extra: 'body{max-width:420px;}',
    body: `<h2>Barras</h2>
<p class="muted">Verde ≥ 65, amarillo ≥ 40, rojo &lt; 40. Ancho animado.</p>
<div class="card">
${bar('Físico', 78)}
${bar('Motivación', 52)}
${bar('Compromiso', 31)}
${bar('Afinidad social', 66)}
</div>`,
  },
  {
    path: 'components/stat-tiles.html',
    group: 'Componentes',
    name: 'Tiles de estadísticas',
    extra: '',
    body: `<h2>Stat tiles</h2>
<div class="grid cols-4">
  <div class="stat-tile"><div class="label">Presupuesto</div><div class="value good">$ 12.400</div><div class="sub">+ $ 800 esta semana</div></div>
  <div class="stat-tile"><div class="label">Ánimo del plantel</div><div class="value warn">58</div><div class="sub">bajó tras la derrota</div></div>
  <div class="stat-tile clickable"><div class="label">Posición</div><div class="value">3°</div><div class="sub">de 8 — zona de playoffs</div></div>
  <div class="stat-tile"><div class="label">Socios</div><div class="value">214</div><div class="sub">+6 este mes</div></div>
</div>`,
  },
  {
    path: 'components/ficha-jugador.html',
    group: 'Componentes',
    name: 'Ficha de jugador',
    extra: '',
    body: `<h2>Player card</h2>
<p class="muted">Estados: normal, titular seleccionado, en rotación.</p>
<div class="player-grid">
  <div class="player-card">
    <div class="player-head">
      <div class="avatar">TR</div>
      <div class="who">
        <div class="name">Tomás Rivarola</div>
        <div class="pos">Base · 27 años</div>
      </div>
      <div class="rating"><div class="num">≈74</div><div class="approx">★★★★☆</div></div>
    </div>
    <div class="player-desc">Organizador cerebral: no corre, hace correr la pelota.</div>
    ${bar('Físico', 78)}
    ${bar('Motivación', 52)}
    ${bar('Compromiso', 71)}
    ${bar('Afinidad social', 66)}
    <div class="player-chips">
      <span class="chip good">En forma</span>
      <span class="chip good">Cuota al día</span>
      <span class="chip">Referente</span>
      <span class="chip accent">Último partido: 8/10</span>
    </div>
  </div>
  <div class="player-card selected">
    <div class="player-head">
      <div class="avatar">MP</div>
      <div class="who">
        <div class="name">Martín Paredes</div>
        <div class="pos">Alero · 23 años</div>
      </div>
      <div class="rating"><div class="num">≈68</div><div class="approx">★★★☆☆</div></div>
    </div>
    <div class="player-desc">Tirador de rachas: o mete todo o no mete nada.</div>
    ${bar('Físico', 84)}
    ${bar('Motivación', 90)}
    ${bar('Compromiso', 44)}
    ${bar('Afinidad social', 58)}
    <div class="player-chips">
      <span class="chip good">En forma</span>
      <span class="chip warn">Cuota atrasada</span>
      <span class="chip accent">Titular</span>
    </div>
  </div>
  <div class="player-card rotation">
    <div class="player-head">
      <div class="avatar">JS</div>
      <div class="who">
        <div class="name">Julián Soto</div>
        <div class="pos">Pívot · 31 años</div>
      </div>
      <div class="rating"><div class="num">≈61</div><div class="approx">★★★☆☆</div></div>
    </div>
    <div class="player-desc">Veterano de mil batallas bajo el aro.</div>
    ${bar('Físico', 39)}
    ${bar('Motivación', 63)}
    ${bar('Compromiso', 88)}
    ${bar('Afinidad social', 74)}
    <div class="player-chips">
      <span class="chip warn">Cansado</span>
      <span class="chip good">Cuota al día</span>
      <span class="chip rotation-chip">Rotación</span>
    </div>
  </div>
</div>`,
  },
  {
    path: 'components/tabla-posiciones.html',
    group: 'Componentes',
    name: 'Tabla de posiciones',
    extra: '',
    body: `<h2>Tabla</h2>
<p class="muted">La fila del club del jugador se resalta con <code>.highlight</code>.</p>
<div class="card">
  <h3>Liga Regional — Zona A</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Club</th><th class="num">PJ</th><th class="num">PG</th><th class="num">PP</th><th class="num">Pts</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Deportivo Norte</td><td class="num">12</td><td class="num">10</td><td class="num">2</td><td class="num">22</td></tr>
        <tr><td>2</td><td>Juventud Unida</td><td class="num">12</td><td class="num">9</td><td class="num">3</td><td class="num">21</td></tr>
        <tr class="highlight"><td>3</td><td><strong>Club Atlético Sur</strong></td><td class="num">12</td><td class="num">8</td><td class="num">4</td><td class="num">20</td></tr>
        <tr><td>4</td><td>Sportivo Oeste</td><td class="num">12</td><td class="num">6</td><td class="num">6</td><td class="num">18</td></tr>
        <tr><td>5</td><td>Estrella del Sur</td><td class="num">12</td><td class="num">4</td><td class="num">8</td><td class="num">16</td></tr>
      </tbody>
    </table>
  </div>
</div>`,
  },
  {
    path: 'components/marcador.html',
    group: 'Componentes',
    name: 'Marcador de partido',
    extra: '',
    body: `<h2>Scoreboard</h2>
<div class="card">
  <div class="scoreboard">
    <div class="team"><div class="tname">Club Atlético Sur</div><div class="score win">84</div></div>
    <div><span class="result-badge win">VICTORIA</span></div>
    <div class="team"><div class="tname">Deportivo Norte</div><div class="score lose">79</div></div>
  </div>
  <ul class="reason-list">
    <li>La presión en defensa forzó 9 pérdidas en el último cuarto.</li>
    <li>Rivarola dominó el ritmo del partido (8/10).</li>
  </ul>
</div>`,
  },
  {
    path: 'components/modal-evento.html',
    group: 'Componentes',
    name: 'Modal de evento',
    extra: `.modal-backdrop{position:relative;inset:auto;min-height:380px;border-radius:var(--radius);}`,
    body: `<h2>Modal de evento</h2>
<div class="modal-backdrop">
  <div class="modal">
    <h2>El intendente quiere la cancha</h2>
    <p class="event-text">La municipalidad ofrece alquilar el gimnasio los sábados para actos políticos. Es plata fácil, pero los socios no van a estar contentos.</p>
    <div class="options">
      <button>Aceptar el alquiler<span class="opt-hint">+ $ 1.500 · el ánimo de los socios puede bajar</span></button>
      <button>Negociar solo un sábado al mes<span class="opt-hint">+ $ 500 · riesgo menor</span></button>
      <button>Rechazar la oferta<span class="opt-hint">Los socios lo van a valorar</span></button>
    </div>
  </div>
</div>`,
  },
  {
    path: 'components/acciones-semana.html',
    group: 'Componentes',
    name: 'Acciones de la semana',
    extra: '',
    body: `<h2>Action cards</h2>
<p class="muted">Estados: normal, seleccionada, bloqueada.</p>
<div class="action-grid">
  <div class="action-card">
    <div class="action-title">Entrenamiento físico</div>
    <div class="action-desc">Mejora el físico del plantel de cara al partido.</div>
    <div class="action-cost">Cuesta $ 200</div>
  </div>
  <div class="action-card selected">
    <div class="action-title">Asado de camaradería</div>
    <div class="action-desc">Sube la afinidad social y la motivación del grupo.</div>
    <div class="action-cost">Cuesta $ 350</div>
  </div>
  <div class="action-card disabled">
    <div class="action-title">Contratar preparador</div>
    <div class="action-desc">Un profesional para el cuerpo técnico.</div>
    <div class="action-blocked">Sin presupuesto suficiente</div>
  </div>
</div>
<div class="confirm-bar">
  <button class="primary">Confirmar semana</button>
  <span class="hint">Elegiste 1 de 2 acciones disponibles.</span>
</div>`,
  },
  {
    path: 'components/noticias.html',
    group: 'Componentes',
    name: 'Lista de noticias',
    extra: 'body{max-width:520px;}',
    body: `<h2>Noticias</h2>
<div class="card">
  <h3>Últimas novedades</h3>
  <ul class="news-list">
    <li><span class="news-week">S12</span><span class="news-dot good"></span><span>Victoria 84–79 ante Deportivo Norte: el club trepa al 3° puesto.</span></li>
    <li><span class="news-week">S11</span><span class="news-dot bad"></span><span>Julián Soto sufrió una molestia muscular en el entrenamiento.</span></li>
    <li><span class="news-week">S11</span><span class="news-dot neutral"></span><span>La comisión directiva aprobó el presupuesto para la reforma del gimnasio.</span></li>
    <li><span class="news-week">S10</span><span class="news-dot good"></span><span>Se sumaron 6 socios nuevos después del festival del club.</span></li>
  </ul>
</div>`,
  },
];

let count = 0;
for (const card of CARDS) {
  const full = join(OUT, card.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, page(card.group, card.name, `${card.name} — Basket Manager`, card.extra, card.body), 'utf8');
  console.log(`  ${card.path}`);
  count++;
}
console.log(`\nOK: ${count} cards generadas en design/cards/ (a partir de src/styles.css).`);
console.log('Para subirlas al proyecto "Basket Manager UI" de claude.ai/design,');
console.log('pedile a Claude en una sesión del repo: "sincronizá el design system".');
