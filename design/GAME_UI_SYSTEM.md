# Game UI System — Basket Manager

> **Estado: v0.1 — fuente operativa de UI para la migración visual de septiembre de 2026.**
>
> Este documento traduce la Art Bible a reglas concretas de interfaz para implementación.
> Para dirección artística general manda `ART_BIBLE.md`. Para componentes, estados, jerarquía,
> chrome, navegación y migración global de pantallas, manda este documento.
>
> Objetivo: que Basket Manager se sienta **videojuego de management** y no dashboard SaaS,
> sin perder densidad, claridad ni velocidad de lectura.

---

## 1. Fuente de verdad visual

### Tier 1 — referencia principal de UI

**Lámina 05 — “EL PARTIDO ES EL CENTRO”**  
Incluye cuatro pantallas objetivo:

1. La previa.
2. Quinteto y táctica.
3. Partido en vivo.
4. Postpartido.

Esta lámina define el lenguaje final de UI para:

- top navigation;
- subnavigation;
- títulos;
- jerarquía tipográfica;
- paneles;
- chips/personas;
- stats;
- HUD;
- botones;
- separación de módulos;
- relación entre UI e ilustración.

### Referencia en repo

Mientras se incorpora al repo la versión binaria aprobada más reciente de la lámina 05, usar como
ancla disponible:

- `design/arte/referencias/2026-09-09-partido.png`

La captura/lámina aprobada más reciente debe copiarse mediante **git local/Claude Code** a:

- `design/arte/referencias/ui-final-partido-centro.png`

No subir ese binario mediante conectores que puedan truncar imágenes.

Cuando exista `ui-final-partido-centro.png`, pasa a ser la referencia visual principal de implementación.

### Tier 1 complementario

Las seis láminas “Revisión de arte” de `ART_BIBLE.md` siguen definiendo el producto completo.
La lámina 05 es la referencia más fuerte para el **sistema de interfaz reutilizable**.

### Tier 2

- Variante C de Vestuario aprobada en la rama `art/vestuario-vertical-slice`.
- Vestuario ilustrado aprobado.
- Asado del club aprobado.
- Referencias de mundo y tono humano de `ART_BIBLE.md`.

### Tier 3

Exploraciones nuevas de Higgsfield, Layer, Claude, ChatGPT u otras herramientas.
No son canon hasta aprobación explícita.

---

## 2. Principio rector

> **Primero se ve dónde estoy; después leo qué tengo que gestionar.**

La interfaz no debe cubrir por completo el mundo ilustrado.

Patrón preferido:

**ESCENA → TRANSICIÓN → UI DE MANAGEMENT**

La Variante C de Vestuario valida este patrón:

- franja/hero ambiental visible;
- transición corta mediante degradado;
- panel informativo debajo;
- UI fría;
- mundo cálido;
- naranja concentrado en acción/foco.

No todas las pantallas necesitan una franja hero, pero ninguna pantalla narrativa debe reducir la
ilustración a una textura irreconocible detrás de un panel opaco.

---

## 3. Tokens base

### Color

```css
--bm-bg-deep: #081D2D;
--bm-panel: #102C40;
--bm-panel-elevated: #17384B;
--bm-border: #456477;

--bm-text: #F3F0E8;
--bm-text-secondary: #AEBCC4;

--bm-accent: #F47C27;
--bm-positive: #54D29A;
--bm-warning: #E4B94B;
--bm-danger: #E35B4F;
```

Reglas:

- naranja = CTA, foco, selección, dato clave;
- no usar naranja como relleno decorativo general;
- verde/amarillo/rojo = estado semántico;
- colores de club viven en escudos, camisetas y detalles del mundo, no gobiernan el chrome global.

### Profundidad

Niveles recomendados:

- **L0 / world** — ilustración o fondo;
- **L1 / shell** — chrome general;
- **L2 / panel** — contenido principal;
- **L3 / elevated** — selección, popover, módulo destacado;
- **L4 / action** — CTA, modal, evento crítico.

Evitar “glassmorphism” genérico.
Blur sólo cuando ayuda a integrar arte y UI, nunca como recurso por defecto.

### Bordes

- filete fino, de bajo contraste;
- inner highlight opcional;
- evitar bordes gruesos tipo app móvil;
- panel activo puede reforzar borde, brillo o accent bar.

