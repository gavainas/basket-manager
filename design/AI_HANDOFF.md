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

## UI calibration — Foundation + Global Shell

### Contexto
Foundation + Global Shell ya mejoraron coherencia y estructura, pero la primera pasada quedó demasiado oscura y uniforme.

### Objetivo
Mantener el sistema nuevo y Paleta A, pero hacer una pasada de **balance de luz, contraste y profundidad**.

No volver al tema claro anterior.
No rehacer lógica.
No cambiar datos.
No rehacer layouts salvo ajustes mínimos necesarios para jerarquía visual.

### Ajustes buscados

#### 1. Shell
- Puede seguir siendo la capa más oscura.
- Mantener top nav y HUD nuevos.
- Evitar que todo el viewport se sienta bañado por el mismo azul.

#### 2. Panel principal
- Aclararlo respecto al shell.
- Debe separarse visualmente del fondo.
- Mantener Paleta A.

#### 3. Módulos internos
- Crear un tercer nivel claro de profundidad.
- No usar el mismo azul/opacidad para todas las cards.
- El usuario debe distinguir jerarquía antes de leer.

#### 4. Escenas / backgrounds
- Recuperar presencia del mundo ilustrado.
- Reducir overlays donde la legibilidad lo permita.
- Evitar que la ilustración quede como una textura irreconocible.

#### 5. Texto
- Mejorar contraste de texto secundario.
- Mantener display/títulos fuertes.
- No usar blanco pleno para absolutamente todo.

#### 6. Naranja
- Sigue reservado a CTA, selección y foco.
- No usar como decoración general.

### Pantallas de validación

Probar y mostrar BEFORE / AFTER en:

1. Tablero
2. Vestuario
3. Partido

### Criterio visual deseado

Debe sentirse:

- más claro, pero todavía dark;
- con más aire;
- más legible;
- con más vida;
- con mejor separación entre shell / panel / módulo / escena;
- más videojuego y menos “tema oscuro uniforme”.

### Importante
No hacer todavía una migración masiva del resto de pantallas hasta validar esta calibración.

---

# RESULTADO CLAUDE

_Pendiente._
