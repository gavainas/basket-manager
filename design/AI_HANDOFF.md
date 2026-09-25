# AI Handoff — Basket Manager

> Objetivo: que ChatGPT (dirección de arte/UI) y Claude Code (implementación/runtime) trabajen sobre el mismo repo sin que Gabi tenga que copiar instrucciones largas entre chats.

## Fuente de verdad compartida

Antes de trabajar UI/arte, leer:

1. `design/ART_BIBLE.md`
2. `design/GAME_UI_SYSTEM.md`
3. este archivo

La rama de trabajo actual para la migración visual es:

`art/vestuario-vertical-slice`

## Roles

### ChatGPT
Responsable de:
- dirección visual;
- Art Bible;
- sistema UI;
- referencias;
- backgrounds y briefs de assets;
- criterios de aprobación;
- documentación de decisiones;
- revisar screenshots y definir correcciones.

### Claude Code
Responsable de:
- integrar assets binarios mediante git local;
- implementar CSS/TSX;
- refactorizar componentes UI;
- correr el juego;
- verificar resoluciones;
- sacar screenshots;
- commit/push de implementación;
- reportar limitaciones técnicas.

## Protocolo de trabajo

### Cuando ChatGPT deja una tarea
ChatGPT actualiza la sección **TASK ACTUAL** de este archivo y hace commit/push.

Gabi sólo necesita decirle a Claude:

> Pull latest de la rama actual, leé `design/AI_HANDOFF.md` y ejecutá TASK ACTUAL. No avances fuera de ese alcance.

### Cuando Claude termina
Claude debe:
1. hacer commit y push;
2. actualizar la sección **RESULTADO CLAUDE** de este archivo con:
   - commit;
   - qué cambió;
   - qué no cambió;
   - screenshots generadas;
   - dudas/bloqueos;
3. dejar el repo limpio.

Gabi luego sólo necesita decirle a ChatGPT:

> Revisá el último handoff de Claude en el repo.

Así evitamos copiar prompts largos entre chats.

---

# TASK ACTUAL

## Typography migration + full UI coverage audit

### Contexto
Gabi quiere cambiar la tipografía del juego y, antes de seguir migrando pantallas, verificar si el sistema de UI nuevo está realmente implementado en TODO el juego.

Estado observado en repo:
- `body` todavía usa `'Segoe UI', system-ui...`;
- la voz display usa `Oswald` mediante `--display`;
- hay usos hardcodeados de `'Oswald'` en CSS (por ejemplo `Hub.css`);
- Foundation/Global Shell y la paleta gris perla sí afectan gran parte de la app, pero eso NO implica que NAV/PANEL/CHIP/STAT/TABLE/BUTTON/HUD estén migrados por completo en cada pantalla.

### Nueva dirección tipográfica a probar
Probar como primera opción:

- **Display / deportiva:** `Barlow Condensed` (600/700)
- **UI / lectura:** `Barlow` (400/500/600)

Razón:
- sigue teniendo identidad deportiva/editorial;
- es menos rígida/estrecha que Oswald;
- funciona mejor para textos de manager, tablas y navegación;
- permite que display y body pertenezcan a la misma familia sin verse iguales.

Usar paquetes Fontsource y empaquetar las fuentes con el build. No depender de fuentes del sistema.

### Antes de tocar todo: auditoría

Recorrer TODAS las superficies visibles del juego y clasificarlas:

1. Portada / menú principal
2. Nueva partida / carrera / dificultad
3. Pretemporada
4. Tablero
5. Plantel — todas sus pestañas
6. Ficha de jugador
7. Vestuario
8. Cuerpo técnico
9. Finanzas
10. Liga
11. Calendario
12. Rankings
13. Club
14. Historia
15. La semana / convocatoria
16. Quinteto y táctica
17. Partido en vivo
18. Postpartido / informe
19. Perfiles de rival / club / liga / jugador del mundo
20. Modales / confirmaciones / eventos
21. Fin de pretemporada
22. Fin de temporada / game over
23. Pantallas de galería/dev sólo si comparten componentes de producción

Para cada superficie registrar:
- ¿usa Global Shell?
- ¿usa tipografía por tokens o hardcodeada?
- ¿usa PANEL system?
- ¿usa CHIP-01?
- ¿usa STAT-01?
- ¿usa TABLE-01?
- ¿usa BUTTON system?
- ¿usa HEADER-01?
- ¿tiene estilos legacy/hardcodeados?
- estado: **Migrada / Parcial / Legacy**.

Guardar la auditoría en:
`design/UI_COVERAGE_AUDIT.md`

### Migración tipográfica

Después de auditar:

1. Agregar Fontsource:
   - `@fontsource/barlow`
   - `@fontsource/barlow-condensed`

2. Definir tokens únicos:
   - `--font-display: 'Barlow Condensed', sans-serif;`
   - `--font-ui: 'Barlow', sans-serif;`
   - mantener `--display` temporalmente como alias si hace falta para no romper CSS.

3. Reemplazar dependencias directas de:
   - Oswald
   - Segoe UI
   - Arial Narrow / Bahnschrift
   - otros font-family hardcodeados de producción
   por los tokens nuevos.

4. No cambiar tamaños todavía salvo donde la nueva métrica rompa layout.

5. Verificar:
   - 1440x900
   - 1366x768
   - no overflow nuevo;
   - navegación, tablas y marcador siguen entrando.

### Prueba visual

Sacar screenshots con la nueva tipografía de:
- Tablero
- Vestuario
- Plantel
- Partido
- Postpartido
- Finanzas
- Portada

Comparar con la referencia:
`design/arte/referencias/ui-final-partido-centro.png`

### Resultado esperado

Al terminar, actualizar **RESULTADO CLAUDE** con:
- commit;
- fuente implementada;
- lista de pantallas Migrada / Parcial / Legacy;
- qué componentes globales todavía faltan;
- screenshots;
- recomendaciones del próximo lote.

### Importante
No hacer todavía una refactorización masiva de las pantallas Legacy sin mostrar primero la auditoría y las screenshots con la nueva tipografía.
No cambiar lógica ni datos.

---

# RESULTADO CLAUDE

_Pendiente._