### Radios

Radios contenidos. La UI debe sentirse deportiva/editorial, no soft-SaaS.

---

## 4. Tipografía

Tres voces oficiales:

### Display / deportiva

Usos:

- título de pantalla;
- marcador;
- encabezados principales;
- números importantes;
- nombres de secciones clave.

Características:

- condensada;
- fuerte;
- alta legibilidad;
- mayúsculas cuando ayude al carácter deportivo.

### UI sans

Usos:

- tablas;
- listas;
- navegación;
- botones;
- datos;
- descripciones.

### Manuscrita / mundo

Usos:

- pizarras;
- frases del club;
- notas;
- carteles internos del escenario.

Nunca usar manuscrita como tipografía funcional principal.

### Escala jerárquica

Definir clases/tokens equivalentes a:

- `ui-display-xl`
- `ui-display`
- `ui-section-title`
- `ui-module-title`
- `ui-player-name`
- `ui-body`
- `ui-meta`
- `ui-kicker`
- `ui-stat-xl`
- `ui-stat`

Regla: una pantalla no debe hacer que título, nombre, descripción y metadato compitan con el mismo peso.

---

## 5. NAV-01 — Top navigation

### Objetivo

Que el shell parezca parte de un videojuego, no una navbar web.

### Anatomía

- escudo + nombre del club;
- módulo de navegación;
- icono;
- label;
- indicador de estado/alerta opcional;
- contexto: semana / dinero / settings / salir.

### Estado inactivo

- texto secundario;
- icono contenido;
- sin placa dominante;
- contraste suficiente.

### Estado activo

Debe usar al menos 2 de estos recursos:

- placa/base diferenciada;
- accent bar;
- label con mayor peso;
- icono reforzado;
- cambio de profundidad;
- pequeño glow/controlado o highlight interno.

**No resolver sólo con underline.**

### Densidad

Top nav compacto: la pantalla necesita espacio para management y escena.

---

## 6. SUBNAV-01 — Subnavigation

Ejemplos:

- Plantel / Estadísticas / Vestuario / Cuerpo técnico;
- pestañas dentro de Liga;
- variantes dentro de Club.

Debe:

- sentirse integrada al shell;
- usar placas o segmentos;
- tener activo evidente;
- no parecer tabs HTML default;
- conservar navegación actual y foco accesible.

---

## 7. HEADER-01 — Título de sección

Patrón base:

```text
[KICKER / ICONO]
TÍTULO DE SECCIÓN
Contexto o subtítulo opcional
```

Puede vivir:

- sobre una franja de imagen;
- dentro de una banda oscura;
- sobre el panel principal.

Ejemplos:

- EL VESTUARIO POR DENTRO
- PRÓXIMO PARTIDO
- NUESTRO QUINTETO
- FINAL DEL PARTIDO

Debe leerse de inmediato y anclar la pantalla.

---

## 8. PANEL SYSTEM

### PANEL-01 — Primary

Contenido dominante de pantalla.

- fondo `--bm-panel`;
- borde fino;
- profundidad moderada;
- alto contraste;
- puede convivir con escena visible.

### PANEL-02 — Elevated

Para:

- selección;
- decisión;
- bloque táctico;
- resultado;
- módulo destacado.

Usar `--bm-panel-elevated` y más profundidad.

### PANEL-03 — Compact module

Para:

- pequeños stats;
- decisiones rápidas;
- resúmenes;
- estado.

### PANEL-04 — Semantic

Variantes:

- positive;
- warning;
- danger;
- info.

El color semántico debe ser acento, no pintar toda la superficie.

### PANEL-05 — Hero information

Para:

- próximo partido;
- resultado;
- jugador destacado;
- objetivo principal.

Debe combinar display type + dato protagonista + acción.

---

## 9. CHIP-01 — Player chip

No usar tags genéricos.

Anatomía:

- avatar;
- nombre;
- estado opcional;
- rol/relación opcional;
- micro-indicador opcional.

Estados:

- default;
- hover;
- focus;
- selected;
- positive;
- warning;
- conflict;
- disabled.

Debe escalar a:

- lista social;
- convocatoria;
- quinteto;
- cambios;
- relaciones;
- mercado.

