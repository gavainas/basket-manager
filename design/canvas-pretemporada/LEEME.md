# Canvas de la pretemporada — cómo se muestran las ligas y los fichables

Ocho artboards para decidir **mirando** dos cosas que Gabi señaló en sep 2026 ("no me
gusta el display de cómo aparecen las ligas y los jugadores"), con los **datos reales de
una partida** y los tokens exactos de `src/styles.css`.

No se discute la dirección: papel claro, Oswald, relieve y naranja reservado a la acción
siguen aprobados (Puerta 2 de [ART_PIPELINE.md](../ART_PIPELINE.md)). Lo que se elige acá
es **cómo se ordena la información** en dos listas.

## Página 1 — Elegir liga

> **Decidido y hecho (sep 2026).** Gabi: *"La D quedó bien. Los escudos después los
> inventamos, ahora poné placeholder."* D está implementada en `ui/PreseasonView.tsx` +
> el bloque `.liga-tabla` de `styles.css`, con `LeagueCrest.tsx` como **placeholder
> declarado** (ver abajo). D2 queda archivada: era D con más color y nadie la pidió.

**Ronda 2 (sep 2026).** Gabi: *"quedaron mejor. Creo que la A y la C son muy parecidas. La B
me gusta la diferencia de colores. Capaz se puede hacer algo combinado y luego agregar
logos de esas ligas."* Tenía razón: A y C son las dos una tabla y lo único que cambia es
cuánta prosa sobrevive. De ahí salieron **D** y **D2**, que se llevan la estructura de C y
el color de B, y la hoja de escudos.

| Archivo | Qué es |
| --- | --- |
| `Main.dc.html` | **D · La fila con color y escudo.** La propuesta. La estructura de C —datos en columnas alineadas, para comparar sin leer— más la identidad de B: cada liga con su color como lomo de 6 px y su escudo a 44 px. |
| `LigaD2.dc.html` | **D2 · El día pintado entero.** La misma fila, con el bloque del día pintado del color de la liga, como el cabezal de un afiche. Es D con más color; están al lado para elegir cuánto. |
| `Escudos.dc.html` | **La hoja de escudos**, a 96 / 44 / 18 px. El chico es el que manda: es el que va en la fila de una tabla. |
| `LigaB.dc.html` | **B · La cartelera del club.** Cada liga es un afiche con **el día enorme**. **De acá sale el color.** La de más carácter, la peor para comparar la ficha. |
| `LigaC.dc.html` | **C · La fila comparable.** **De acá sale la estructura.** Una fila por liga con los datos en columna y una sola línea de prosa que conserva la voz. |
| `LigaA.dc.html` | **A · La tabla pura.** La hermana fría de C: filas de 36 px, cero prosa. Archivada. |
| `LigaActual.dc.html` | **Hoy.** Cuatro cards con un párrafo de cinco líneas y 4-6 chips iguales donde `$300` pesa lo mismo que `9 fechas`. Para elegir hay que leer las cuatro y comparar de memoria; los cuatro botones son contornos naranjas idénticos, así que ninguno es *la* acción. |

### Los escudos de liga: dos cosas que hay que saber antes de implementar

1. **`League` no tiene ni colores ni escudo.** En `game/types.ts` sólo tiene `id`, `name`,
   `kind`, `divisionCount` y `rules`. El color que se ve en B, D y D2 **está inventado en
   el mockup**: para que exista hacen falta tres campos nuevos (dos colores y una silueta).
2. **La propuesta es que sean procedurales**, con el mismo generador que ya hace los
   escudos de club (`game/crest.ts` + `ui/Crest.tsx`), pero con su propio juego de siluetas
   para que un escudo de liga no se confunda con el de un club. Es la regla del sistema
   —"lo que escala con los datos es procedural"— y el roadmap quiere ligas que aparezcan y
   desaparezcan según el año: así sumar una liga es sumar una fila de datos, no encargar un
   dibujo.

Los colores del mockup (azul institucional para la Universitaria, grafito y dorado para la
nocturna del Centro, verde para el Comercio, ladrillo para la Plaza, pizarra para
Montevideo, violeta para la +35) están elegidos **lejos del naranja de acción** a propósito.

### Cómo quedó implementado

1. **`League` ahora sí tiene identidad.** `abbr` y `colors: { base, alt }` en
   `game/types.ts`, cargados para las seis ligas en `data/worldData.ts` con los colores de
   arriba. `abbr` se **declara** y no se deriva del nombre: "Liga del Centro" y "Liga del
   Comercio" colapsarían las dos en "LC".
2. **`ui/LeagueCrest.tsx` es el placeholder**, y lo dice en su propio encabezado. Dibuja
   silueta + color + iniciales, con cinco siluetas a propósito distintas de las de club.
   Se reemplaza sin tocar ninguna pantalla: la firma `<LeagueCrest league={l} size={44} />`
   no cambia cuando el escudo de verdad exista. **El generador procedural de la propuesta 2
   sigue sin aprobar** — es lo que hay que decidir cuando toque Puerta 3.
3. **Dos trampas que aparecieron al implementar**, por si vuelven:
   - `state.world.leagues` **está vacío durante la pretemporada** (`world.ts` lo llena
     recién al construir el mundo de la temporada), así que la fila lee de `LEAGUES` de
     `data/worldData.ts`. Además la celda del escudo se dibuja siempre, aunque la liga no
     aparezca: en una grilla de diez columnas, un hijo que falta corre todo lo demás una
     columna y la fila se rompe entera sin avisar.
   - En el piso de diseño (1280x720) las ligas no entraban y se veían tres. Elegir liga es
     comparar, y una comparación que hay que scrollear no es una comparación: hay una
     media query **por alto** (`max-height: 800px`) que apaga la frase y la bajada. Se
     dispara por alto y no por ancho porque en un 1920x800 pasa exactamente lo mismo.

## Página 2 — Los fichables

| Archivo | Qué es |
| --- | --- |
| `MercadoActual.dc.html` | **Hoy.** El nivel aparece de tres formas en la misma fila (`71–85`, `≈69`, `★★★★☆`), las cards quedan de alturas desparejas según cuántos chips le toquen a cada uno, `Exigencias: ? (contactalo)` se repite dieciséis veces y hay dieciséis botones a ancho completo. Entran 5 de 16. |
| `MercadoA.dc.html` | **A · La planilla del ojeador.** La propuesta: la misma anatomía que el Plantel de la dirección D ya aprobada. Los chips se van —el conocimiento pasa a ser un sello y lo que no sabés es un `?` en su columna—. Entran 10-14 de 16. |
| `MercadoB.dc.html` | **B · La ficha de altura fija.** Sigue siendo grilla de cards, pero **todas miden 196 px** pase lo que pase, así que la escalera desaparece. Conserva el retrato grande. |
| `MercadoC.dc.html` | **C · Lista y ficha grande.** Los 16 a la izquierda, la ficha del elegido a la derecha con retrato de 96 px, **un solo botón Contactar** y un bloque de "lo que todavía no sabés". Es la que mejor prepara el compromiso oculto (T2 del [diagnóstico](../DIAGNOSTICO_2026-09.md)). |

`canvas.json` define las dos páginas, dónde se apoya cada artboard, sus títulos y las notas
con el a favor y el en contra de cada tratamiento.

## Los retratos

Son los de `public/arte/` (`p-*.webp`), los mismos que usa el juego: el canvas los lleva
embebidos y **no se copian a esta carpeta**. Se repiten a propósito entre fichables — son
ocho retratos para dieciséis nombres, que es el problema abierto de la Puerta 3.

## Volver a armarlo

El `.html` empaquetado (el editor de Claude Design más el contenido) **no se versiona**:
está en `.gitignore` y se regenera desde estos archivos con la skill `design` de Claude
Code, pasando los once `--artboard`, los seis `--image` de `../../public/arte/` y
`--canvas canvas.json`.

Publicado el 2026-09-05:
<https://claude.ai/code/artifact/06cfc3a0-29ff-4897-baff-8e2766f21fe9>

Si Gabi lo editó en el canvas, la versión buena es la del Artifact: antes de tocar nada
acá, hay que extraerla de vuelta (`--extract`) y no pisarla.
