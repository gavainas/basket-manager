# Design system — Basket Manager

El repositorio es la **fuente de verdad** del diseño: tokens, componentes, generadores y
reglas viven acá. El proyecto **"Basket Manager UI"** en [claude.ai/design](https://claude.ai/design)
es un espejo para explorar y visualizar el sistema, nunca el original.

> **Estado de aprobación:** la UI y los retratos **actualmente implementados** siguen
> siendo provisionales. En agosto de 2026 se cerró la **Puerta 1**: hay una dirección
> artística aprobada (paleta y estructura de hub), documentada en
> [`ART_BIBLE.md`](ART_BIBLE.md) — todavía **sin implementar**, y con tipografía e
> íconos abiertos. Antes de expandir o generar arte en masa, seguir las puertas de
> [`ART_PIPELINE.md`](ART_PIPELINE.md).

## Identidad: gestión amateur

El juego combina dos mundos que la UI debe tratar como uno solo:

1. **Gestión deportiva**: plantel, quinteto, tácticas, partidos, estadísticas, fichajes,
   scouting, ligas, calendario, finanzas.
2. **Vida social amateur**: asados, cerveza, vestuario, grupos de WhatsApp, cuotas,
   camisetas, llegadas tarde, favores, amigos y conflictos, gente con trabajo y familia.

El tono visual debe ser **humano, cálido, divertido y cercano**: profesional en
usabilidad, amateur en personalidad. Reconocible para cualquiera que haya jugado
básquet amateur.

**Evitar:**

- Estética fría de software corporativo.
- Copiar literalmente Football Manager.
- Jugadores que parezcan todos atletas profesionales.
- Ilustraciones infantiles o excesivamente caricaturescas.
- Abusar de balones, llamas, trofeos y clichés deportivos.
- Una estética tan limpia que borre la identidad de club de barrio.

**Inspiraciones funcionales (sin copiar):** Football Manager (densidad y navegación),
PC Basket (lectura rápida del plantel), Balatro (personalidad y feedback), juegos
narrativos de gestión (eventos humanos con consecuencias visibles).

Texturas y guiños permitidos, siempre sutiles y sin dificultar la lectura: parquet,
pizarra táctica, camisetas, planillas de partido, carteles impresos, chat de grupo.

## Tokens

Definidos en [`src/styles.css`](../src/styles.css) (`:root`). Tema oscuro único ("partido nocturno").

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0e141f` | Fondo general |
| `--bg-soft` | `#16202e` | Fondo de pistas/tracks |
| `--panel` | `#1b2739` | Cards y paneles |
| `--panel-2` | `#223148` | Superficies elevadas (botones, avatares) |
| `--border` | `#2d3f5a` | Bordes |
| `--text` | `#e8eef7` | Texto principal |
| `--text-dim` | `#93a5bf` | Texto secundario |
| `--accent` | `#f08c2e` | Naranja básquet: acciones, selección, identidad |
| `--good` | `#3ddc84` | Positivo |
| `--warn` | `#f2c14e` | Alerta |
| `--bad` | `#ff5d5d` | Negativo |
| `--radius` | `10px` | Radio estándar |

Regla: **ningún color hardcodeado en componentes**; siempre tokens. Excepciones ya
existentes a corregir de a poco: azul "rotación" (`#4ea8de`) — candidato a token.

## Componentes existentes

Todos estilados en `src/styles.css`, markup en `src/ui/`:

- **Layout**: `.app-shell`, `.topbar`, `.tabs`, `.steps` (flujo semanal).
- **Superficies**: `.card`, `.stat-tile`, `.action-card`.
- **Jugadores**: `.player-card`, `.player-grid`, `.avatar` (retratos: ver
  [AVATAR_SYSTEM.md](AVATAR_SYSTEM.md)), `.player-chips`.
- **Datos**: `table` + `.table-wrap`, `.bar-row` (barras 0-100 con umbrales
  verde ≥ 65 / amarillo ≥ 40 / rojo < 40), `.chip` (estados).
- **Partido**: `.scoreboard`, `.result-badge`, `.reason-list`.
- **Eventos**: `.modal` + `.modal-backdrop` (ver [SOCIAL_UI.md](SOCIAL_UI.md)).
- **Noticias**: `.news-list` con `.news-dot` semáforo.

## Reglas de UX

- **Estados humanos, no solo porcentajes**: todo número importante se acompaña de una
  frase contextual ("Molesto porque jugó solo seis minutos" al lado de la moral).
  El motor ya produce estas frases (`PlayerMood`, comentarios de rating, notas de
  disponibilidad); la UI debe mostrarlas junto al dato, nunca reemplazarlas por la cifra sola.
- **Información incompleta visible**: lo que el DT no sabe se muestra como aproximado
  (`≈74`, estrellas, "todavía no lo viste jugar"), nunca como dato exacto.
- **Lo social no es un módulo aparte**: cuotas, asados y conflictos aparecen en las
  mismas cards y tablas que los datos deportivos.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) en toda columna numérica.
