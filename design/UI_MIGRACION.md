# Migración visual — inventario y estado

> Pasos 1–4 de `GAME_UI_SYSTEM.md` §21: inventario de componentes globales, mapeo a los
> patrones del sistema, Foundation y Global Shell. Fuente de verdad: `ART_BIBLE.md` +
> `GAME_UI_SYSTEM.md` + `arte/referencias/ui-final-partido-centro.png` (lámina 05).
> Rama: `art/vestuario-vertical-slice`. Última revisión: 2026-09-24.

## Cómo se migró la paleta

`src/styles.css` define en `:root` los tokens `--bm-*` de GAME_UI_SYSTEM §3 y **re-apunta los
tokens viejos** (`--panel`, `--text`, `--accent`, `--chrome`…) a ellos. Las ~6700 líneas que ya
usaban tokens cambiaron de paleta sin tocarlas. Colores nuevos de UI sólo se agregan como `--bm-*`.

## Mapeo componente → patrón

| Patrón | Hoy en el código | Estado |
|---|---|---|
| NAV-01 | `.topbar`, `.secciones .seccion` (`App.tsx`) | ✅ Activo con placa + accent bar naranja + peso + icono; punto neutro (sin color de sección); foco visible |
| SUBNAV-01 | `.steps/.step` (semana), `.view-toggle` (Plantel, Liga), `.segmented`, `.profile-tabs`, `.ps-tabs`, `.ps-filtros`, `.pv-filtro`, `.division-tabs` | 🟡 `.step` migrado a placas. Las demás siguen con su estilo propio: unificar |
| HEADER-01 | `.card > h3.card-band` / `:first-child`, `.hub-block-title`, `.hub-a-band`, `.cabecera-arte`, `.section-title` | ✅ Banda oscura con filete, sin color de sección. `.cabecera-arte` sin revisar |
| PANEL-01 | `.card`, `.pane`, `.planilla`, `.hub-a-card`, `.hub-a-match` | ✅ Por tokens (`--panel`, `--relieve`, `--grano`) |
| PANEL-02 | `.modal`, `.profile`, `.hover-card`, `.tip` | 🟡 Por tokens, pero el borde naranja de modal/perfil es decorativo (§3): pendiente |
| PANEL-03 | `.stat-tile`, `.action-card`, `.hub-a-readiness button`, `.qs-card` | ✅ Por tokens |
| PANEL-04 | `.result-badge`, `.human-note`, `.match-alert`, `.hub-a-alert` | 🟡 `.result-badge` y `.hub-a-alert` a tinte/acento. Inline `borderColor: var(--bad)` en Quinteto/Pretemporada pendientes |
| PANEL-05 | `.hub-a-match` (Tablero), `.pv-cabecera` (partido) | 🟡 Por tokens; composición SCENE-C del Tablero pendiente (fase 3) |
| CHIP-01 | `.chip`, `.avatar`, `.retrato-img`, `.plink`, `.lp-row`, `.sub-row`, `.vest-fila` | 🟡 Por tokens; falta unificar estados (hover/focus/selected/conflict) |
| STAT-01 | `.bar-track/.bar-fill` (`Bar.tsx`), `.mini-medidor`, `.legs-mini`, `.qs-bar` | 🔴 Cuatro estilos de barra para significados parecidos (§10): unificar |
| TABLE-01 | `table`, `table.planilla`, `.planilla-fila`, `.pv-fila-j`, listas | 🟡 Por tokens; revisar fila seleccionada/hover |
| BTN-01..04 | `button`, `.primary`, `.danger`, `.mini`, `.small`; no hay `.ghost` | 🟡 Foco global agregado. Falta clase ghost; `.portada-panel .danger` con literales |
| HUD-01 | `.recursos` (`App.tsx`, `PreseasonView.tsx`) | ✅ Ya era oscuro y tokenizado; ahora en Paleta A |
| SCENE-A | `.vestuario-slice` (`VestuarioCard.tsx`) | ✅ Variante C, ahora sobre tokens globales |
| SCENE-C | `.fondo-app` + velo; `.portada*`, `.carrera-escena` | 🟡 Velo frío. Portada/Carrera tienen su propio mini-sistema de literales crema |

## Hecho en Foundation + Shell

- Tokens `--bm-*` y re-apuntado de los viejos; profundidad (`--relieve`, `--hundido`, `--grano`,
  sombras) recalculada para superficies oscuras.
- Velo del fondo en frío; `.pie-fijo` al fondo profundo.
- Colores de sección fuera del chrome: tabs, bandas de card, bloque del Tablero, "Salir".
- Bandas de equipo del partido: color del club como barra lateral (`--club`), no como banda.
- `Hub.css` (Tablero) sin literales: todo por tokens; títulos en voz display.
- Foco visible naranja en todos los botones y en la navegación.

## Pendiente (antes de migrar el resto — §21 pasos 6–8)

1. Comparar Tablero / Vestuario / Partido contra la lámina 05 y corregir el sistema.
2. SUBNAV-01 único para `.view-toggle`, `.segmented`, `.profile-tabs`, `.ps-tabs`.
3. STAT-01: una sola barra segmentada para energía/moral/unión/forma.
4. Naranja decorativo (§3): borde de `.modal`/`.profile`/`.hover-card`, `.event-icon`,
   `.qs-avatar`, `.chat-name`, `.rk-pos` del primero.
5. Tablero como SCENE-C (escena de fondo + módulos), no escena dentro de una card.
6. Escala tipográfica `ui-*` (§4) como clases.
7. Portada y Carrera: pasar su mini-sistema crema a Paleta A.
