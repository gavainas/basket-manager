# Identidad del club — personalización (primera versión)

Rama `preview/identidad-club`. **No está en `main`**: se prueba en una preview aparte
(ver [Despliegue de prueba](#despliegue-de-prueba)).

Al empezar una partida, el manager funda su club: nombre, barrio, colores, escudo,
camiseta y cancha. Esa identidad vive dentro de la partida y viste el juego mientras
dura. Las mecánicas —deportivas, sociales y económicas— no se tocan: esto es nombre,
color y dibujo.

## Qué se elige

| Campo | Límites | Dónde se ve |
| --- | --- | --- |
| Nombre del club | 3 a 28 caracteres | Barra superior, inicio, noticias, historia, tablas |
| Nombre corto | 2 a 18 | Reservado para tablas y chips |
| Iniciales | 1 a 3 letras | Escudo |
| Barrio y ciudad | hasta 24 cada uno | Bajo el nombre del club; el barrio es el de la cancha |
| Color principal y secundario | 14 colores + selector libre | Escudo, camiseta, barra, fichas del plantel |
| Escudo | 5 siluetas × 6 particiones × 5 símbolos × 3 opciones de estrellas | Barra, inicio, tabla de la liga, fichas |
| Camiseta | lisa · franjas · banda | Vista previa del editor y ficha del club |
| Cancha | 3 a 30 caracteres | Calendario (dónde se juega de local) |

Sin carga de imágenes: todo es SVG dibujado por código, igual que los escudos del resto
de la liga (`src/game/crest.ts`, `src/ui/Crest.tsx`, `src/ui/Kit.tsx`).

El editor abre al elegir el modo de partida y **viene con un club completo cargado**: se
puede tocar "Fundar el club y empezar" sin editar nada. Cuatro presets dan el punto de
partida. La vista previa muestra escudo, camiseta y una muestra del encabezado real.

## Dónde vive el dato

`ClubIdentity` (`src/game/identity.ts`) se guarda en `state.club.identity`, dentro de la
partida, y se restaura con ella.

**Es opcional a propósito y `SAVE_VERSION` no sube (sigue en 23).** `loadGame` descarta
cualquier save cuya versión no sea exactamente la actual, así que subirla habría borrado
las partidas guardadas. En vez de eso, `identityOf(state)` deriva una identidad por
defecto para las partidas que no la traen: toma el nombre que ya tenía el club y sus
iniciales, y el resto son los valores de siempre. Una partida vieja se ve exactamente como
antes y sigue avanzando (verificado: ver más abajo).

`buildWorld` lee la identidad para el club del usuario: nombre, colores y cancha. Los
rivales no cambian.

## Sistema de color

Dos colores elegidos → una paleta derivada (`paletteOf`), expuesta como variables CSS por
`<IdentityTheme>` (`src/ui/IdentityTheme.tsx`). **Ninguna vista escribe un color de club a
mano**: todas leen variables.

| Variable | Qué es |
| --- | --- |
| `--club-primary` / `--club-secondary` | Los dos colores, tal cual |
| `--club-on-primary` / `--club-on-secondary` | Tinta legible sobre cada uno |
| `--club-chrome` | El color del club corrido hasta leerse sobre la barra grafito |
| `--club-panel` | Ídem sobre panel claro; es el que pinta bandas |
| `--club-on-panel` | Tinta legible sobre `--club-panel` |
| `--club-portrait` / `--club-portrait-ink` | Fondo de las fichas del plantel |
| `--club-wash` | Relleno muy suave para superficies grandes |

Reglas:

1. **El contraste se calcula, no se elige.** `readableOn()` corre el tono (manteniendo el
   matiz) hasta alcanzar 4.5:1 contra el fondo donde va a caer. Un club negro no
   desaparece sobre la barra grafito ni uno blanco sobre el panel.
2. **Si el principal es casi blanco, manda el secundario** para los fondos grandes: un
   club de camiseta blanca igual tiene que verse.
3. **El semáforo no es del club.** `--good`, `--warn` y `--bad` nunca se tocan: una lesión
   se lee igual en todos los clubes. Tampoco el naranja de acción ni los colores de área
   (ver [SISTEMA_VISUAL.md](SISTEMA_VISUAL.md)).
4. **Alcance acotado.** Las variables viven en el contenedor del tema, no en `:root`. El
   menú principal y las pantallas de validación quedan fuera. El contenedor usa
   `display: contents`, así no mueve el layout.

Las reglas que visten de club piezas que ya tenían color de área están juntas al final de
`src/styles.css`, para que ganen por orden y no por especificidad inflada.

## Qué viste la identidad hoy

- **Barra superior**: escudo, nombre en el color del club, barrio y ciudad, y una banda
  del color del club abajo. La barra de recursos cierra con el mismo filete.
- **Inicio**: escudo grande, filete superior del panel central, y la tira del plantel con
  su cabezal y el fondo de cada ficha en el color del club (lo más parecido a la
  equipación que permite la estructura actual).
- **Mundo**: el club del usuario lleva sus colores en la tabla de la liga y su cancha en
  el calendario.

Lo que **no** cambia: los colores de área (Partidos azul, Plantel mostaza, Finanzas
violeta…), el semáforo y el naranja de acción.

## Assets pendientes

La referencia aprobada (ilustración 2D, personajes expresivos, club de barrio) todavía
pide piezas que no se generaron en esta tarea — no se usaron servicios de pago, como se
pidió. Lo que falta, con su integración ya preparada:

| Asset | Formato y medida | Dónde entra | Estado |
| --- | --- | --- | --- |
| Camiseta ilustrada por diseño (lisa/franjas/banda) | SVG o WebP 512×512, fondo transparente | Reemplazaría el dibujo vectorial de `Kit.tsx` en la ficha del club | **Provisional**: hoy es SVG por código, funcional y coloreado por el club |
| Retratos del plantel con la camiseta del club | WebP 512×512 con alfa, un juego por diseño de camiseta | `Retrato.tsx`; hoy el club solo cambia el fondo de la ficha | **Pendiente**: los ocho retratos actuales llevan ropa propia, no la del club |
| Fondo de cancha por club | WebP 1920×1080 | `.fondo-app`; hoy es único para todos | **Pendiente** |
| Ilustración de "fundación del club" | WebP 1600×900 | Cabecera del editor | **Pendiente**: el editor hoy no lleva arte |

Nada de lo anterior bloquea el uso: lo implementado funciona con los assets que ya existen
en el repo.

## Despliegue de prueba

La versión publicada (`main` → GitHub Pages) **no se toca**. El workflow actual
(`.github/workflows/deploy.yml`) sube un único artefacto de Pages por repositorio, así que
una segunda URL no puede salir de ahí sin reemplazar la primera.

La preview de esta rama se publica como **Artifact de claude.ai** con el contenido de
`dist/`: una URL privada que abre en computadora y celular, sin instalar nada.

- **Guardados aislados**: el juego guarda en `localStorage` bajo `basket-manager-save-v1`,
  y `localStorage` es por origen. La preview corre en un dominio distinto al de
  `gavainas.github.io`, así que su partida es otra y no pisa la del juego habitual.
- **Actualizar**: `npm run build` y volver a publicar el mismo artifact (misma URL).
- **Retirar**: borrar el artifact. No afecta a `main` ni a la versión publicada.

## Verificación hecha

Automatizada con Chrome headless (escritorio 1400×900 y celular 390×844), recorriendo el
juego de punta a punta:

- Crear club (editor), entrar al juego y ver la identidad en la barra y en el inicio.
- Recargar y continuar: nombre, escudo y colores se conservan.
- Navegar a Plantilla y volver al inicio.
- Avanzar la semana, pasar lista, armar el quinteto, jugar los cuatro cuartos y llegar al
  informe del partido.
- Abrir una partida sin `identity` (una partida vieja): carga, muestra el club de siempre
  y sigue avanzando.
- Tres identidades comparadas: amarillo/negro, blanco/azul y violeta/blanco.

Contraste medido sobre los píxeles que pinta el navegador (WCAG, texto ≥ 4.5:1):

| Identidad | Nombre sobre la barra | Cabezal del plantel |
| --- | --- | --- |
| Amarillo y negro | 7.35:1 | 4.62:1 |
| Blanco y azul | 4.58:1 | 7.11:1 |
| Violeta y blanco | 4.61:1 | 9.02:1 |

## Limitaciones conocidas

- El **nombre corto** se guarda pero todavía no reemplaza al nombre largo en las tablas:
  las vistas de liga siguen usando el nombre completo.
- Los **retratos del plantel** no visten la camiseta del club (ver assets pendientes).
- El editor no permite **subir imágenes**, por decisión de alcance de esta primera versión.
- `favicon.ico` da 404 en consola; es anterior a este trabajo y no afecta al juego.
