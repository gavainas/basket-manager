# Plan: el marco fijo — que el juego deje de scrollear como página

Sale de la sección 6 de [`DIAGNOSTICO_2026-09.md`](DIAGNOSTICO_2026-09.md) y del pedido de
Gabi sobre el formato de pantalla para Steam.

## Qué cambia y qué no

**No se va el scroll. Se va el scroll de la página.**

| | Hoy | Después |
|---|---|---|
| La barra de arriba, la de recursos, el botón de seguir | se van de pantalla al scrollear | **quietas siempre, en el mismo pixel** |
| La planilla de 14, el relato, el mercado, las noticias | scrollean moviendo toda la pantalla | **scrollean adentro de su panel**, con su encabezado congelado |

Es la diferencia entre una página y una ventana de juego. Football Manager nunca scrollea la
pantalla: scrollea la tabla.

## Por qué se nota (más allá de lo estético)

1. **El botón de seguir siempre en el mismo lugar.** Hoy "Armar el quinteto →" queda abajo
   del pliegue en varias pantallas: hay que scrollear para encontrar cómo continuar. Con
   marco fijo se juega de memoria.
2. **Nada se esconde sin aviso.** Hoy la pizarra táctica del Quinteto está medio abajo del
   pliegue: se puede no verla nunca.
3. **Teclado y mando.** El scroll de página pelea con la navegación por teclado; el de panel
   no. Steam es teclado, y Steam Deck es mando.
4. **Capturas y trailer.** Cada captura muestra una pantalla completa. Hoy una del Informe
   muestra un tercio.

## La resolución de diseño

**Piso: 1280×720.** Todo tiene que entrar ahí. Steam Deck es 1280×800 y el portátil más
común es 1366×768, así que el piso los cubre a los dos.

Presupuesto de alto útil a 1280×720: `720 − 52 (barra superior) − 64 (barra de recursos)` ≈
**604 px de contenido**. A 1920×1080 son ~950 px, y el layout tiene que *agrandarse*, no
quedar centrado con madera a los costados.

## La deuda, medida

| Pantalla | 1920×1080 | 1366×768 |
|---|---|---|
| Informe | +91% | +153% |
| Plantilla / Vestuario | +90% | +167% |
| Partido (final) | +58% | +111% |
| Quinteto | +46% | +98% |
| Liga / tabla | +44% | +103% |
| Semana (acciones) | +2% | +43% |
| Rankings | entra | +23% |
| Finanzas | entra | +12% |
| Tablero | entra | +14% |
| El club · Convocatoria | entran | entran |

---

## Tanda A — El marco ✅ (hecha, sep 2026)

Ninguna pantalla cambia de contenido. Se cambia de qué está hecho el contenedor.

- `.app` pasa a grilla de alto fijo: `height: 100dvh; grid-template-rows: auto 1fr auto`.
- **La barra de recursos deja de ser `position: fixed`** y pasa a ser la tercera fila. Se
  borra el `padding-bottom: calc(--recursos-alto + --sp-6)` de `.app-shell`.
- **La barra superior deja de ser `sticky`** y pasa a ser la primera fila.
- `main { min-height: 0 }` — sin esa línea los hijos de una grilla no encogen y la página
  scrollea igual. Es el error clásico y hay que dejarlo escrito.
- Unidad fluida: `--u: clamp(12px, 1.15vh + 0.25vw, 19px)`, y `--ancho-app` deja de ser un
  tope de 1360 px fijo.
- Clases nuevas de panel: `.pane` (grilla `auto 1fr`) y `.pane-body { overflow-y: auto;
  min-height: 0 }`. Son las que después usan todas las pantallas.

**Migración segura:** en esta tanda `main` conserva `overflow-y: auto`. Si no, las 8
pantallas que hoy desbordan quedarían **recortadas** en vez de scrolleadas, que es peor.
Cada pantalla convertida se marca, y la última tanda apaga el fallback.

**Bugs del diagnóstico que toca esta tanda** — dos muertos y uno a medias, conviene ser
exacto:

- ✅ **La barra de recursos tapaba el pie de media docena de pantallas.** Muerto: ya no es
  `position: fixed`, es una fila.
- ✅ **El scroll de página.** Muerto: el marco mide exactamente el viewport.
- 🔶 **El cabezal del partido cortaba las filas de "En cancha".** Se arregló *el error*: se
  pegaba en `top: var(--topbar-alto)` porque el scroller era la ventana, y quedaba un hueco
  de 55 px por el que se veía pasar el contenido. Ahora se pega en `top: 0` del contenedor
  correcto. Lo que queda —que el contenido pase por debajo del cabezal al scrollear— es el
  comportamiento normal de un sticky, y **desaparece en la tanda C**, cuando el marcador
  deje de ser sticky y pase a ser una zona fija de la grilla del partido.

