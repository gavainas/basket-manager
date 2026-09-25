# AI Handoff — Basket Manager

> Objetivo: que ChatGPT (dirección de arte/UI) y Claude Code (implementación/runtime) trabajen sobre el mismo repo sin que Gabi tenga que copiar instrucciones largas entre chats.

## Fuente de verdad compartida

Antes de trabajar UI/arte, leer:

1. `design/ART_BIBLE.md`
2. `design/GAME_UI_SYSTEM.md`
3. este archivo

La rama de trabajo actual para la migración visual es:

`art/vestuario-vertical-slice`

## Roles

### ChatGPT
Responsable de:
- dirección visual;
- Art Bible;
- sistema UI;
- referencias;
- backgrounds y briefs de assets;
- criterios de aprobación;
- documentación de decisiones;
- revisar screenshots y definir correcciones.

### Claude Code
Responsable de:
- integrar assets binarios mediante git local;
- implementar CSS/TSX;
- refactorizar componentes UI;
- correr el juego;
- verificar resoluciones;
- sacar screenshots;
- commit/push de implementación;
- reportar limitaciones técnicas.

## Protocolo de trabajo

### Cuando ChatGPT deja una tarea
ChatGPT actualiza la sección **TASK ACTUAL** de este archivo y hace commit/push.

Gabi sólo necesita decirle a Claude:

> Pull latest de la rama actual, leé `design/AI_HANDOFF.md` y ejecutá TASK ACTUAL. No avances fuera de ese alcance.

### Cuando Claude termina
Claude debe:
1. hacer commit y push;
2. actualizar la sección **RESULTADO CLAUDE** de este archivo con:
   - commit;
   - qué cambió;
   - qué no cambió;
   - screenshots generadas;
   - dudas/bloqueos;
3. dejar el repo limpio.

Gabi luego sólo necesita decirle a ChatGPT:

> Revisá el último handoff de Claude en el repo.

Así evitamos copiar prompts largos entre chats.

---

# TASK ACTUAL

## Typography migration + full UI coverage audit

### Contexto
Gabi quiere cambiar la tipografía del juego y, antes de seguir migrando pantallas, verificar si el sistema de UI nuevo está realmente implementado en TODO el juego.

Estado observado en repo:
- `body` todavía usa `'Segoe UI', system-ui...`;
- la voz display usa `Oswald` mediante `--display`;
- hay usos hardcodeados de `'Oswald'` en CSS (por ejemplo `Hub.css`);
- Foundation/Global Shell y la paleta gris perla sí afectan gran parte de la app, pero eso NO implica que NAV/PANEL/CHIP/STAT/TABLE/BUTTON/HUD estén migrados por completo en cada pantalla.

### Nueva dirección tipográfica a probar
Probar como primera opción:

- **Display / deportiva:** `Barlow Condensed` (600/700)
- **UI / lectura:** `Barlow` (400/500/600)

Razón:
- sigue teniendo identidad deportiva/editorial;
- es menos rígida/estrecha que Oswald;
- funciona mejor para textos de manager, tablas y navegación;
- permite que display y body pertenezcan a la misma familia sin verse iguales.

Usar paquetes Fontsource y empaquetar las fuentes con el build. No depender de fuentes del sistema.

### Antes de tocar todo: auditoría

Recorrer TODAS las superficies visibles del juego y clasificarlas:

1. Portada / menú principal
2. Nueva partida / carrera / dificultad
3. Pretemporada
4. Tablero
5. Plantel — todas sus pestañas
6. Ficha de jugador
7. Vestuario
8. Cuerpo técnico
9. Finanzas
10. Liga
11. Calendario
12. Rankings
13. Club
14. Historia
15. La semana / convocatoria
16. Quinteto y táctica
17. Partido en vivo
18. Postpartido / informe
19. Perfiles de rival / club / liga / jugador del mundo
20. Modales / confirmaciones / eventos
21. Fin de pretemporada
22. Fin de temporada / game over
23. Pantallas de galería/dev sólo si comparten componentes de producción

