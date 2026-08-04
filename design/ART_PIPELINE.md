# Pipeline de arte y aprobación visual — Basket Manager

Este documento define **cómo se explora, aprueba, implementa y escala el arte del juego**.
Su objetivo es evitar rehacer decenas de pantallas, cientos de retratos o sistemas completos
antes de confirmar que la dirección visual realmente funciona.

## Estado actual

La UI, los retratos procedurales y los recursos visuales existentes deben considerarse
**provisionales hasta superar las puertas de aprobación de este documento**.

La estructura técnica existente puede conservarse y evolucionar, pero no se debe interpretar
que un sistema está artísticamente aprobado solo porque ya funciona, está documentado o fue
integrado en varias pantallas.

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

## Qué es asset y qué es código

La división más importante del día a día, y la que más se presta a confusión:

| | Cómo se hace | Por qué |
| --- | --- | --- |
| **Interfaz** — layout, paneles, botones, cards, tablas, tipografía, colores, fondos generados por CSS, íconos vectoriales | **Código** (HTML / CSS / SVG) | Necesita texto real, estirarse a cualquier pantalla, tener estados (hover, foco, deshabilitado) y **cambiar con los datos**: la caja sube y baja, la semana avanza, el rival es otro cada fecha. |
| **Arte** — retratos de jugadores, ilustraciones de eventos, escenas sociales, fondos ambientales, imágenes promocionales | **Assets** (imágenes, hoy vía Higgsfield) | Son contenido, no mecanismo. Se ven, no se operan. |

**Regla**: una imagen generada nunca es la interfaz. Higgsfield puede ayudar a *decidir
cómo debería verse* una pantalla — para eso sirven las exploraciones de la Puerta 1 —
pero la pantalla se construye en código. Un PNG de una UI es una foto de un juego, no un
juego.

**Los íconos son la zona gris.** Tres caminos válidos:

- **Vector a mano**: livianos, nítidos a cualquier tamaño, se recolorean con la paleta.
  El techo es la mano que dibuja.
- **Ilustrados como imagen**: más ricos, pero cuesta la consistencia entre piezas, pesan
  más, no se recolorean y hay que regenerarlos ante cualquier cambio de paleta.
- **Híbrido (recomendado)**: generar en Higgsfield para *diseñar* el ícono, y redibujarlo
  como vector para implementarlo. Riqueza de la idea, liviandad de la ejecución.

### Cómo aterriza un asset de Higgsfield en el juego

Cuando la Puerta correspondiente esté aprobada:

```text
1. Generar en Higgsfield con el prompt del estilo aprobado
2. Seleccionar (nunca entra todo lo generado)
3. Recortar el fondo (remove_background) y encuadrar
4. Exportar a WebP en los tamaños que usa la UI
5. Optimizar peso — el juego se sirve por GitHub Pages
6. Guardar en public/ con nombre estable
7. El código lo referencia de forma determinística (p. ej. por id de jugador)
```

Los pasos 3 a 7 son de Claude Code; los pasos 1 y 2, de Higgsfield y de Gabi.

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

## Estado de aprobación actual

A la fecha de creación de este documento:

- La lógica y estructura técnica del sistema de retratos puede conservarse.
- El estilo visual actual de las caras **no está aprobado como arte final**.
- El estilo general actual de la interfaz **no está aprobado como dirección final**.
- No está autorizado escalar el arte actual únicamente por estar ya implementado.
- El siguiente paso visual correcto es presentar direcciones artísticas comparables y luego
  construir un vertical slice aprobado.

### 2026-08-04 — Puerta 1 CERRADA: dirección artística aprobada

- **Alcance**: dirección visual general, evaluada sobre el menú principal
  (iteración v5 de [`art/prompts/menu-principal.md`](art/prompts/menu-principal.md)).
- **Aprobado por Gabi**:
  - la **paleta** (madera cálida de gimnasio + azul pizarra profundo + paneles claros
    fríos + naranja quemado de acción);
  - la **UI y su estructura de hub** (bloque central de club, cuatro familias temáticas,
    rail de utilidades, tira de plantel al pie), heredada de PC Fútbol / ProManager.
- **No aprobado, a corregir**:
  - los **íconos ilustrados** del menú (registro inconsistente y, sobre todo, ilegibles
    a tamaño chico en el celular);
  - la **tipografía** (además, la de las imágenes no existe: hay que elegir fuentes
    reales, libres y auto-alojables).
- **Correcciones registradas como reglas** en [`ART_BIBLE.md`](ART_BIBLE.md) §6: el
  desgaste va en los objetos y no en la interfaz; lo adulto lo dan el ancla de valor y
  el desgaste, no la oscuridad; se caricaturizan los personajes, no la interfaz.
- **Integrado al juego**: nada. Cero cambios en `src/`.
- **Próximo paso autorizado**: cerrar tipografía e íconos (Puerta 2 — UI), y recién
  después la hoja de 12 personajes (Puerta 3). Sigue sin autorizarse escalar nada.

### 2026-08-02 — Puerta 1: propuestas presentadas (superada por el registro de arriba)

- Alcance: 3 direcciones sobre la pantalla de plantel, en
  [`design/art/puerta1-direcciones.html`](art/puerta1-direcciones.html)
  (ver [`design/art/README.md`](art/README.md)).
- Además: la exploración propia de Gabi en Higgsfield (jul 2026, 26 imágenes:
  oficina del club, fichas realistas, plantel caricatura) quedó archivada en
  [`design/references/higgsfield-2026-07/`](references/higgsfield-2026-07/)
  con manifest y cruce contra las 3 direcciones.
- Aprobado: nada todavía — esperando la devolución de Gabi
  (conservar / combinar / descartar).
- Integrado al juego: nada (cero cambios en `src/`).
- Próximo paso autorizado: registrar la decisión de Gabi acá y recién entonces
  encarar la Puerta 2.
