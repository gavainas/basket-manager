# Pipeline de arte y aprobación visual — Basket Manager

Este documento define **cómo se explora, aprueba, implementa y escala el arte del juego**.
Su objetivo es evitar rehacer decenas de pantallas, cientos de retratos o sistemas completos
antes de confirmar que la dirección visual realmente funciona.

## Estado actual

**Puertas 1 y 2: CERRADAS (ago 2026, Sprint 4 del plan de acción).** La dirección
elegida es la que ya está en producción — club de barrio sobre papel claro
(crema/grafito con el naranja reservado a la acción), Oswald como display, cards con
banda de sección, la portada del asado y las cabeceras de escena, el set propio de
34 iconos de línea, y **el retrato ilustrado como la foto del jugador en todo el
juego** (decisión de Gabi: los SVG procedurales eran placeholders y quedan de
respaldo). El detalle de la aprobación está en la Puerta 2.

Las puertas 3 a 6 (hoja maestra de personajes, vertical slice, prueba en juego y
art bible) siguen **abiertas**: gobiernan la expansión que viene (set ilustrado de
retratos, eventos ilustrados, más cabeceras).

**Sep 2026 — hay una propuesta de materia y estructura sin aprobar.** Dentro de la
dirección ya aprobada (no la reabre), y por una queja concreta de Gabi sobre lo plano de
los paneles, se exploraron tres tratamientos sobre la pantalla de Plantel y salió una
propuesta: **D · La planilla del club**. Está presentada, **no aprobada**. Ver el registro
del 2026-09-01 al final de este documento.

La estructura técnica existente puede conservarse y evolucionar, pero no se debe interpretar
que un sistema está artísticamente aprobado solo porque ya funciona, está documentado o fue
integrado en varias pantallas.

**Lote de escena, ago 2026** (`public/arte/`, ver su LEEME): dos cabeceras — el vestuario
antes del partido y el fichaje en el bar — integradas en Plantilla y en el Mercado de la
pretemporada, y los **ocho retratos de arquetipo, hoy INTEGRADOS como la foto oficial del
jugador en todo el juego** (decisión de Gabi, ago 2026: el SVG procedural era el
placeholder). Todo generado con Higgsfield usando la portada como referencia de estilo.
El problema de escala sigue abierto y es el trabajo de la Puerta 3: un plantel tiene
catorce jugadores y el mundo cientos; ocho caras con variante por persona (espejo +
tono) lo tapan, no lo resuelven.

## Principio central

> No se genera ni se integra en masa nada que no haya sido aprobado primero en pequeño.

Ejemplos:

- Antes de producir 200 caras, aprobar una lámina de 12 personajes.
- Antes de rediseñar 30 pantallas, aprobar un vertical slice de 5 pantallas.
- Antes de ilustrar todos los eventos, aprobar 3 eventos representativos.
- Antes de cambiar toda la paleta, probarla en una pantalla completa.
- Antes de construir un generador complejo, aprobar manualmente el resultado visual objetivo.

## Responsabilidades por herramienta

### Gabi — Dirección y aprobación

Gabi define la fantasía, selecciona referencias, evalúa propuestas y da el OK final.
Ninguna herramienta puede asumir aprobación por silencio, por avance técnico o porque una
versión anterior ya fue implementada.

Las decisiones que requieren aprobación explícita son:

- dirección artística general;
- estilo de personajes;
- estilo de UI;
- paleta y tipografía;
- vertical slice visual;
- escalado masivo de assets;
- reemplazo del arte provisional por arte considerado final.

### Higgsfield — Exploración artística y producción visual

Higgsfield se usa para responder:

> ¿Cómo se ve el mundo y qué sensación transmite?

Responsabilidades principales:

- moodboards y exploración de estilos;
- concept art;
- personajes, rostros y cuerpos;
- variedad de edades, contexturas, peinados, barbas y expresiones;
- escenas sociales: asados, vestuario, cerveza, cancha de barrio y grupo de amigos;
- fondos e ilustraciones de eventos;
- imágenes promocionales;
- pruebas visuales de distintas direcciones artísticas.

Los resultados de Higgsfield son **propuestas**, no assets automáticamente aprobados.
No se integran en masa al juego antes de superar las puertas de aprobación.

### Claude Design — UI/UX y sistema de interfaz

Claude Design se usa para responder:

> ¿Cómo se usa el juego y cómo se organiza la información?

Responsabilidades principales:

- arquitectura de información;
- layout y navegación;
- jerarquía visual;
- diseño de pantallas;
- cards, tablas, botones, modales y estados;
- prototipos navegables;
- responsive;
- aplicación coherente del arte aprobado dentro de la interfaz;
- mantenimiento del espejo visual del design system.

Claude Design no debe decidir por sí solo el estilo artístico final de los personajes ni
convertir un placeholder técnico en dirección de arte definitiva.

### Claude Code — Implementación y escalabilidad

Claude Code se usa para responder:

> ¿Cómo se convierte lo aprobado en un sistema funcional, mantenible y escalable?

Responsabilidades principales:

- implementar UI aprobada;
- integrar y optimizar assets;
- construir generadores y variantes después de aprobar el objetivo visual;
- mantener consistencia técnica;
- adaptar tamaños y resoluciones;
- programar estados, expresiones y variantes;
- desacoplar lógica de juego y presentación;
- conservar placeholders reemplazables mientras el arte no esté aprobado.

Claude Code no debe expandir un sistema visual provisional a todo el juego sin aprobación.

## Flujo obligatorio

```text
1. Definir fantasía, tono y referencias
                ↓
2. Explorar 3 direcciones artísticas claramente diferentes
                ↓
3. Elegir y corregir una dirección
                ↓
4. Diseñar un vertical slice de 5 pantallas
                ↓
5. Aprobar UI y personajes por separado
                ↓
6. Documentar la Art Bible
                ↓
7. Implementar un vertical slice funcional
                ↓
8. Probarlo dentro del juego
                ↓
9. Congelar el estilo aprobado
                ↓
10. Escalar al resto del juego
```

## Puerta 1 — Direcciones artísticas

Antes de modificar todo el juego se deben presentar **3 direcciones visuales diferentes**.
Cada una debe mostrarse en una pantalla completa comparable, preferentemente la pantalla de
plantel.

Cada propuesta debe permitir evaluar:

- tono general;
- paleta;
- tipografía;
- densidad de información;
- estilo de cards;
- estilo de retratos;
- identidad amateur;
- sensación adulta versus infantil;
- legibilidad.

Ejemplos de territorios posibles:

1. Manager deportivo sobrio.
2. Club de barrio editorial.
3. Caricatura adulta estilizada.

No son opciones obligatorias ni finales: sirven para evitar variaciones demasiado parecidas.

**Criterio de salida:** una dirección elegida y observaciones concretas de qué conservar,
qué combinar y qué descartar.

## Puerta 2 — Aprobación separada de UI y personajes

> **CERRADA (ago 2026; personajes corregidos por decisión de Gabi).**
>
> **UI: APROBADA.** La dirección en producción pasa a ser la oficial: paleta de papel
> claro con tokens en `styles.css` (fuente de verdad: `SISTEMA_VISUAL.md`), Oswald como
> display, navegación de menú (Hub) con bandas de sección por área, tablas estilo
> planilla, el set propio de iconos de línea (`Icon.tsx`, hoy 34) como única
> iconografía de cromo — la purga de emojis se ejecutó en este mismo sprint — y el
> naranja `--naranja` reservado a la acción (las valoraciones por fila volvieron a
> tinta).
>
> **Personajes: la foto oficial del jugador es el RETRATO ILUSTRADO** (dirección de
> Gabi: "los SVG eran placeholders"). Los ocho retratos de arquetipo de
> `public/arte/` son la cara del jugador en TODO el juego — tira del Hub, cards,
> ficha, pizarra, pasar lista, vestuario, eventos y perfiles rivales — con una
> variante estable por persona (espejo + tono del fondo) para separar a los
> repetidos del mismo arquetipo. El retrato SVG procedural queda como **generador de
> respaldo** (galería `#retratos` y cualquier cara sin personalidad conocida), no
> como identidad. La limitación es conocida y aceptada: ocho caras para planteles
> enteros — resolverla con el **set grande por seed** es exactamente la Puerta 3.

La UI y los personajes se aprueban como sistemas distintos.

### Checklist de UI

- paleta;
- tipografía;
- navegación;
- forma y densidad de las cards;
- tablas y jerarquía de datos;
- iconografía;
- fondos y texturas;
- botones y estados;
- lectura en desktop y tamaños reducidos.

