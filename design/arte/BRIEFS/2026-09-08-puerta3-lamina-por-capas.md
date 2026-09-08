# La lámina de la Puerta 3, armada con el sistema de capas — 2026-09-08

**Estado:** PENDIENTE (nada generado; espera el "dale" de Gabi)
**Costo estimado:** paso 1 ≈ 12 créditos · paso 2 ≈ 60 créditos · **Puerta:** 3

## Para qué

Hoy la foto del jugador es uno de **ocho** retratos de arquetipo (`public/arte/p-*.webp`),
y un plantel tiene catorce: dos del mismo arquetipo comparten cara y se disimulan con un
espejo y un tono distinto de azul. Es la limitación conocida de la Puerta 2.

La Puerta 3 cambia de enunciado con este brief: **el retrato deja de ser un archivo y pasa a
ser una receta**. Se generan **piezas** (capas) en el estilo aprobado, con el mismo encuadre
y los mismos puntos de anclaje, y el juego las compone en runtime por la semilla del jugador
(`Player.appearance`, que ya existe y ya define edad, pelo y barba: ver
[`../../AVATAR_SYSTEM.md`](../../AVATAR_SYSTEM.md)). Lo que se aprueba no son doce dibujos
sueltos: es **una lámina de doce caras armadas con el sistema**, para ver si dos jugadores
del mismo arquetipo en la misma pantalla se ven distintos y siguen siendo del mismo juego.

*Criterio de salida de la T5 del diagnóstico:* dos jugadores del mismo arquetipo en la
misma pantalla no se ven iguales.

## En dos pasos, para no gastar de más

**Paso 1 — la prueba de registro (≈ 12 créditos).** El riesgo técnico es que las capas
generadas por IA no calcen entre sí (un pelo dibujado para una cabeza no apoya bien sobre
otra). Antes de la lámina se genera lo mínimo para probarlo: **1 base, 3 pelos y 2 barbas**,
se componen en el navegador (galería `/#retratos`, fila nueva "Capas") y se mira si
encajan. Si no encajan, se ajusta la receta (o se descarta la idea de capas por IA y se
vuelve a pensar) **sin haber pagado la lámina**.

**Paso 2 — la lámina (≈ 60 créditos).** Con el registro validado, el lote completo de piezas
de abajo, y la lámina de 12 caras compuesta con `appearance` reales de un plantel.

## Qué se genera (lista cerrada, con nombre de archivo)

Todo a **1024×1024, fondo transparente, encuadre de cabeza y hombros de frente**, el mismo
para todas las piezas. Los archivos van a `public/arte/retrato/`.

| Capa | Piezas | Archivos | Nota |
| --- | --- | --- | --- |
| Base (cara + cuello + hombros con camiseta lisa) | 4 formas × 3 tonos = 12 | `base-<forma>-<tono>.webp` (`ovalada`, `redonda`, `cuadrada`, `alargada` × `claro`, `medio`, `oscuro`) | La forma de la cara y el tono de piel viven juntos: separarlos con tinte sobre un solo dibujo destiñe la sombra |
| Expresión (ojos + cejas + boca) | 4 | `expresion-<n>.webp` (`neutra`, `sonrisa`, `bronca`, `cansado`) | Sobre la base `ovalada-medio`; si el registro del paso 1 aguanta, sirven para las cuatro formas |
| Pelo | 8 | `pelo-<n>.webp` (`rapado`, `corto`, `tupido`, `rulos`, `despeinado`, `entradas`, `pelado`, `canoso`) | Con la línea de nacimiento en el mismo lugar en todos |
| Barba | 5 | `barba-<n>.webp` (`bigote`, `candado`, `completa`, `desprolija`, `chivita`) | La sexta es "nada" y no se genera |
| Camiseta | 2 | `camiseta-<n>.webp` (`lisa`, `con-numero`) | El color lo tiñe el club en runtime (los colores viven en `club.colors`) |

Total del paso 2: 31 piezas. Con 12 bases × 4 expresiones × 9 pelos × 6 barbas hay 2.592
combinaciones sin contar camiseta y color: sobra para un mundo de cientos.

## Receta (modelo, referencia, tamaño, post-proceso)

- **Modelo:** `nano_banana_pro` (Higgsfield), el mismo del lote de agosto.
- **Referencia de estilo:** `public/portada.webp` como `image_references` en **todas** las
  generaciones. Sin ella el estilo se va (aprendido con las cabeceras: ver
  `public/arte/LEEME.md`).
