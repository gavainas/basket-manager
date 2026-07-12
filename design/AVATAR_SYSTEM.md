# Sistema de retratos — generador modular

Retratos procedurales de cabeza y hombros para todos los jugadores del juego.
**Sin imágenes externas, sin IA en tiempo de ejecución, sin servicios de red**:
todo es SVG dibujado por código, determinístico y serializable.

## Arquitectura

| Archivo | Rol |
| --- | --- |
| [`src/game/appearance.ts`](../src/game/appearance.ts) | Lógica pura (sin React): tipo `Appearance`, cantidades de variantes por capa y derivación determinística desde una seed. |
| [`src/ui/Avatar.tsx`](../src/ui/Avatar.tsx) | Render SVG por capas: cara, orejas, pelo, barba, ojos, cejas, nariz, boca, marcas de edad, accesorios, cuello y camiseta. |
| [`src/ui/AvatarGallery.tsx`](../src/ui/AvatarGallery.tsx) | Pantalla de validación (solo dev): abrir el juego y navegar a `/#retratos`. |

## Determinismo y persistencia

- La seed es el **id del jugador**: misma seed → misma cara, entre pantallas,
  sesiones y partidas. Para los fichables del mercado la seed es el id del
  fichable, y `marketToPlayer` la reutiliza: la cara que viste en el mercado
  es la que llega al plantel.
- Cada capa se elige con un **hash independiente** (`FNV-1a(seed + ':' + capa)`),
  así agregar variantes a una capa **no** cambia las demás capas.
- **`Player.appearance` se guarda en el perfil** desde el save v15: se setea al
  crear cada jugador (`buildPlayer`, `createRecruit`, `marketToPlayer`) y la
  migración v14→v15 la completa en saves viejos. Una vez guardada, la cara queda
  **congelada** aunque el generador gane variantes.
- Los jugadores del mundo (`WorldPlayer`) no la guardan: se deriva del id al
  renderizar. Si crecen las variantes, alguna cara rival puede cambiar; asumido.

**Regla de oro para ampliar**: agregar variantes SIEMPRE al final de cada lista y
nunca reordenar ni borrar — los índices derivados dependen del orden.

## Capas y variantes actuales

| Capa | Variantes | Nota |
| --- | --- | --- |
| `faceShape` | 8 | ovalado, redondo, alargado, cuadrado, fino, robusto, anguloso, cachetón |
| `skinTone` | 12 | rampa de claro a oscuro |
| `eyes` | 5 | normal, achinados, grandes, caídos, entrecerrados |
| `eyebrows` | 4 | rectas, arqueadas, gruesas, finas |
| `nose` | 5 | corta, ancha, aguileña, redonda, larga |
| `mouth` | 3 | fina, media, ancha (la curva la pone la expresión) |
| `ears` | 3 | chicas, medias, grandes |
| `hair` | 12 | rapado, corto, tupido, flequillo, rulos, casquete, despeinado, prolijo, media melena, raya al medio, erizo, afro |
| `hairColor` | 8 | negro→rubio→colorado + **gris y blanco (canas)** |
| `baldness` | 4 | completo, entradas, coronilla, pelado |
| `facialHair` | 8 | nada, bigote, candado, completa, desprolija, chivita, patillas, bigote caído |
| `ageDetail` | 4 | nada, ojeras, ojeras + frente, arrugas |
| `expression` | 5 | neutro, sonrisa, malhumorado, cansado, confiado |
| `accessory` | 6 | nada, vincha, lentes, aro, curita, cinta fina |

Combinaciones teóricas: ~10^11. Ampliar hacia las cantidades del brief (20 caras,
35 pelos, 30 barbas, etc.) **solo cuando las piezas actuales se repitan demasiado**.

## Identidad amateur

La edad del jugador **sesga** la apariencia (en `appearanceFromSeed(seed, age)`):

- **Calvicie**: casi nula antes de los 25; a los 39+ la mayoría tiene entradas,
  coronilla o está pelado.
- **Canas**: probabilidad que crece desde los ~30 (gris o blanco).
- **Marcas de edad**: ojeras → línea de frente → patas de gallo y surcos.
- **Barba**: más frecuente que en un plantel profesional (60%).
- **Accesorios**: con moderación (20%): vincha, lentes, aro, curita.

La panza y el estado físico NO se representan en el retrato (encuadre de cabeza y
hombros): van por atributos, descripciones y futuras ilustraciones de cuerpo entero.

## Consistencia

- Mismo encuadre y ángulo (de frente, cabeza y hombros), viewBox `0 0 100 100`.
- Legible de 24 a 96 px (validar en `/#retratos`, fila "Lectura en distintos tamaños").
- Fondo transparente: el contenedor `.avatar` pone fondo y borde; la camiseta toma
  el color del club vía prop `jersey` (por defecto `var(--accent)`).

## Uso

```tsx
<Avatar
  seed={p.id}
  age={p.age}
  appearance={p.appearance}   // persistida en el perfil (save v15+)
  jersey={club?.colors[0]}    // color de camiseta; default: naranja del club
  expressionOverride={2}      // pisa la expresión (2 malhumorado, 3 cansado)
  title={p.name}
/>
```

Integrado en: `PlayerCard` (plantel), `PlayerProfile` (ficha), `WorldPlayerProfile`
(rivales, con la camiseta de su club), `WeekView` (pizarra del quinteto, banco y
pasando lista), `PreseasonView` (plantel y mercado) y `EventModal` (participantes).
La expresión refleja el estado: molesto/al borde → malhumorado, lesionado → cansado.

## Etapa 3 (hecha)

- **Gorra** (`cap` en `Avatar`): solo en eventos festivos (`CAP_EVENTS` en
  `EventModal`), nunca en la ficha deportiva; ~1 de cada 3 la usa (determinístico
  por id). Con gorra, el pelo solo asoma por los costados.
- **Expresión ligada a la emoción postpartido** (`EMOTION_EXPRESSION` en
  `humanState.ts`): la cara del chat del grupo y del informe refleja el `PlayerMood`.

## Etapa 4 (pendiente)

- Retratos en más listas (rankings, box scores) si la lectura lo pide.
- Ilustraciones de cuerpo entero (ahí sí entra la panza) a futuro.
- Exportación a PNG con fondo transparente si hiciera falta fuera del juego.
