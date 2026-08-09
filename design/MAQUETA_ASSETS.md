# Assets de la maqueta de arte (`/#maqueta`)

Cómo se llenan los huecos de foto de la maqueta ([ART_PIPELINE.md](ART_PIPELINE.md),
registro 2026-08-09). **El contrato es por nombre de archivo**: todo lo que aparezca en
`public/maqueta/` con los nombres de abajo se muestra solo, sin tocar código; lo que
falte sigue mostrando su placeholder SVG.

## Cómo entregar los assets

Cualquiera de estas tres vías, de más fácil a más manual:

1. **Los genera Claude en sesión** (recomendada): pedirle "generá los assets de la
   maqueta" en una sesión del repo y aprobar las llamadas a Higgsfield cuando las pida.
   Claude descarga los resultados, los renombra, optimiza y commitea.
2. **Subirlos por GitHub web**: en el repo → branch correspondiente → `public/maqueta/`
   → *Add file → Upload files*. Respetar los nombres exactos de la tabla.
3. **Dejarlos en Google Drive o pasar links**: carpeta de Drive (decirle a Claude el
   nombre) o links directos pegados en el chat; Claude los baja, renombra y commitea.
   ⚠️ Pegar la imagen directo en el chat **no** sirve: Claude la ve pero no puede
   guardar el archivo.

## Lineamientos comunes

- **Sin texto en las imágenes**: todo texto lo pone la UI (la IA inventa letras).
  Agregar siempre al prompt: `no text, no words, no letters, no numbers`.
- **Colores del club**: azul marino y naranja (navy blue and orange).
- **Identidad**: club amateur de barrio, cálido y algo nostálgico — no NBA, no gym
  corporativo, no jugadores que parezcan profesionales (ver prohibiciones en
  ART_PIPELINE.md, Puerta 6).
- **Formato**: JPG (el escudo PNG con fondo transparente). Máx ~1024 px del lado
  largo y ~300 KB por archivo: van al deploy de GitHub Pages y se ven en recuadros
  chicos.
- **Consistencia**: generar cada grupo (íconos / retratos) en una misma tanda con el
  mismo bloque de estilo, cambiando solo la línea del contenido.

**Bloque de estilo base** para anteponer a todos los prompts:

> Photorealistic photo, warm amateur neighborhood basketball club in Uruguay, golden
> indoor court light, slightly nostalgic 90s sports management game aesthetic, navy
> blue and orange club colors, worn real-life objects, natural imperfect look,
> no text, no words, no letters, no numbers.

## Manifiesto

| Archivo | Qué muestra | Encuadre |
| --- | --- | --- |
| `fondo-cancha.jpg` | Cancha techada vacía desde arriba/atrás del aro, madera dorada, luz cálida | Vertical 9:16 |
| `escudo.png` | Escudo del club: franjas azul/naranja, pelota, estrella (sin letras) | 1:1, fondo transparente |
| `icono-lista.jpg` | Planilla de asistencia en tabla con birome | 4:3 |
| `icono-pizarra.jpg` | Pizarra táctica de DT con marcador, X y O | 4:3 |
| `icono-marcador.jpg` | Tablero electrónico viejo con puntos encendidos | 4:3 |
| `icono-tabla.jpg` | Hoja de posiciones impresa, clavada con chinche | 4:3 |
| `icono-calendario.jpg` | Almanaque de pared con fecha marcada en rojo | 4:3 |
| `icono-camiseta.jpg` | Camiseta azul y naranja colgada en percha | 4:3 |
| `icono-cuotas.jpg` | Caja de plata con billetes ordenados (la recaudación de cuotas) | 4:3 |
| `icono-gastos.jpg` | Boletas y recibos arrugados sobre una mesa | 4:3 |
| `icono-rifa.jpg` | Talonario de rifa con números | 4:3 |
| `icono-vestuario.jpg` | Vestuario con lockers de chapa, banco de madera y toalla | 4:3 |
| `icono-fichajes.jpg` | Apretón de manos entre dos tipos comunes en un gimnasio | 4:3 |
| `evento-asado.jpg` | Parrilla encendida con asado, ambiente de patio | 4:3 |
| `retrato-4.jpg` … `retrato-14.jpg` | Retratos del plantel (ver abajo) | 3:4, busto de frente |

## Retratos (la lámina de la Puerta 3)

Once retratos, mismo encuadre para todos: **cabeza y hombros, de frente, camiseta azul
marino con vivos naranjas, fondo neutro oscuro, misma luz**. La variedad es la gracia
(edades, contexturas, tonos de piel, pelos, barbas — gente común que juega al básquet,
no atletas). Sugerencia por dorsal, alineada con el plantel de mentira de la maqueta:

| Archivo | Persona |
| --- | --- |
| `retrato-4.jpg` | ~30 años, pelo corto oscuro, seguro de sí (el base que lleva la voz) |
| `retrato-5.jpg` | ~24, atlético, gesto medio enojado |
| `retrato-6.jpg` | ~28, pelirrojo o castaño claro, sonrisa canchera (el del asado) |
| `retrato-7.jpg` | ~35, entradas marcadas, gesto cansado pero digno |
| `retrato-8.jpg` | ~22, grandote, cara de pibe entusiasmado |
| `retrato-9.jpg` | ~38, pelado o canoso, el veterano de mil batallas |
| `retrato-10.jpg` | ~26, flaco, gesto relajado |
| `retrato-11.jpg` | ~29, barba prolija, sonrisa tranquila (el cumplidor) |
| `retrato-12.jpg` | ~33, robusto con panza incipiente, ceño fruncido |
| `retrato-13.jpg` | ~27, rulos, cara de contento |
| `retrato-14.jpg` | ~30, rasgos marcados, media sonrisa pícara |

## Después de la maqueta

El mismo contrato escala: cada pantalla nueva de la maqueta define primero sus huecos
con placeholder (nombre de archivo + descripción acá), y los assets se generan cuando
el estilo del grupo ya está aprobado. Recién cuando el vertical slice completo pase la
Puerta 4, este arte empieza a entrar al juego real.
