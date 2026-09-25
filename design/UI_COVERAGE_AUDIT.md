# UI coverage audit — ¿el sistema de UI está en todo el juego?

> Pedido en `design/AI_HANDOFF.md` (TASK ACTUAL, 2026-09-25). Auditoría hecha sobre el código
> **antes** de la migración tipográfica (commit `1422a21`, rama `art/vestuario-vertical-slice`),
> recorriendo el juego con Playwright a 1440×900 y leyendo componente por componente.
> Patrones según `GAME_UI_SYSTEM.md` §5–§13; paleta vigente: gris perla (§22).

**Resumen:** ninguna de las 23 superficies está 100 % en el sistema. La paleta gris perla y el
shell llegan a casi todo (por tokens), pero los **componentes** no: hay 9 estilos de pestañas,
4 de barras, ~10 filas de persona distintas, ~10 variantes de título, sin botón ghost ni foco
global. Cinco pantallas de datos simples están prácticamente migradas; las de gameplay
(semana, quinteto, partido, informe) y las de escena (portada, carrera) son las más propias.

Criterio: **Migrada** = tokens + componentes compartidos · **Parcial** = tokens, pero
componentes propios o algunos literales · **Legacy** = paleta o sistema propio.

## Tabla

| # | Superficie | Shell | Tipo* | Panel | Chip | Stat | Tabla | Botones | Header | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Portada | propio | tokens | propio (`.portada-panel`) | — | — | — | propios (`.portada-acceso/-modo/-volver`), `.danger` y `.segmented` re-pintados | propio | **Legacy** |
| 2 | Nueva partida / Carrera | propio | tokens | `.card` (banda no renderiza: sin `.vista`) | — | — | — | `.primary`; botones de escena re-pintados | propio | **Parcial** (escenas: Legacy) |
| 3 | Pretemporada | **duplicado** (topbar y HUD propios, sin nav) | tokens | `.card` + banda | `.ps-ficha` propio | — | `.planilla` grid | `.primary`, `.small`; pestañas `.ps-tabs` + `.ps-filtros` | banda | **Parcial** |
| 4 | Tablero | global | **Oswald literal** (Hub.css) + token inexistente | propios (`.hub-a-card/-match`) | `.hub-jugador` (local) | puntos | — | 1 `.primary`; links, alertas y atajos propios | `.hub-a-band` (copia) + `.hub-block-title` (definido 2 veces) | **Parcial** (el más fuera de sistema) |
| 5 | Plantel (Fichas / Estadísticas) | global | tokens | `.planilla` (panel con tornillos) | Avatar + `PlayerLink` | `.mini-medidor` | `.planilla` grid / `table.planilla sheet` (colisión) | pestañas `.view-toggle` | `.section-title` | **Parcial** |
| 6 | Ficha de jugador | modal | tokens (subtítulo en body) | `.profile` propio | Avatar, `.chip` | **`.bar-track` + `.legs-mini`** | `table` | pestañas `.profile-tabs` | `.profile-subtitle` | **Parcial** |
| 7 | Vestuario | global | tokens | `.vestuario-slice` (SCENE-A aprobada) con 10 tokens redefinidos como literales | `PlayerChip` propio | `.bar-track` | — | — | título sobre escena | **Parcial** (escena aprobada; paleta local) |
| 8 | Cuerpo técnico | global | tokens + `fontSize` inline | `.card` | — | `.bar-track` | — | `.segmented`, `.small`, `select` con radio 8 inline | banda + `.profile-subtitle` | **Parcial** |
| 9 | Finanzas | global | tokens | `.card`, `.stat-tile` | `PlayerLink` | — | `table` | base | banda | **Migrada** |
| 10 | Liga | global | tokens | `.card` | links + escudos | — | `table.planilla` ×4 (colisión) | `.view-toggle` + `.division-tabs` (2 estilos) | banda | **Parcial** |
| 11 | Calendario | global | tokens | `.card` | `PlayerLink` | — | `table` | base | banda | **Migrada** |
| 12 | Rankings | global | tokens | `.card` | `PlayerLink` | — | lista `.ranking-list` | base | `.section-title` | **Migrada** |
| 13 | Club | global | tokens | `.card` | Avatar en `.chat-row` | `.bar-track` | — | base | banda | **Migrada** |
| 14 | Historia | global | tokens | `.card` | `PlayerLink` | — | `table` | base | banda | **Migrada** |
| 15 | La semana / Convocatoria | global | tokens | `.card` + banda | `.callup-row` propio | — | — | `.action-card`, `.primary`; pasos `.steps` | banda + `.band-btn` | **Parcial** |
| 16 | Quinteto | global | tokens | `.card`; paneles semánticos con `borderColor` inline | `.lp-row` propio | — | — | `.mini`, `.mini.blue` | banda | **Parcial** |
| 17 | Partido en vivo | global | tokens | `.card.pane` + `.pv-cabecera` | `.pv-fila-j` propio | `.mini-medidor` | `table.pvc-cuartos` propia | `.segmented` ×6 (relleno naranja) + `.primary` | banda | **Parcial** (~27 literales: marcador, cancha de madera, fichas) |
| 18 | Postpartido / informe | global | tokens | `.card.pane` + `.informe-franja` | `.mood-avatar` | — | `table.planilla` (colisión) | `.primary` | banda | **Parcial** |
| 19 | Perfiles (rival/club/liga/mundo) | modal | tokens | `.profile` propio | Avatar/escudo | `.bar-track` | — | cerrar propio | propio | **Parcial** |
| 20 | Modales / eventos / tips | overlay | tokens (`h2` en body) | `.modal` (borde naranja decorativo, velo gris cálido) | `.event-person` | — | — | `.options`, `.primary`/`.danger`; `.modal:focus{outline:none}`; `.tip` sólo hover | propio | **Parcial** |
| 21 | Fin de pretemporada | propio | tokens | `.card` sin `.vista` (sin banda) | — | — | — | `.primary` | plano | **Parcial** |
| 22 | Fin de temporada | propio | tokens | `.card` sin `.vista` | — | `Bar` copiado a mano | — | `.primary` | plano | **Parcial** |
| 23 | Galerías dev | propio (topbar falsa) | tokens + inline | `.card` | Avatar, Crest | — | — | — | `.section-title` | fuera de producción |