---

## 10. STAT-01 — Stats e indicadores

Unificar:

- energía;
- moral;
- química;
- rendimiento;
- rating;
- progreso;
- unión del grupo;
- forma.

Patrones:

- barra segmentada;
- barra continua;
- número + label;
- icono + valor;
- estado semántico.

No mezclar estilos distintos de barra para el mismo significado.

Los números importantes usan jerarquía de display.

---

## 11. TABLE-01 — Tablas y listas

Basket Manager necesita densidad.

Reglas:

- encabezados pequeños y claros;
- alineación numérica consistente;
- fila seleccionada con profundidad/foco;
- hover útil;
- separadores suaves;
- no convertir cada fila en una card;
- preservar lectura rápida;
- avatar/chip sólo cuando suma información.

---

## 12. BUTTON SYSTEM

### BTN-01 — Primary

- naranja;
- un CTA dominante por pantalla;
- peso alto;
- copy accionable.

### BTN-02 — Secondary

- panel oscuro;
- borde;
- menor jerarquía.

### BTN-03 — Ghost

- navegación secundaria;
- acciones de baja prioridad.

### BTN-04 — Danger

- rojo sólo para acción destructiva o conflicto real.

### Estados

Todos:

- default;
- hover;
- pressed;
- focus;
- disabled.

Evitar múltiples botones naranjas con igual peso dentro de una pantalla.

---

## 13. HUD-01 — Footer / manager HUD

El footer no es una barra gris de web.

Información candidata:

- semana;
- caja;
- cuotas;
- récord;
- próximo evento;
- CTA temporal.

Anatomía:

- icono pequeño;
- label/kicker;
- número grande;
- metadato;
- separadores;
- CTA al extremo.

El HUD debe leerse como estado persistente del club.

---

## 14. SCENE-UI patterns

### SCENE-A — Franja libre

Aprobado por Variante C de Vestuario.

Uso:

- Vestuario;
- Club;
- Cuerpo técnico;
- Historia;
- algunas pantallas sociales.

Composición:

- 20–30 % de escena limpia;
- título mínimo encima;
- transición;
- management debajo.

### SCENE-B — Split

Uso:

- ficha de jugador;
- cuerpo técnico;
- scouting;
- postpartido.

### SCENE-C — Full environment + modules

Uso:

- previa;
- tablero;
- eventos;
- partido.

La escena debe conservar áreas despejadas pensadas para UI.

### SCENE-D — Management first

Uso:

- tablas;
- finanzas;
- mercado;
- rankings.

Arte lateral/de fondo, sin sacrificar densidad.

---

## 15. Screen mapping

### Inicio

- hero/world;
- panel de partida;
- CTA claro;
- mínimo chrome.

### Tablero

- SCENE-C;
- NAV-01;
- HEADER-01;
- módulos de semana;
- próximo partido;
- decisiones;
- HUD-01.

### Plantel

- management first;
- TABLE-01;
- CHIP-01;
- jerarquía tipográfica;
- subnav.

### Vestuario

- SCENE-A aprobado;
- CHIP-01;
- módulos sociales;
- indicador de unión;
- pares/conflictos.

### Cuerpo técnico

- SCENE-A o B;
- portraits/personas;
- módulos de rol.

### Previa

Referencia directa de lámina 05:

- SCENE-C;
- PANEL-05 próximo partido;
- rival;
- disponibilidad;
- claves;
- CTA “Preparar quinteto”.

### Quinteto y táctica

Referencia directa de lámina 05:

- panel roster;
- cancha central;
- táctica lateral;
- stats/bars unificadas;
- CTA “Salir a la cancha”.

### Partido en vivo

Referencia directa de lámina 05:

- marcador dominante;
- cancha visible;
- listas laterales;
- relato;
- controles tácticos;
- cambios;
- tiempo muerto.

### Postpartido

Referencia directa de lámina 05:

- resultado hero;
- figura;
- stats;
- estado emocional;
- momentos clave;
- CTA continuar.

### Liga / Rankings

- TABLE-01;
- stats;
- club colors sólo como identidad secundaria.

### Finanzas

- management first;
- números fuertes;
- semántica positiva/negativa;
- evitar look fintech SaaS.

