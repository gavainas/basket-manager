# UI V1 — guía para llevar el Tablero aprobado a todo el juego

> Estado: vigente desde el 28/9/2026. Referencias: `ART_BIBLE.md` y el Tablero aprobado
> (`design/propuestas/tablero-rediseno/`, v4, y su implementación en `src/ui/Hub.tsx`).
> Esta V1 es **completa y coherente, no pulida**: el arte propio de cada pantalla, el
> refinamiento y la personalidad van en la V2 (ver `design/UI_V2_PENDIENTES.md`).

## La pregunta de cada pantalla

No es «¿cómo le pongo la paleta nueva a este layout?». Es: **si esta pantalla hubiera nacido
junto al Tablero aprobado, ¿cómo sería?** Se puede cambiar la composición, la jerarquía, los
tamaños, los espacios y la agrupación. No se cambia la lógica del juego (`src/game`,
`src/state`): sólo presentación, jerarquía y UX.

## El idioma del Tablero, en siete reglas

1. **La escena se ve.** Cada pantalla pasa en un lugar del club (`ESCENA` y `escenaDe` en
   `App.tsx`). No se tapa con cajas: donde no hace falta un panel, el contenido va directo sobre
   la escena con sombra de texto.
2. **Un héroe sin caja.** Lo más importante de la pantalla va arriba, grande y en voz display
   (`.v1-hero`, `.v1-eyebrow`, `.v1-titulo`, `.v1-cifra`). Es lo primero que se lee.
3. **Una sola superficie de panel por zona.** El panel es la **planilla** (`.card` o
   `.v1-planilla`): azul noche translúcido, filete fino, sombra larga y **sin bandas de color**.
   El título es texto display con una línea punteada abajo. Donde había tres cards apiladas, se
   busca una sola planilla con renglones separados por línea punteada (`.v1-renglon`), o
   directamente texto sobre la escena. Nada de cards por cada fila.
4. **La información secundaria es una frase.** Tres indicadores de apoyo se escriben como los
   diría alguien del club (`.v1-frase`), con las cifras en negrita display. Los chips se usan
   poco: un estado escrito (`.v1-est`, «Al borde», «Fundido») y sólo si es la excepción.
5. **Un solo CTA naranja por pantalla** (`button.primary.v1-cta`), grande, donde termina la
   lectura o en el pie fijo. El naranja es acción, selección o dato clave: nunca decoración.
6. **Las personas son personas.** Cuando la pantalla es sobre gente (plantel, convocatoria,
   vestuario, figura del partido), se muestran con el busto (`Busto`, `FilaDePie` en
   `src/ui/Busto.tsx`) y el estado escrito debajo, no como una grilla de avatares iguales.
   En tablas densas, el avatar chico sigue siendo correcto.
7. **Tres voces.** Display (Barlow Condensed) para títulos y cifras; UI (Barlow) para leer;
   **manuscrita** (Caveat, `--font-mano`, `.v1-mano`) sólo para lo que escribe una mano del club:
   **un** título de planilla por pantalla como mucho, o una nota. Con cinta (`.v1-cinta`) sólo
   la planilla «protagonista» de la pantalla.

## Qué NO hacer

- Restyling: cambiar colores o bordes sobre el mismo layout y darlo por migrado.
- Paneles dentro de paneles; bandas de color en cabezales; más de un naranja.
- Globos, carteles o texto encima de las caras. Escritura a mano en todos lados.
- Mostrar datos que el juego no tiene (dorsal, capitán). Tocar la lógica para lograr un efecto.
- Scroll dentro de paneles (la regla del marco fijo sigue: el contenido scrollea como un solo
  bloque; la excepción es el relato del partido). El pie con la acción queda fijo.

## Técnica

- La paleta vive en `:root` de `src/styles.css` (Paleta A, planillas translúcidas). Los tokens
  viejos (`--panel`, `--text`, `--accent`, `--good`…) apuntan a ella.
- Las piezas compartidas están en `src/ui/v1.css` y `src/ui/Busto.tsx`.
- El CSS propio de una pantalla va en **su propio archivo**, importado desde su componente
  (como `Hub.css`). Se carga después de `styles.css`, así que lo pisa sin pelear por
  especificidad. Las reglas viejas de `styles.css` que ya no se usan se borran al final.
- Verificar a **1440×900 y 1366×768**, sin desbordes ni scroll horizontal. `npm run build` y
  `npm test` en verde.