### Checklist de personajes

- estilo de dibujo;
- nivel de realismo;
- proporciones;
- edades;
- variedad corporal;
- tonos de piel;
- pelo y barba;
- expresiones;
- camiseta;
- encuadre;
- fondo o transparencia;
- lectura en tamaño pequeño;
- consistencia entre personajes.

Aprobar la UI no implica aprobar las caras. Aprobar las caras no implica aprobar la UI.

## Puerta 3 — Hoja maestra de personajes

Antes de producir una base grande o ampliar el generador se debe aprobar una lámina con
aproximadamente 12 personajes que pertenezcan claramente al mismo juego.

La muestra debe incluir, como mínimo:

- distintas edades;
- distintos tonos de piel;
- flacos, robustos y jugadores con panza;
- pelados, con entradas, pelo largo y rulos;
- con y sin barba;
- expresiones de enojo, alegría, cansancio y confianza;
- un jugador lesionado;
- un veterano suplente;
- un jugador que se perciba como figura deportiva.

Pregunta de aprobación:

> ¿Quiero pasar muchas horas viendo a estos personajes?

**Criterio de salida:** aprobación explícita del estilo y correcciones registradas.

## Puerta 4 — Vertical slice visual

Se diseñan únicamente estas cinco experiencias representativas:

1. Dashboard.
2. Plantel.
3. Ficha de jugador.
4. Evento social.
5. Partido o armado del quinteto.

Estas pantallas deben cubrir gestión, información, personajes, vida social y básquet.
No se extiende el nuevo estilo a otras pantallas hasta que las cinco funcionen como un sistema.

**Criterio de salida:** aprobación explícita del conjunto, no solo de pantallas aisladas.

## Puerta 5 — Prueba dentro del juego

El arte aprobado debe probarse dentro del producto real antes de escalar.

Para retratos, implementar inicialmente:

- entre 8 y 12 personajes;
- 2 pantallas;
- 3 tamaños de representación;
- varias expresiones y estados.

Validar:

- diferenciación inmediata entre personas;
- legibilidad de nombres y estadísticas;
- ausencia de ruido visual excesivo;
- consistencia con cards y fondos;
- funcionamiento en tamaños pequeños;
- carga y rendimiento;
- sensación correcta del mundo amateur.

Una imagen atractiva en grande no se considera validada si falla dentro de una card pequeña.

## Puerta 6 — Art Bible y congelamiento

Después de aprobar el vertical slice se crea o actualiza una Art Bible con:

- declaración de identidad;
- paleta aprobada;
- tipografías;
- formas, radios, bordes y sombras;
- texturas;
- estilo de iconos;
- estilo de retratos y cuerpos;
- expresiones;
- reglas de camisetas y colores de clubes;
- tamaños mínimos y máximos;
- referencias aprobadas;
- referencias rechazadas con explicación;
- prohibiciones visuales.

Base de identidad propuesta:

> Manager de básquet amateur adulto, humano, divertido y nostálgico. Profesional en
> usabilidad, amateur en personalidad. No infantil, no corporativo y no una copia literal
> de Football Manager.

Prohibiciones iniciales:

- estética mobile genérica;
- avatares tipo Bitmoji;
- personajes infantiles;
- jugadores todos atléticos o profesionales;
- exceso de emojis;
- exceso de neón;
- estética SaaS corporativa;
- clichés deportivos usados como decoración constante.

**Criterio de salida:** documento aprobado y referencias visuales guardadas en
`design/references/` cuando existan assets definitivos.

## Reglas para desarrollo mientras el arte está pendiente

Mientras una parte visual no esté aprobada:

- marcarla como `placeholder`, `prototype` o `provisional` en documentación;
- mantener componentes y assets reemplazables;
- no generar variaciones masivas;
- no propagar el sistema a nuevas pantallas salvo para pruebas controladas;
- no convertir decisiones temporales en restricciones de arquitectura innecesarias;
- permitir que la lógica y la jugabilidad sigan avanzando sin depender del acabado final.

## Registro de aprobaciones

Cada aprobación relevante debe quedar registrada en este archivo o en la futura Art Bible con:

- fecha;
- alcance aprobado;
- referencia o captura;
- observaciones;
- elementos pendientes;
- decisión de escalar o no.

Formato sugerido:

```md
### YYYY-MM-DD — Nombre de la aprobación

- Alcance: ...
- Aprobado: ...
- No aprobado: ...
- Correcciones: ...
- Próximo paso autorizado: ...
```

### 2026-08-16 — Dirección "club de barrio" (candidata, sin aprobar)

- Alcance: dirección visual de interfaz y estilo de personajes para el tablero principal.
- Referencias exploradas: cálida (madera y papel), AAA oscura tipo EA/2K, gris cemento,
  y la ganadora por comparación directa — chrome grafito neutro, código de color por
  sección, héroe caricatura de relleno plano, gimnasio municipal desaturado de fondo.
- Descartadas: la cálida (no sobrevivió a la comparación) y la AAA oscura (el negro
  hundía al personaje y la ficción prometía una NBA que el juego no tiene).
- Sistematizado en: [SISTEMA_VISUAL.md](SISTEMA_VISUAL.md) + kit navegable
  [`kit-sistema-visual.html`](kit-sistema-visual.html).
- Aprobado: **nada todavía.** Falta que Gabi apruebe el kit.
- Próximo paso autorizado: solo revisión del kit. **No** tocar `src/styles.css`, **no**
  pedir assets a Higgsfield, **no** propagar a pantallas.

### 2026-09-01 — Exploración de materia y estructura (dentro de la dirección aprobada)

- Alcance: la pantalla de **Plantel**, en cuatro tratamientos comparables sobre los mismos
  ocho jugadores. **No reabre la Puerta 1**: la dirección "club de barrio" y la paleta de
  papel claro siguen aprobadas y no se discutieron. Lo que se exploró es de qué está hecha
  la interfaz — con el método de la Puerta 1 (tres direcciones sobre una pantalla completa
  comparable) porque la queja de Gabi era exactamente de ese nivel: "todos los paneles
  lisos parece un juego hecho con Claude e IA".
- Diagnóstico que la motivó, medido y no opinado: en las 3304 líneas de `src/styles.css`
  hay **6 transiciones, 2 animaciones y cero texturas o gradientes en los paneles**. No
  falta arte — el lote de `public/arte/` tiene carácter de sobra. Falta **materia**: el
  95% de los píxeles son rectángulos crema con borde de 1px y radio de 4.
- Canvas: <https://claude.ai/code/artifact/8f61cad0-5265-4bfc-a5a3-0bed93a14876>. Fuentes
  versionadas en [`canvas/`](canvas/) — ver su [LEEME](canvas/LEEME.md).
- Presentado: **A · Planilla del club** (estructura: una sola hoja con renglones y cifras
  en columna, en vez de doce cajitas), **B · Carpeta de cartulina** (cada jugador es un
  objeto físico) y **C · Pizarra del vestuario** (relieve: superficie con bisel y sombra
  real, medidores segmentados, un solo acento).
- Elegido por Gabi: **A y C**. No competían — A es estructura y C es relieve, así que se
  componen. De ahí salió **D · La planilla del club**, que es la propuesta.
- Corrección de Gabi, registrada porque el error fue mío: el primer D salió en paleta
  oscura. Que el boceto C fuera oscuro era un detalle del boceto, no lo que lo hacía
  bueno, y **la paleta ya está aprobada** (Puerta 2). D se rehízo en papel claro. La
  versión oscura queda en el canvas como `DPizarron`, sólo para mostrar que la paleta es
  un eje aparte; no es una propuesta.
- Aprobado: **nada todavía.** D está presentado, no aprobado. B queda archivada.
- Próximo paso autorizado: sólo revisión del canvas. **No** tocar `src/styles.css` hasta
  que Gabi apruebe D explícitamente — rige la regla de este documento: ninguna herramienta
  asume aprobación por silencio.

## Estado de aprobación actual

- La lógica y estructura técnica del sistema de retratos puede conservarse.
- El estilo visual actual de las caras **no está aprobado como arte final**.
- El estilo general actual de la interfaz **no está aprobado como dirección final**.
- No está autorizado escalar el arte actual únicamente por estar ya implementado.
- Existe una **dirección candidata documentada** (ver el registro del 2026-08-16), pendiente
  de aprobación. Hasta que se apruebe, el juego publicado sigue con el tema oscuro azul.
- El generador de escudos de club no existe y es la pieza procedural que falta: ninguna
  IA da diez escudos consistentes entre sí.