\* Tipo = cómo llegaba la tipografía **antes** de este lote. Después de la migración
tipográfica (ver abajo) **todas** las superficies usan `--font-ui` / `--font-display`: no queda
ninguna familia hardcodeada en producción.

**Conteo:** Migrada 5 (Finanzas, Calendario, Rankings, Club, Historia) · Parcial 16 · Legacy 1
(Portada) · fuera de producción 1 (galerías).

## Componentes globales que faltan (GAME_UI_SYSTEM)

> **Actualización 2026-09-25 (commit `80f6ce9`, lote de componentes):** resueltos 1 (SUBNAV-01),
> 2 (STAT-01), 3 (ghost + hover de danger), 4 (foco global, salvo `.tip` y la portada),
> 6 (banda explícita fuera de `.vista`), PANEL-02 del punto 7 y 9 (colisión `.planilla`).
> Siguen abiertos: 5 (clases `ui-*`), PANEL-03/04, 8 (CHIP-01), 10 (shell de la pretemporada)
> y 11 (CSS sin uso). La tabla de arriba describe el estado **previo** al lote.

1. **SUBNAV-01 unificado.** 9 estilos: `.view-toggle`, `.segmented`, `.profile-tabs`, `.ps-tabs`,
   `.ps-filtros`, `.pv-filtro`, `.division-tabs`, `.steps/.step` (+ el nav principal). Cuatro
   tratamientos de "activo" (tinte naranja, relleno naranja, relleno de sección, filete). Ninguno
   con `:focus-visible`.
2. **STAT-01 unificado.** `.bar-track` (Bar.tsx), `.mini-medidor` (definido dos veces),
   `.legs-mini`, puntos `.hub-punto`; `.qs-bar` muerto. Físico/Motivación se dibuja con
   `.bar-track` en la ficha y con `.mini-medidor` en el Plantel. SeasonEndScreen copia `Bar` a mano.
3. **BTN-03 ghost.** No hay clase; hay ~6 ghost sueltos (`.hub-a-link`, `.portada-volver`,
   `.topbar .salir`, `.band-btn`, botones de escena de Carrera, `.view-toggle button`).
   `button.danger` no tiene hover propio (toma el borde naranja genérico).
4. **Foco global.** No hay `button:focus-visible` base; sólo reglas locales. `.modal:focus` y
   `.portada-modo:focus-visible` sacan el outline. `PlayerLink` (role=button) y `.tip` sin foco.
5. **Escala `ui-*` (§4).** No existe; sólo tokens de tamaño `--fs-*`, que Hub.css e inline
   (CoachCard, CrestGallery) saltean. Tampoco hay voz manuscrita.
6. **HEADER-01 único.** ~10 variantes. La banda de card depende de un ancestro `.vista`, por eso
   no aparece en Carrera, Fin de temporada, Fin de pretemporada ni modales.
7. **PANEL-02/03/04.** Sólo existe PANEL-01 (`.card`); los semánticos se hacen con
   `borderColor` inline; los hero (`.hub-a-match`, `.pv-cabecera`, `.informe-franja`,
   `.outcome`) son únicos. La receta de `.card` está copiada en `.player-card`, `.planilla`,
   `.hub-block` y `.hub-a-card` con sombras distintas.
8. **CHIP-01.** `.chip` es una píldora de texto. Avatar + nombre + estado está re-hecho ~10 veces
   (`.hub-jugador`, `PlayerChip`, `.ps-ficha`, `.callup-row`, `.lp-row`, `.pv-fila-j`,
   `.planilla-fila`, `.chat-row`, `.event-person`, `.slot-*`).
9. **TABLE-01: colisión `.planilla`.** Siete `<table class="planilla">` (Liga ×4, Informe ×2,
   RosterSheet) heredan también las reglas del panel `.planilla` (styles.css ~4496: fondo, grano,
   borde, relieve) y quedan como "card dentro de card".