### Resultado medido

Recorrido completo (pretemporada → inscripción → fecha 1 con partido e informe) a
**1920×1080** y **1280×720**, chequeando en cada pantalla que la página no scrollee, que el
marco mida exactamente el viewport, que la barra de arriba esté en `y=0`, que la de recursos
termine en el borde de abajo y que nada quede recortado:

**11 de 11 pantallas en verde en las dos resoluciones, sin errores de consola.** El
contenido que desborda (hasta +1626 px en Plantilla a 720p) scrollea adentro, que es
exactamente lo que la muleta tiene que hacer hasta que su tanda lo rediseñe.

Además, el ancho: `--ancho-app` pasó de 1360 px fijos a seguir al viewport. A 1920 el
contenido usa **1653 px** en vez de 1360 — 293 px menos de fondo de madera al costado.

`npm run build` limpio · `npm run sim -- 40` sin deriva (49.9 / 43.4 / 50.6 de victorias por
estrategia; no se tocó una línea de lógica de juego).

---

## Tanda B — Tablero, Semana y Convocatoria ✅ (hecha, sep 2026)

El arranque del camino semanal. **Acá aterriza la maqueta.**

- **Tablero**: tres columnas — el héroe ilustrado a la izquierda, el escudo + próximo partido
  + acción principal en el medio, los bloques de menú a la derecha. La tira del plantel como
  fila de abajo, con scroll horizontal si pasan de 12. Escudos de club en la tabla (`Crest`
  ya existe, sólo hay que usarlo).
- **Semana**: dos columnas — a la izquierda la tira de días y la decisión de largar la lista;
  a la derecha las 10 acciones del club en panel con scroll interno. De paso, las acciones
  pasan a ser `<button>` de verdad (hoy son divs: no hay foco ni teclado).
- **Convocatoria**: ya entra; sólo adopta el marco.

*Criterio de salida:* el Tablero a 1280×720 sin scroll, y una captura que se pueda comparar
con la maqueta.

---

## Tanda C — Quinteto y Partido ✅ (hecha, sep 2026)

El núcleo del juego, y donde más se gana en sensación.

- **Quinteto**: dos columnas. La **pizarra de la cancha pasa a ser el héroe** de la pantalla
  (hoy está medio escondida abajo); a la derecha el plantel con los botones T/R en panel con
  scroll interno. Arriba, las 5 posiciones como tira fina.
- **Partido**: tres zonas. Arriba fijo el marcador con los cuartos. Izquierda: cancha y banco
  + piernas. Derecha: el relato scrolleando solo hacia abajo. Abajo: la pizarra táctica como
  barra compacta y **el botón de "Jugar el cuarto" siempre en el mismo lugar**. Cuando una
  incidencia bloquea el botón, el motivo va **en el botón**, no en letra chica.

*Criterio de salida:* un partido completo a 1280×720 sin tocar la rueda del mouse.

---

## Tanda D — Informe y Plantilla ✅ (hecha, sep 2026)

Las dos peores (+91% y +90% a 1080p).

- **Informe**: cabecera con el marcador y los cuartos. Izquierda: la planilla del partido.
  Derecha: pestañas internas *Relato · Claves y consecuencias · Vestuario*. **Entra completo
  sin sacar una sola línea** — hoy es una tira vertical de seis bloques, y el problema es la
  forma, no el contenido. Se aprovecha para sumar la planilla del rival.
- **Plantilla**: hoy el panel de **contratar DT ocupa el primer tercio** de una pantalla que
  se llama Plantilla. Se muda a su propia sección (es una decisión que se toma una vez). La
  planilla pasa a ser el héroe, a alto completo, con scroll interno y **fila de encabezados
  fija** — que además arregla el bug de las cuatro cifras sin título.
- **Vestuario** (mapa social) deja de estar apilado abajo y pasa a ser su propia pestaña.
- Se aprovecha para unificar el conteo de plantel, que hoy da cuatro respuestas distintas.

*Criterio de salida:* Plantilla y Vestuario entran a 1280×720; la Plantilla deja de medir dos
pantallas y media.

---

## Tanda E — El resto, y la regla final ✅ (hecha, sep 2026)

