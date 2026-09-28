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

## Rediseño del Tablero desde cero: revisar la propuesta (Gabi, 2026-09-28)

> **Para ChatGPT.** Gabi cambió la dirección del trabajo de UI. **No** sigue la unificación
> de componentes (CHIP-01 queda en pausa). Quiere validar un **rediseño real de una pantalla**
> como vertical slice, y eligió el **Tablero**.

### Lo que pidió Gabi (resumen fiel)
- La referencia aprobada está muy por encima de lo implementado, y eso no se arregla con
  colores, paneles más claros u oscuros, botones, tabs o CSS.
- La pregunta no es «¿cómo adapto el Tablero actual al sistema?», sino «si diseñáramos hoy
  esta pantalla desde cero, con la calidad y la dirección de las referencias, ¿cómo sería?».
- No hay que preservar el layout actual. Se puede cambiar la jerarquía, la distribución, los
  tamaños, los espacios, la agrupación y el protagonismo de cada elemento.
- Hay que evitar sobre todo que parezca un **dashboard SaaS hecho de cards**.
- Lo que se valida: composición, jerarquía, sensación de videojuego, identidad, integración
  entre la UI y el mundo, y el protagonismo de la información importante.
- **Primero la propuesta; no se implementa nada hasta que Gabi apruebe la dirección.** Las
  demás pantallas no se tocan.

### Estado
Claude dejó la propuesta con una maqueta en **`design/propuestas/tablero-rediseno/`**:
`README.md` (diagnóstico, qué cambia y por qué, estados por fase, decisiones abiertas),
`propuesta-1440.webp`, `propuesta-1366.webp` y `maqueta.html`. Está en la rama
`claude/game-ui-status-cqi387`. Ver RESULTADO CLAUDE más abajo.

**Actualización 28/9:** Gabi **aprobó la estructura** como dirección y pidió una segunda
pasada sólo de identidad y dirección de arte, sobre la misma composición. Claude la dejó
como **v2** en el mismo README («Segunda pasada»), con `v2-1440.webp`, `v2-1366.webp` y
`maqueta-v2.html`. Resumen:
- el gimnasio se ve y su luz cruza la UI;
- el plantel está parado sobre la línea del parquet, con la altura real, agrupado por mesa
  del vestuario y con globos de lo que dijeron;
- «Esta semana» es una planilla con cinta;
- la información secundaria son frases.

**v4 (la vigente):** Gabi decidió que el Tablero **no muestra las bandas del vestuario**.
Eso se descubre entrando al Vestuario, y los grupos cambian durante el juego. El plantel es una
sola fila ordenada por puesto, con los que no están al final y en gris. Archivos:
`v4-1440.webp`, `v4-1366.webp` y `maqueta-v4.html`.

**v3:** Gabi encontró la v2 «muy cargada». La v3 corrige eso:
- sin globos ni cartel;
- bustos del mismo tamaño y alineados sobre la línea, repartidos a todo el ancho;
- sin la altura variable, sin número de camiseta y sin la C de capitán.

Archivos: `v3-1440.webp`, `v3-1366.webp` y `maqueta-v3.html`. La v4 espera el visto bueno de Gabi.

ChatGPT: mirar sobre todo lo que la v3 le pide al brief de `bg-tablero-v01`: el piso en plano
bajo, con una línea donde se paren los jugadores.

### Pedido a ChatGPT
1. Revisar la propuesta contra la Art Bible y las láminas Tier 1, incluidas las que **no están en
   el repo**: la 1 «Inicio y Club» y la 2 «La Semana».
2. Opinar sobre la composición y la jerarquía, y marcar lo que no llegue al nivel de la
   referencia.
3. Responder las decisiones abiertas del README: la escena (sede/comisión o gimnasio), el
   panel oscuro sobre la escena, la fuente manuscrita y el tamaño de los bustos mientras no
   haya retratos por capas.
4. Si la escena va, ajustar o aprobar la ficha `bg-tablero-v01` en
   `design/arte/ASSET_REGISTRY.md` según las zonas libres de la maqueta: la izquierda y la
   franja de abajo tranquilas, con la luz en el centro-derecha.

Cuando Gabi apruebe la dirección, Claude la implementa en `src/ui/Hub.tsx` y `Hub.css`, sin
cambios de lógica ni de datos.

---

## Tareas cerradas

### 2026-09-25 — Lote de componentes globales (pedido directo de Gabi)

<details>
<summary>Enunciado original</summary>


> Gabi se lo pidió a Claude en el chat ("arrancá con los componentes"), siguiendo la
> recomendación del resultado anterior. ChatGPT: revisar el resultado y definir el lote que sigue.

#### Alcance
Unificar los componentes globales que la auditoría (`design/UI_COVERAGE_AUDIT.md`) encontró
dispersos, **por CSS y sin cambiar lógica, datos ni layout de pantallas**:

1. **Foco global** (BTN estados): `:focus-visible` en botones, links de jugador/club y pestañas;
   quitar los `outline: none` que lo apagan.
2. **BTN-03 ghost** + hover propio de **BTN-04 danger**.
3. **SUBNAV-01 único** para los 9 estilos de pestañas/segmentos.
4. **STAT-01 único**: una sola barra (segmentada) para energía, físico, moral, unión, forma.
5. **HEADER-01 sin depender de `.vista`** (la banda de card aparece en Carrera, fines de
   temporada, modales).
6. **PANEL-02 elevated** para modales y fichas: sin naranja decorativo, velo azul noche.
7. **TABLE-01**: arreglar la colisión `.planilla` (tablas que heredan el panel con relieve).
8. **Legibilidad Barlow**: subir un paso los metadatos más chicos.

Fuera de alcance en este lote: CHIP-01 (la fila de persona está hecha ~10 veces con markup
distinto: necesita tocar TSX), composición SCENE-C de Tablero/Partido (necesita arte) y Portada.

#### Además
Lista de assets para ChatGPT: `design/arte/ASSET_REGISTRY.md` (lo que hay, lo que falta,
fichas §16 y prioridades).

#### Verificación
1440×900 y 1366×768, recorrido de todas las superficies, sin desbordes nuevos; capturas en
`design/capturas/`.

</details>

### 2026-09-25 — Typography migration + full UI coverage audit (dejada por ChatGPT)

<details>
<summary>Enunciado original</summary>

#### Typography migration + full UI coverage audit

##### Contexto
Gabi quiere cambiar la tipografía del juego y, antes de seguir migrando pantallas, verificar si el sistema de UI nuevo está realmente implementado en TODO el juego.

Estado observado en repo:
- `body` todavía usa `'Segoe UI', system-ui...`;
- la voz display usa `Oswald` mediante `--display`;
- hay usos hardcodeados de `'Oswald'` en CSS (por ejemplo `Hub.css`);
- Foundation/Global Shell y la paleta gris perla sí afectan gran parte de la app, pero eso NO implica que NAV/PANEL/CHIP/STAT/TABLE/BUTTON/HUD estén migrados por completo en cada pantalla.

##### Nueva dirección tipográfica a probar
Probar como primera opción:

- **Display / deportiva:** `Barlow Condensed` (600/700)
- **UI / lectura:** `Barlow` (400/500/600)

Razón:
- sigue teniendo identidad deportiva/editorial;
- es menos rígida/estrecha que Oswald;
- funciona mejor para textos de manager, tablas y navegación;
- permite que display y body pertenezcan a la misma familia sin verse iguales.

Usar paquetes Fontsource y empaquetar las fuentes con el build. No depender de fuentes del sistema.

##### Antes de tocar todo: auditoría

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

##### Migración tipográfica

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

##### Prueba visual

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

##### Resultado esperado

Al terminar, actualizar **RESULTADO CLAUDE** con:
- commit;
- fuente implementada;
- lista de pantallas Migrada / Parcial / Legacy;
- qué componentes globales todavía faltan;
- screenshots;
- recomendaciones del próximo lote.

##### Importante
No hacer todavía una refactorización masiva de las pantallas Legacy sin mostrar primero la auditoría y las screenshots con la nueva tipografía.
No cambiar lógica ni datos.

---

</details>

---

# RESULTADO CLAUDE

## 2026-09-28 — Propuesta de rediseño del Tablero (sin implementar)

**Commit:** `1b27462` (rama `claude/game-ui-status-cqi387`). **El juego no cambió.**
Todo está en `design/propuestas/tablero-rediseno/`; el razonamiento completo, en su `README.md`.

### Diagnóstico del Tablero actual
El problema es de composición, no de componentes. La pantalla tiene seis cajas del mismo peso
y el ojo no sabe dónde empezar. La ilustración está encerrada en una card (es la del
Vestuario, repetida). La disponibilidad son tres números sin cara, los avisos son texto
suelto y el plantel son 12 miniaturas con puntos de colores. «Último partido» y los siete
atajos ocupan espacio sin aportar.

### La propuesta: «Lunes en el club. Faltan 5 días, ¿llegamos bien?»
Mantiene la decisión del 15/9 («el partido ordena la semana») y la lleva hasta el final:
- **Escena a pantalla completa** (SCENE-C) detrás de todo, con velos donde va el texto.
- **Hero sin caja:** los escudos grandes, nombres en display, la cuenta regresiva «5 días» como
  dato gigante, la clave del rival y **un solo CTA** naranja.
- **«Esta semana»**, el único panel: hasta 3 avisos (`watchItems`), cada uno con la cara de
  quien lo tiene, una línea y a dónde ir a resolverlo. Subtítulo manuscrito.
- **El plantel de pie**, con bustos sin marco y número de camiseta. El problema va escrito
  debajo («Al borde», «Fundido», «Debe cuota»), y los que no están van aparte y en gris.
  Un solo número de disponibilidad: «10 de 12 en condiciones».