### Historia / Club

- escenas;
- hitos;
- trofeos;
- archivo;
- storytelling.

---

## 16. Backgrounds y assets: reglas de composición

Los backgrounds **no se generan como wallpaper genérico**.

Cada asset debe declarar:

- pantalla destino;
- patrón SCENE;
- safe zones para UI;
- foco principal;
- zonas oscuras/claras;
- recorte esperado;
- aspecto desktop;
- versión/estado.

### Ejemplo de ficha

```yaml
id: bg-tablero-office-v01
screen: Tablero
pattern: SCENE-C
status: candidate
safe_zone_left: true
safe_zone_center: true
focal_point: right
ui_overlay: medium
desktop_target: 1440x900
```

### Regla técnica de binarios

PNG/WEBP finales deben entrar al repo mediante git local/Claude Code si el conector de escritura
no garantiza integridad binaria.

No asumir que un asset está aprobado sólo porque existe en `public/arte`.

---

## 17. Asset registry recomendado

Ubicación futura:

- `design/arte/ASSET_REGISTRY.md`

Estados permitidos:

- `exploration`
- `candidate`
- `approved`
- `integrated`
- `deprecated`

Cada asset aprobado debe registrar:

- archivo;
- uso;
- pantalla;
- fuente;
- fecha;
- decisión;
- notas de crop/safe zone.

---

## 18. Migración global

### Fase 1 — Foundation

Crear/refactorizar:

- tokens;
- tipografía;
- buttons;
- panels;
- chips;
- headings;
- stats;
- tables;
- HUD;
- nav;
- subnav.

### Fase 2 — Global shell

Aplicar:

- NAV-01;
- SUBNAV-01;
- HUD-01;
- chrome general.

### Fase 3 — Vertical presentation slice

Prioridad:

1. Tablero.
2. Plantel.
3. Vestuario.
4. Previa.
5. Quinteto y táctica.
6. Partido.
7. Postpartido.

### Fase 4 — Resto del juego

Aplicar los mismos componentes.
No inventar un estilo nuevo por pantalla.

---

## 19. Definition of Done visual

Una pantalla está “presentation ready” cuando:

- se siente videojuego, no app web;
- respeta Paleta A;
- tiene jerarquía tipográfica clara;
- navegación activa es inequívoca;
- CTA principal se identifica rápido;
- paneles tienen profundidad contenida;
- tablas/listas conservan densidad;
- ilustración tiene función compositiva;
- no depende de explicar dónde mirar;
- funciona en 1440x900;
- se verifica también en 1366x768;
- no cambia lógica para lograr el efecto.

---

## 20. Anti-patterns

No hacer:

- navbar gris plana;
- tabs web default;
- rectángulos idénticos por toda la pantalla;
- texto blanco con el mismo peso en todos los niveles;
- naranja por decoración;
- glassmorphism genérico;
- blur excesivo;
- cards por cada fila;
- fondos tapados al 90 %;
- ilustración que no deja safe zones para UI;
- introducir componentes únicos para cada pantalla;
- rehacer lógica durante la migración visual.

---

## 21. Regla de implementación para Claude Code

Antes de migrar toda la app:

1. inventariar componentes globales;
2. mapearlos a NAV/PANEL/CHIP/STAT/TABLE/BUTTON/HUD;
3. implementar Foundation;
4. aplicar Global Shell;
5. mostrar screenshots de:
   - Tablero;
   - Vestuario;
   - una pantalla de Partido;
6. comparar contra referencias Tier 1;
7. corregir el sistema;
8. recién entonces migrar el resto.

No hacer una mega-pasada ciega sobre todas las pantallas.

---

## 22. Registro

### 2026-09-24 — UI System v0.1

- Variante C de Vestuario aprobada como patrón SCENE-A.
- Lámina 05 “El Partido es el Centro” declarada referencia principal de UI.
- Paleta A confirmada como base del sistema.
- Naranja reservado para foco/acción.
- Se separa formalmente:
  - Art Bible = dirección artística;
  - Game UI System = reglas operativas de interfaz;
  - backgrounds/personajes = assets integrados al sistema, no sustitutos de UI.
- Próximo paso técnico: Foundation + Global Shell y comparación before/after en tres pantallas.
