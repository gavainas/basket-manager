# UI V2 — pendientes de arte, polish y personalidad

> Registro abierto el 28/9/2026 al cerrar la UI V1 (ver `UI_V1_GUIA.md` y el changelog).
> La V1 es **completa y coherente, no pulida**: todo lo de acá se dejó a propósito para la
> segunda pasada. Ordenado por lo que más cambia la sensación.

## 1. Arte que falta (lo que más pesa)

Las escenas de la V1 son **arte que ya existía, reusado provisionalmente** (`ESCENA` en
`src/App.tsx`). Cada pantalla necesita la suya, pensada para su composición (fichas en
`design/arte/ASSET_REGISTRY.md`):

| Pantalla | Escena provisional V1 | Qué pide la V2 |
|---|---|---|
| Tablero | `fondo-gimnasio` espejado | `bg-tablero-v01`: gimnasio a la tarde, izquierda y franja de abajo tranquilas, piso en plano bajo con una línea donde se paran los jugadores, luz centro-derecha |
| La semana | gimnasio velado | escena propia de la semana (sede, cantina) |
| Convocatoria | `vestuario-bg` | puede quedarse; revisar encuadre con la fila de pie |
| Quinteto | `fondo-cancha` + cancha en CSS | ilustración de la pizarra/cancha del quinteto (hoy degradé; el círculo central se ve ovalado) |
| Partido | `cab-partido` | `bg-partido-v01` (tribuna, marcador de club) |
| Informe | vestuario (victoria) / `cab-derrota` (derrota) | `bg-postpartido-victoria/derrota-v01`; la escena de derrota es cargada detrás del texto |
| Plantel / Vestuario / CT | `vestuario-bg` | puede quedarse |
| Liga / Calendario / Rankings | `cab-arbitros` | escena propia; hoy las caras de los árbitros quedan detrás del héroe |
| Finanzas / El club / Historia / cierres | `cab-comision` | idem; la vitrina de Historia pide trofeos/placas reales |
| Pretemporada | `cab-bar` | encuadre propio: hoy el velo tapa la cara grande del centro |

**Personas**:
- Sólo 8 retratos por arquetipo para todo el plantel y el mundo: con los bustos grandes se
  nota la repetición (T5, retratos por capas, `design/arte/BRIEFS/`). Un jugador de 23 puede
  verse veterano porque la cara es la del arquetipo.
- Los DT de afuera y el delegado rival no tienen retrato (medallón de respaldo o ícono).
- La ficha espera el cuerpo entero (escala L): cuando exista, cambia sólo el contenido de
  `FichaDePie` (`src/ui/Ficha.tsx`), no el layout.

**Marca**: la portada sigue con el logo como texto.

## 2. Polish de composición

- A 1366×768 scrollean (regla del scroll único, con el pie fijo siempre a la vista): Informe
  ~620 px, Rankings ~280, Plantel ~220, Pretemporada ~360 (mercado ~1070), Partido ~140,
  La semana ~140, Club y Historia ~90. Rankings e Informe podrían partirse o compactarse.
- Cuerpo técnico con DT y la pestaña General de la ficha dejan aire vacío abajo con pocos datos.
- La fila de pie con un solo MVP (Historia) se ve rala.
- El anillo del color rival en la cancha del partido casi no se ve con colores claros.
- Los nombres dentro de las frases del Vestuario podrían llevar su cara.
- La barra de secciones de arriba sigue siendo la de antes (con íconos y teclas): la maqueta
  la simplificaba a texto con subrayado naranja.
- «Inscribir equipo…» aparece también en la otra liga cuando ya hay segundo equipo (al
  tocarlo explica por qué no: comportamiento previo).

## 3. Personalidad y motion

- Animaciones: pasar un jugador a titular/banco, el paso adelante en la fila de pie, el
  marcador en vivo (Art Bible §15).
- Atajos: números para elegir opciones de eventos; teclas para las secciones de la
  pretemporada.
- Más voz del mundo donde el contraste se lee (frases del vestuario en el Tablero ya se
  probaron con globos y se descartaron por carga: buscar otra forma).
- Fin de temporada: la figura del año o el plantel de pie.

## 4. Deuda técnica de la V1

- Cada tanda tiene su CSS por pantalla (`semana.css`, `partido.css`, `informe.css`,
  `plantel.css`, `liga.css`, `club.css`, `bloque-d.css`, `modales.css`, `pretemporada.css`,
  `carrera.css`, `cierre.css`, `portada.css`). Hay piezas repetidas que merecen subir a
  `v1.css`/`Busto.tsx`: la cara redonda (`Cara` en `semana/comun.tsx`, `.bd-cara` en
  `bloqueD.tsx`, `.tablero-cara`), el título de planilla con línea punteada (`.bd-tit`) y
  los pies fijos.
- `styles.css` todavía tiene reglas que las pantallas nuevas pisan (p.ej. `.modal`,
  `.profile`, velos): consolidar en un solo lugar.
- El chunk del juego pasó de ~627 kB a ~700 kB (más TSX de presentación).
