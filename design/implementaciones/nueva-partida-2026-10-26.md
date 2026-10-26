# Nueva partida — implementación del 26 de octubre de 2026

## Autoría y alcance

Este cambio fue realizado únicamente por **Codex (asistente de OpenAI)** en esta
sesión, a pedido del usuario, sin otros agentes ni colaboradores de implementación.
Esta constancia se limita a este cambio; los assets, el diseño previo y el motor
pertenecen al proyecto existente.

Rama: `codex/nueva-partida-tarjetas`. No se modifica ni se fusiona `main`.
Archivos de producto: `src/ui/Portada.tsx` y `src/ui/portada.css`.

## Revisión previa

Se revisaron la estructura, `design/ART_BIBLE.md`,
`design/ART_BIBLE_PORTADA_ASADO.md`, la portada existente y los callbacks de inicio
en `src/App.tsx`. La aplicación usa React, TypeScript y Vite; el motor y el
almacenamiento están separados de la interfaz.

**Limitación de referencia:** el mockup mencionado no llegó como archivo o imagen
accesible en esta conversación, ni se encontró en los directorios de adjuntos.
Se solicitó su ubicación. La composición implementada interpreta los requisitos
escritos usando el lenguaje del repositorio. No se afirma equivalencia visual
exacta con una imagen que no se pudo inspeccionar.

## Interfaz implementada

- Tres tarjetas en columnas en desktop y apiladas hasta 700 px: Fundar tu club,
  Armar el plantel en la pretemporada y Partida directa.
- Paleta nocturna de la Art Bible: azul profundo `#081D2D`, superficies
  `#17384B`, borde `#456477`, texto `#F3F0E8`, secundario `#AEBCC4` y selección/CTA
  naranja `#F47C27`. Superficies con transparencia y profundidad contenida.
- Se reutilizan Barlow Condensed y las fuentes cargadas por el juego.
- Selección exclusiva visible mediante borde, filete superior y marca; hover
  y foco distinguibles. El color no es la única señal de selección.
- Radios HTML nativos para modalidad y dificultad: flechas, Tab y Espacio.
- Dificultad inicial Medio, con las mismas tres opciones y descripciones reales.
- Un botón naranja Comenzar partida aplica la selección y la dificultad.
- Escape y Volver mantienen la navegación existente. El título recibe foco al
  entrar a la selección y al regresar desde Carrera.

## Lógica preservada

Seleccionar una tarjeta ya no inicia una partida. El CTA invoca exactamente el
flujo anterior: Carrera abre `CareerSetup`; pretemporada llama
`onNewPreseason(difficulty)` y directa llama `onNew(difficulty)`.
Se conservan la creación del club, las escenas de Carrera, las reglas,
el reducer, la persistencia y la confirmación antes de sobrescribir guardados
válidos o incompatibles. Seleccionar por sí solo no escribe en LocalStorage.
La pantalla de inicio y Gestionar partida no cambian de diseño: los estilos
nuevos se acotan a `.nueva-partida` y a sus elementos `np-*`.

## Assets reutilizados y pendientes

- Fondo: `public/portada.webp`, recibido por la misma prop `portada`. Sin cambios
  de archivo, sin reemplazo ni generación de personajes.
- Íconos existentes: `gimnasio`, `plantel` y `pelota` de `src/ui/Icon.tsx`.
- No se incorporan imágenes externas ni estilos artísticos nuevos.
- No falta ningún asset para el funcionamiento de esta versión.
- Para el cierre visual falta **el mockup original**. Sin él no es posible
  identificar con certeza qué ilustraciones específicas contiene o cuáles
  faltan. Si requiere ilustraciones propias para cada tarjeta, deben recibirse
  o localizarse las tres piezas aprobadas de Fundar tu club, Pretemporada y
  Partida directa (idealmente con transparencia y sin texto incrustado).
  No se encargaron ni generaron esas piezas, ni se inventaron sustitutos.

## Validación

- `npm run build`: TypeScript y Vite correctos. Vite informa la advertencia ya
  existente por el tamaño del chunk del juego.
- `npm test`: **22 archivos, 215 tests aprobados**.
- Comprobaciones del CI: `npm run sim -- 20`, `npm run sim:ligas -- 4 4`,
  `npm run sim:carrera -- 20` y `npm run fuzz -- 24 2`, completadas correctamente.
  Fuzz: 217 fechas, cero problemas del motor y cero textos rotos.
- Verificación en Chromium: 1440×900, 1366×768, 700×900, 390×844 y 320×640;
  sin desbordamiento horizontal. Se verifica selección, dificultad, inicio de
  los tres flujos, regreso desde Carrera, confirmación de guardado y teclado.
- El mockup ausente impide una comparación visual contra la referencia exacta.

## Probar y publicar

En local: `npm install`, `npm run dev`, abrir la URL de Vite y elegir Nueva partida.
Elegir tarjeta y dificultad, después Comenzar partida. Carrera sigue con su
historia y creación de club; pretemporada abre la elección de ligas real.

Se prepara una preview privada con Sites, en un repositorio de hosting separado.
Su manifest de hosting no forma parte de este cambio del juego. La preview
incluye el juego funcional y guarda en el LocalStorage de su propio dominio.
La publicación habitual de GitHub Pages permanece vinculada a `main`.
El resultado de publicación y la URL final se informan en la PR y en la entrega.