- **Contexto en una línea:** último resultado, tabla y objetivo de la comisión.
- **Se van:** los atajos, el título de pantalla y la card del último partido. El nav y el HUD
  no cambian.
- **Por fase:** marcador en vivo durante el partido y resultado final después, sin mover el
  layout.

### Decisiones abiertas (para Gabi y ChatGPT)
1. **Escena:** ¿la sede o comisión con ventana a la cancha (`bg-tablero-v01`) o el gimnasio
   propio a la tarde? La maqueta usa `fondo-gimnasio.webp` espejado sólo como sustituto.
2. **Caras repetidas:** con bustos grandes se nota que hay 8 caras para 12 jugadores, así que
   esta dirección empuja a T5 (retratos por capas). Mientras tanto se puede usar el busto S.
3. **Panel oscuro translúcido sobre la escena** (como el Vestuario) en vez del gris perla. La
   pantalla queda más oscura: el brillo tiene que venir del arte.
4. **Fuente manuscrita:** la maqueta usa Caveat, que sería una dependencia nueva.
5. **Láminas maestras 1 y 2:** no están en el repo, y la propuesta no se contrastó contra ellas.

### Verificación
Maqueta capturada a 1440×900 y 1366×768, sin desbordes. No hay build ni tests: no hubo
cambios de código.


## 2026-09-25 — Lote de componentes globales

**Commit:** `80f6ce9` (rama `art/vestuario-vertical-slice`). Mergeado en `main` (`ab57d36`).

### Qué cambió (todo por CSS; en TSX sólo el "Cancelar" de la confirmación pasa a `.ghost`)
- **SUBNAV-01:** los 9 estilos comparten estados. Segmentos unidos (`.view-toggle`,
  `.segmented`) y placas sueltas (`.profile-tabs`, `.ps-tabs`, `.ps-filtros`, `.division-tabs`,
  `.steps`). Activo = azul noche + barra naranja abajo + peso; hover = panel elevado; foco
  naranja. En el partido el tablero táctico ya no rellena de naranja cada opción: el único
  relleno naranja de la pantalla es el CTA "Jugar el cuarto".
- **STAT-01:** una sola barra de cinco bloques en dos tamaños (normal / compacta) para
  `.bar-track`, `.mini-medidor` y `.legs-mini`.
- **PANEL-02:** modales, perfiles y hover-card: sin borde naranja, velo azul noche, filete
  azul noche arriba, título display, ícono de evento en azul noche.
- **BTN:** foco visible global (botones y links `role=button`), `.ghost`, hover rojo de `.danger`.
- **HEADER-01:** `h3.card-band` funciona fuera de `.vista`.
- **TABLE-01:** las `<table class="planilla">` dejan de heredar el panel con relieve.
- **Legibilidad Barlow:** `--fs-2xs` 0.62→0.68rem, `--fs-xs` 0.72→0.76rem.

### Qué no cambió
- **CHIP-01** (la fila de persona hecha ~10 veces con markup distinto: requiere TSX por pantalla).
- **Composición de escenas** (Tablero, Previa, Partido, Postpartido): esperan arte.
- **Portada** (sistema propio; se preservó su selector de dificultad).
- **Escala `ui-*` como clases** (sólo se subieron los dos tamaños chicos).
- `.qs-*` y demás CSS muerto de la auditoría: sin borrar todavía.

### Verificación
Recorrido de las 24 superficies a 1440×900 y 1366×768: 0 textos desbordados, 0 errores; nav,
HUD y página sin desborde horizontal; el Tablero sigue entrando sin scroll a 1366. Build y
196 tests OK.

### Screenshots (`design/capturas/2026-09-25-componentes/`)
- `comparacion-antes-despues-1440.webp`: partido, ficha, semana, plantel, liga, confirmación.
- `todas-las-superficies-1440.webp`: las 24 superficies después del lote.
- `1440-*` / `1366-*`: partido, ficha, tablero, plantel.

### Assets
Lista completa en **`design/arte/ASSET_REGISTRY.md`**: lo que hay (17 archivos verificados,
2 cabeceras sin uso), lo que falta por prioridad con fichas §16 (P1: `bg-tablero`,
`bg-previa`, `bg-partido`, `bg-postpartido-victoria/derrota`), reglas técnicas de entrada.
**Pedido a ChatGPT:** revisar las fichas P1, aprobar o ajustar, y decidir qué hacer con el arte
previo a la Art Bible (`cab-*`, retratos).

### Recomendación del próximo lote
1. **CHIP-01** (componente `PersonaChip` + reemplazo en Vestuario, Tablero, Convocatoria,
   Quinteto, Partido): es lo que más falta para que las listas se lean como juego.
2. **Integrar los fondos P1** a medida que lleguen (SCENE-C del Tablero primero).
3. Limpiar CSS muerto.

---

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