- **Densidad con jerarquía**: mucha información por pantalla, pero siempre con
  título de card uppercase-dim, valor grande y subtexto.

## Estructura de esta carpeta

```
design/
  DESIGN.md          ← este archivo: principios, tokens y reglas de la UI implementada
  ART_BIBLE.md       ← dirección artística aprobada (reglas, no exploración)
  ART_PIPELINE.md    ← proceso de arte, roles y puertas de aprobación
  AVATAR_SYSTEM.md   ← generador modular de retratos
  SOCIAL_UI.md       ← familia visual de eventos sociales
  art/               ← exploración: propuestas y prompts (no aprobado por defecto)
  cards/             ← SALIDA GENERADA por npm run design:sync (ignorada por git)
  components/        ← (futuro) specs por componente cuando haga falta detallar
  references/        ← referencias e imágenes de exploración, con su manifest
```

**Diferencia clave**: `DESIGN.md` describe **lo que está implementado hoy**;
`ART_BIBLE.md` describe **lo aprobado como dirección futura**. Mientras la implementación
no alcance a la dirección aprobada, los dos documentos conviven y no se contradicen.

## Roles de las herramientas

La división completa está documentada en [`ART_PIPELINE.md`](ART_PIPELINE.md):

- **Higgsfield:** exploración artística, concept art, personajes, cuerpos, escenas,
  fondos e ilustraciones.
- **Claude Design:** UI/UX, arquitectura de información, layout, navegación y sistema
  de interfaz.
- **Claude Code:** implementación, integración de assets y escalado técnico después de
  la aprobación.
- **Gabi:** dirección creativa y aprobación explícita en cada puerta.

Ninguna exploración o implementación se considera arte final por el solo hecho de existir
en el repositorio.

## Sincronización con Claude Design

- **Proyecto**: "Basket Manager UI" en claude.ai/design
  (id `1d031dfc-a179-43eb-af15-bd391a4eb482`).
- **Generar cards**: `npm run design:sync` → ejecuta
  [`scripts/design-sync.mjs`](../scripts/design-sync.mjs), que lee `src/styles.css` y
  escribe una card HTML autocontenida por componente en `design/cards/`
  (sobrescribe el contenido de esa carpeta; no toca nada más).
- **Subir**: la subida la hace Claude con su herramienta DesignSync leyendo
  `design/cards/`. En una sesión de Claude Code sobre este repo basta pedir
  "sincronizá el design system".
- **Cuándo**: cada vez que cambie `src/styles.css` o el markup de un componente
  retratado en una card, para que el espejo no quede desactualizado.
- **Dirección del flujo**: las exploraciones hechas en Claude Design se aplican
  al repo editando `src/styles.css` / `src/ui/`; nunca al revés.
- **Límite del flujo:** sincronizar componentes no equivale a aprobar una dirección
  artística. La expansión visual depende de las puertas definidas en `ART_PIPELINE.md`.