Para cada superficie registrar:
- ¿usa Global Shell?
- ¿usa tipografía por tokens o hardcodeada?
- ¿usa PANEL system?
- ¿usa CHIP-01?
- ¿usa STAT-01?
- ¿usa TABLE-01?
- ¿usa BUTTON system?
- ¿usa HEADER-01?
- ¿tiene estilos legacy/hardcodeados?
- estado: **Migrada / Parcial / Legacy**.

Guardar la auditoría en:
`design/UI_COVERAGE_AUDIT.md`

### Migración tipográfica

Después de auditar:

1. Agregar Fontsource:
   - `@fontsource/barlow`
   - `@fontsource/barlow-condensed`

2. Definir tokens únicos:
   - `--font-display: 'Barlow Condensed', sans-serif;`
   - `--font-ui: 'Barlow', sans-serif;`
   - mantener `--display` temporalmente como alias si hace falta para no romper CSS.

3. Reemplazar dependencias directas de:
   - Oswald
   - Segoe UI
   - Arial Narrow / Bahnschrift
   - otros font-family hardcodeados de producción
   por los tokens nuevos.

4. No cambiar tamaños todavía salvo donde la nueva métrica rompa layout.

5. Verificar:
   - 1440x900
   - 1366x768
   - no overflow nuevo;
   - navegación, tablas y marcador siguen entrando.

### Prueba visual

Sacar screenshots con la nueva tipografía de:
- Tablero
- Vestuario
- Plantel
- Partido
- Postpartido
- Finanzas
- Portada

Comparar con la referencia:
`design/arte/referencias/ui-final-partido-centro.png`

### Resultado esperado

Al terminar, actualizar **RESULTADO CLAUDE** con:
- commit;
- fuente implementada;
- lista de pantallas Migrada / Parcial / Legacy;
- qué componentes globales todavía faltan;
- screenshots;
- recomendaciones del próximo lote.

### Importante
No hacer todavía una refactorización masiva de las pantallas Legacy sin mostrar primero la auditoría y las screenshots con la nueva tipografía.
No cambiar lógica ni datos.

---

# RESULTADO CLAUDE

## 2026-09-25 — Typography migration + full UI coverage audit

**Commit de implementación:** `221b103` (rama `art/vestuario-vertical-slice`). Antes se trajo
`main` a la rama (`1422a21`: changelog del gris perla y bandas de equipo del partido en azul noche).

### Fuente implementada
- **Display:** `Barlow Condensed` 500/600/700 · **UI:** `Barlow` 400/500/600/700 — Fontsource,
  subconjunto latin, empaquetadas en el build. Se quitó `@fontsource/oswald`.
- Se sumaron dos pesos a lo pedido: **Barlow 700** (botones, chips y `<strong>` piden negrita;
  sin el archivo el navegador la inventa engrosando la 600) y **Barlow Condensed 500** (la usan
  el nav, el HUD y varias etiquetas display). 800/900 del CSS caen a 700, como antes con Oswald.
- Tokens: `--font-display`, `--font-ui`; `--display` queda como alias (≈75 reglas).
- Reemplazado: `body` y `.hub-plantel-leyenda` (`'Segoe UI'`), `Hub.css` (`'Oswald'` ×3 y el
  fallback de un `--font-display` que no existía). `input/select/textarea` ahora heredan la
  fuente (antes salían con la del sistema). En producción no queda ninguna familia hardcodeada;
  el SVG de escudos ya usaba `var(--display)`.
- Tamaños sin tocar.

### Verificación
- `document.fonts` confirma Barlow y Barlow Condensed cargadas; nav, HUD, botones y cuerpo
  resuelven la familia correcta.
- Recorrido automático de 24 superficies a **1440×900 y 1366×768**: 0 textos desbordados,
  0 errores JS.
- Medido contra la versión anterior servida en paralelo: nav, HUD y página sin desborde
  horizontal en ninguna resolución; el Tablero sigue entrando sin scroll; Barlow ocupa menos
  alto que Oswald (Plantel a 1366: 646 → 534 px de scroll; Semana 446 → 412).
- Build y 196 tests OK.