- **Referencia de encuadre:** para pelos, barbas y expresiones, además de la portada, pasar
  como segunda referencia la **base `ovalada-medio` ya generada**, para que la pieza se
  dibuje sobre esa cabeza y no sobre una inventada.
- **Tamaño:** 1024×1024, cuadrado.
- **Post-proceso:** quitafondos del mismo servicio → recorte al canal alfa → WebP con alfa,
  calidad 85 → nombre de archivo del brief. Los PNG no van al repo.
- **Anclaje:** la base lleva los ojos en la línea del 42% del alto y la barbilla en el 72%.
  Cada pieza se genera con esa instrucción y se verifica en la galería.

## Prompts (textuales)

Prefijo común a todas las piezas, delante del prompt de cada una:

> Ilustración 2D de película animada, relleno plano sin contorno, dos tonos de sombra por
> forma como máximo, sin degradados ni textura ni 3D, paleta cálida saturada, caricatura
> cálida de una persona específica de un club de básquet amateur de barrio. Cabeza y hombros,
> de frente, cabeza levemente agrandada. Fondo transparente. Mismo estilo que la imagen de
> referencia.

**Base** (uno por combinación; ejemplo `ovalada-medio`):

> Hombre adulto de cara ovalada y tono de piel medio, sin pelo y sin barba (cabeza rapada
> lisa para apoyar piezas encima), expresión neutra con la boca cerrada, cuello y hombros con
> una camiseta de básquet lisa gris. Ojos a la altura del 42% de la imagen, barbilla al 72%.

Variantes: `redonda` ("cara redonda y cachetona"), `cuadrada` ("mandíbula cuadrada y cuello
ancho"), `alargada` ("cara alargada y fina"); tonos `claro` / `medio` / `oscuro`.

**Expresión** (sobre la base `ovalada-medio` como referencia de encuadre):

> Solo los ojos, las cejas y la boca de esta misma cara, en la misma posición exacta, con
> expresión de <sonrisa franca / bronca contenida con el ceño fruncido / cansancio con los
> párpados caídos>. Todo lo demás transparente.

**Pelo** (ejemplo `rulos`):

> Solo el pelo de esta misma cabeza, en la misma posición exacta: rulos cortos y tupidos,
> castaño oscuro, con la línea de nacimiento en la frente donde la tiene la referencia. Todo
> lo demás transparente.

Variantes: `rapado`, `corto prolijo`, `tupido con volumen`, `despeinado`, `con entradas
marcadas`, `pelado con pelo sólo a los costados`, `canoso corto`.

**Barba** (ejemplo `candado`):

> Solo el vello facial de esta misma cara, en la misma posición exacta: candado prolijo
> castaño oscuro. Todo lo demás transparente.

**Camiseta**:

> Solo la camiseta de básquet sobre estos mismos hombros, en la misma posición exacta, color
> blanco liso para teñir después (<sin número / con el número 7 en el pecho>). Todo lo demás
> transparente.

## Qué se valida al recibirlo

En la galería de validación (`/#retratos`, fila nueva "Capas"), a 24, 48 y 96 px:

1. **Registro:** pelo y barba apoyan sobre las cuatro formas de base sin flotar ni cortar.
2. **Familia:** una fila de doce compuestos al lado de los ocho retratos de arquetipo
   actuales se ve del mismo juego.
3. **Distinción:** dos jugadores del mismo arquetipo, compuestos con sus `appearance`,
   se distinguen a 48 px sin leer el nombre.
4. **La lista de la Puerta 3** del pipeline: distintas edades, tonos de piel, complexiones
   (la panza va por cuerpo entero, no entra acá), pelados y con rulos, con y sin barba, las
   cuatro expresiones, un lesionado (curita como accesorio: fuera de este lote), un
   veterano suplente y una figura.

Pregunta de aprobación, textual del pipeline: *¿Quiero pasar muchas horas viendo a estos
personajes?*

## Qué NO entra en este lote

- Accesorios (vincha, lentes, aro, curita): segundo lote, si la lámina se aprueba.
- Cuerpo entero del héroe: decisión de Gabi vigente, "cuando haya más arte".
- Reemplazar los ocho retratos de arquetipo: siguen siendo la foto oficial hasta que la
  Puerta 3 cierre. Si la lámina se aprueba, el sistema los reemplaza en todo el juego y los
  ocho quedan como referencia de estilo.
- Ningún cambio de paleta, tipografía ni layout: la UI está aprobada (Puerta 2).