- **Liga**: hoy apila tabla + fixture + pirámide + lista de ligas. Son cuatro preguntas
  distintas: pasan a pestañas internas.
- **Rankings, Finanzas, El club**: están cerca de entrar; sólo adoptan el marco.
- **Pretemporada**: el panel "Cómo llega el club" se colapsa a una línea (hoy se repite entero
  en las tres pestañas), y el mercado de 16 scrollea adentro de su panel.
### La muleta no se apaga: se convierte en la regla

El plan decía "se apaga el `overflow-y: auto` del área de contenido; a partir de acá una
pantalla que desborda es un bug". **Haciéndolo se ve que la regla estaba mal enunciada**, y
conviene corregirlo acá en vez de cumplirlo mal.

Lo que molestaba nunca fue que scrollee *contenido*: era que scrollee **la página**, o sea
que se vayan de pantalla la barra de arriba, la de recursos y el botón de seguir. Eso ya no
pasa en ninguna pantalla. El área de contenido está **adentro** del marco, así que cuando
scrollea, el chrome sigue quieto: eso es scroll de panel, que es exactamente lo que el plan
pedía conservar.

La regla final es más fina que "nada scrollea":

- **Las pantallas con una acción** —el camino semanal entero, el Tablero, el Plantel, la
  Liga, la Pretemporada— **tienen que entrar**. Si desbordan, es un bug: el botón que
  continúa el juego no puede quedar fuera de alcance.
- **Las pantallas de lectura** —Rankings, Calendario, Finanzas, Historia, Noticias— pueden
  scrollear su cuerpo. Son listas largas por naturaleza y paginarlas a la fuerza sería peor.
  Su chrome tampoco se mueve.

Por eso el `overflow-y: auto` se queda, y deja de estar comentado como muleta de migración:
pasa a estar comentado como lo que es.

*Criterio de salida:* cero barras de scroll de página en una temporada entera jugada, en las
tres resoluciones, y cero desborde en toda pantalla con acción.

---

## Resultado final, medido

Recorrido completo (pretemporada con sus tres pestañas · inscripción · las cuatro pestañas
del Plantel · las tres de la Liga · Finanzas, El club, Historia, Rankings, Calendario · la
semana entera con partido e informe) a **1920×1080, 1366×768 y 1280×720**:

**22 pantallas × 3 resoluciones = 66 chequeos, 0 fallos.** En ninguna scrollea la página, en
ninguna se mueve el chrome, y ninguna pantalla con acción desborda. Lo único que scrollea su
cuerpo son Rankings, Calendario y Finanzas, que es lo que la regla de arriba permite.

Contra la tabla de deuda del principio: **8 de 13 pantallas scrolleaban a 1080p y 11 de 13 a
1366×768. Ahora, cero.**

`npm run build` limpio · `npm run sim -- 40` sin deriva (49.9 / 43.4 / 50.6).

## La red que hace que no se vuelva atrás

Lo que no se mide, se rompe en tres commits. Esta es la parte que hoy no existe y sin la
cual el trabajo se deshace solo.

**`npm run check:pantallas`**: un Playwright que recorre las 22 pantallas en una partida
real, a **1280×720, 1366×768 y 1920×1080**, y falla si en alguna scrollea la página, se mueve
el chrome o desborda una pantalla con acción. **El script existe y es el que produjo los 66
chequeos de arriba**, pero todavía NO está en el repo: dejarlo acá significa sumar Playwright
como dependencia de desarrollo y un `npx playwright install chromium` de una vez en la
máquina de Gabi. Es una decisión suya sobre el peso del proyecto — con el visto bueno entra
en cinco minutos, y sin él estas cinco tandas se deshacen solas en unos cuantos commits.

Va al CI junto con `build` y `sim`. Cada tanda agrega sus pantallas a la lista de las que ya
tienen que pasar.

---

## Orden, y qué se puede hacer en paralelo

```
A (marco) → B (tablero) → C (quinteto+partido) → D (informe+plantilla) → E (resto)
             ↑
        la ilustración del héroe se pide acá, y se puede pedir desde ahora
```

- **A no depende de ninguna decisión de Gabi**: es fontanería y arregla tres bugs. Se puede
  hacer ya.
- **B sí depende de dos cosas**: confirmar que la barra superior vuelve (revierte la decisión
  de agosto de que "la navegación es el inicio"), y la ilustración del héroe.
- **C, D y E no dependen de nada**: son rediseño de pantallas dentro de la dirección ya
  aprobada.

Total estimado: **5 a 7 sesiones**, con la maqueta visible al final de la segunda.