### Auditoría — `design/UI_COVERAGE_AUDIT.md`
- **Migrada (5):** Finanzas, Calendario, Rankings, Club, Historia.
- **Parcial (16):** Nueva partida/Carrera, Pretemporada, Tablero, Plantel, Ficha, Vestuario,
  Cuerpo técnico, Liga, Semana/Convocatoria, Quinteto, Partido, Informe, Perfiles, Modales,
  Fin de pretemporada, Fin de temporada.
- **Legacy (1):** Portada (y las escenas de intro de Carrera, dentro de su fila).
- Galerías dev: fuera de producción.
- Nota: el Vestuario quedó como **Parcial** y no Legacy: es la SCENE-A aprobada, pero redefine
  10 tokens como literales en vez de usar los globales.

### Componentes globales que todavía faltan
1. **SUBNAV-01 único** — hay 9 estilos de pestañas con 4 formas de marcar "activo", ninguno con foco.
2. **STAT-01 único** — 4 barras; Físico/Motivación se dibuja distinto en la ficha y en el Plantel.
3. **Botón ghost** (BTN-03) y **hover propio de `.danger`**.
4. **Foco global** (`button:focus-visible`); `.modal` y la portada lo apagan; `PlayerLink` sin foco.
5. **Escala `ui-*`** (§4).
6. **HEADER-01 único** — la banda depende de un ancestro `.vista` y no aparece en Carrera, fines
   de temporada/pretemporada ni modales.
7. **PANEL-02/03/04** — semánticos hechos con `borderColor` inline.
8. **CHIP-01** — persona (avatar + nombre + estado) re-hecha ~10 veces.
9. **Colisión `.planilla`** — siete `<table class="planilla">` heredan el panel con relieve.
10. **Shell duplicado** en Pretemporada (topbar y HUD propios, sin nav).

### Screenshots (`design/capturas/2026-09-25-tipografia/`)
- `1440-*.webp` y `1366-*.webp`: tablero, vestuario, plantel, partido (final), postpartido,
  finanzas, portada — con la tipografía nueva.
- `comparacion-antes-despues-1440.webp`: Oswald + Segoe UI vs. Barlow Condensed + Barlow.
- `auditoria-todas-las-superficies-antes.webp`: las 24 superficies recorridas, estado previo.

### Contra la referencia (`ui-final-partido-centro.png`)
- Barlow Condensed se acerca más que Oswald a la lámina en marcador, nav, títulos de módulo y
  cifras del HUD: menos rígida, igual de deportiva.
- **Observación:** Barlow tiene ojo medio más chico que Segoe UI; los textos que ya eran muy
  chicos (metadatos del HUD "disponible", "de 9"; la nota de la acción del HUD) se leen más chicos.
  No se tocaron tamaños por consigna.
- La distancia con la lámina ya no es tipográfica: es de componentes (tabs, barras, chips) y
  de composición/arte (escenas de fondo en Previa, Partido, Postpartido, Tablero).

### Dudas / bloqueos
- Ninguno bloqueante.
- No se pudo verificar el sitio publicado desde este entorno (la red bloquea `github.io`);
  la verificación es sobre el dev server local.
- Superficies no alcanzadas en el recorrido automático (auditadas por código): Fin de
  pretemporada, Fin de temporada, modal de evento semanal (no apareció en la partida de prueba).

### Recomendación para el próximo lote
1. **Foundation de componentes, sin tocar layout:** foco global, ghost, `.danger` hover, escala
   `ui-*` + subir un paso los metadatos más chicos (efecto Barlow), y arreglar la colisión
   `.planilla` (renombrar la clase de tabla). Bajo riesgo, se nota en todo el juego.
2. **SUBNAV-01 y STAT-01 unificados** (reemplazan 9 y 4 estilos). Tocan casi todas las pantallas
   Parcial; conviene hacerlo antes de migrar pantallas una por una.
3. **HEADER-01 sin dependencia de `.vista`** (arregla Carrera, fines de temporada y modales).
4. Después, pantalla por pantalla por prioridad de §18: Tablero → Plantel → Partido/Quinteto →
   Informe, y en paralelo las fichas de arte de los fondos que faltan (§16).