10. **Shell duplicado.** Pretemporada re-implementa topbar y HUD (PreseasonView 240–383) sin nav.
11. **CSS sin uso** (borrable tras confirmar): `.qs-*`, `.menu-modo`, `.menu-diff-*`,
    `.menu-buttons`, `.menu-version`, `.hub-tile*`/`.hub-escudo`, `.scoreboard`.

## Detalle por superficie (evidencia)

Rutas relativas a `src/`; líneas de `styles.css` en el commit auditado.

- **Portada** — `ui/Portada.tsx`; `.portada*` 5734–6091. ~38 literales (crema local
  `--portada-crema #f3e9d6`, `rgba(243,233,214,…)`, `rgba(20,16,12,…)`, naranja fuera de token
  en 5968). Foco propio 5882/5891/6050; 5970 `outline:none`.
- **Carrera** — `ui/CareerSetup.tsx`; `.menu-*` 2987–3041, `.carrera-*` 6409–6598. La
  `h3.card-band` (CareerSetup:125) no tiene `.vista` arriba → cae al estilo plano.
- **Pretemporada** — `ui/PreseasonView.tsx`: `PreseasonTopbar` 240–330, `PreseasonRecursos`
  331–383, `.marco` propio 1387; modal `.profile` propio 972–1090 y 5 `.modal` 1133–1332.
- **Tablero** — `ui/Hub.tsx`, `ui/Hub.css`. Oswald literal en Hub.css 36, 51, 60 y fallback de un
  token inexistente (`--font-display`) en 16; `.hub-plantel-leyenda` repetía la pila Segoe
  (styles.css 1707); tamaños en rem fuera de `--fs-*`; `#1d4f73` ×3 en links/foco.
- **Plantel** — `ui/RosterView.tsx`, `ui/RosterList.tsx` (`.planilla` 4482–4720, tornillos
  4499), `ui/RosterSheet.tsx` (`table.planilla sheet` 217).
- **Ficha** — `ui/PlayerProfile.tsx`; `.profile` 3991–4110, `.profile-ficha` 4799–4966; dos
  barras en el mismo modal (Bar 136–139 y `.legs-mini` 221).
- **Vestuario** — `ui/VestuarioCard.tsx`; `.vestuario-slice` redefine `--panel`, `--text`,
  `--accent #f47c27`, `--good #54d29a`… como literales (6663–6672).
- **Cuerpo técnico** — `ui/CoachCard.tsx`: `fontSize` inline (53, 71, 92, 126, 169), `select`
  con `borderRadius: 8` inline (142–148).
- **Liga** — `ui/LeagueView.tsx`: `.view-toggle.liga-tabs` (342) + `.division-tabs` (537);
  `table.planilla` 238/427/488/555.
- **Semana** — `ui/WeekView.tsx`, `ui/semana/comun.tsx` (`.steps` 73), `LaSemana.tsx`
  (`.action-card` con foco propio), `Convocatoria.tsx` (`.callup-row` 3190).
- **Quinteto** — `ui/semana/Quinteto.tsx`: `.lp-row`, cancha `.court` (gradiente `#4a6a86`),
  paneles de alerta con `borderColor` inline (230, 251, 258), `var(--warn, #c90)` (442).
- **Partido** — `ui/PartidoVivo.tsx`: `.segmented` ×6, `.pv-filtro` con literales, marcador
  `#8fd3a3`/`#f2a196` (5080), cancha de madera `#b8834a`/`#b07b44`/`#7a5230`, fichas
  `#fff`/`#ffc078`; colores de club por defecto (276–277).
- **Informe** — `ui/semana/Informe.tsx`: `.result-badge` pastel `#e2efe5`/`#f6e2df` (2431),
  `table.planilla` 98/139.
- **Modales** — `ui/EventModal.tsx`, `ui/ConfirmDialog.tsx`, `ui/Tip.tsx`: velo
  `rgba(37,40,44,.55)` (2927), borde naranja (2935), `h2` naranja en body (2949).
- **Fin de pretemporada / temporada** — `ui/PreseasonEndScreen.tsx`, `ui/SeasonEndScreen.tsx`:
  sin `.vista`; `borderColor` inline; `Bar` copiado a mano (SeasonEnd 87–88).

## Tipografía: inventario previo a la migración

- `styles.css`: `--display: 'Oswald', 'Bahnschrift SemiBold Condensed', 'Arial Narrow'`
  (75 usos por token); `body` y `.hub-plantel-leyenda` con `'Segoe UI', system-ui…` literal.
- `Hub.css`: `'Oswald'` literal ×3 + `var(--font-display, 'Oswald')` (token inexistente).
- TSX: `Crest.tsx:193` SVG `fontFamily="var(--display)"`; `CrestGallery.tsx:53` inline.
- Formularios (`input`, `select`, `textarea`) sin regla: salían con la fuente del sistema.
- Títulos en fuente de cuerpo donde el sistema pide display: `.modal h2`, `.event-head h2`,
  `.profile-subtitle`, `.hub-a-band`, `.hub-a-heading h2`, rival del Tablero.
