# CLAUDE.md

## Reglas de shell (obligatorias)

- **Nunca usar `cd`**: la sesión ya está en el directorio del proyecto.
- **Nunca encadenar comandos** con `&&`, `;` ni pipes (`|`).
- **Un solo comando por llamada** a la herramienta de shell.

## Proyecto

Juego de gestión de un club de básquet amateur (React + TypeScript + Vite, sin backend; estado en LocalStorage).

**El juego está pensado para pantalla de PC: el objetivo es publicarlo en Steam.** Diseñar, maquetar y capturar en formato escritorio (~1280 px de ancho o más), no mobile-first.

- `npm run dev` — servidor de desarrollo (http://localhost:5173)
- `npm run build` — chequeo de TypeScript + build a `dist/`
- `npm test` — tests del motor (Vitest, en `tests/`): recorren temporadas enteras por el reducer
- `npm run sim` — harness de balance: simula temporadas y reporta métricas (ver `design/BALANCE.md`)

Toda la lógica del juego vive en `src/game/` y es independiente de React. Los números de balance están centralizados en `src/game/balance.ts`; antes de ajustarlos, correr `npm run sim` y comparar contra los objetivos de `design/BALANCE.md`. Antes de commitear, `npm run build` y `npm test` tienen que pasar: el CI (`.github/workflows/ci.yml`) corre las dos cosas más las simulaciones en cada push. Una migración de save nueva lleva su test en `tests/guardado.test.ts`.

Qué sigue está en `ROADMAP.md` (una página); lo hecho, en `CHANGELOG.md`. Al terminar una feature, la entrada va al changelog, no al roadmap.

## Arte y dirección visual (sep 2026)

**El arte lo define Gabi, no Claude.** Claude implementa contra la referencia; no genera assets, no propone paletas ni composiciones propias, y no arma láminas A/B para elegir. Si una pantalla no está en la referencia, se pide — no se dibuja.

La referencia son **las seis láminas de `design/arte/referencias/2026-09-16-ref-0X-*.png`** (24 pantallas, del menú principal al historial del club). Están en oscuro: ese es el destino. **El papel claro que se ve hoy es un placeholder**, no la meta.

La migración es **por pantalla, no de una vez**: primero los tokens de `:root` apuntan al oscuro, después cada vista se acerca a su lámina cuando le toque, y cada tanda deja escrito en `design/ART_PIPELINE.md` qué pantallas ya migraron. Se conservan el sistema de tokens, la escala tipográfica y de espaciado, el chrome neutro, el color por área, Oswald y el naranja reservado a la acción (`design/SISTEMA_VISUAL.md`). Las pantallas de la referencia que no tienen motor detrás (fichajes, elegir liga, pretemporada de cuatro semanas, fundar el club, partidas múltiples) no se maquetan hasta que el motor exista.

La versión jugable vive en **https://gavainas.github.io/basket-manager/** (es la build que Gabi prueba, a veces incluso desde el celular, pero el formato objetivo es PC): cada push a `main` la redeploya solo vía GitHub Actions (`.github/workflows/deploy.yml`). Por eso todo trabajo termina commiteado **y pusheado**, con mensaje detallado — cada commit es una versión a la que Gabi puede pedir volver.
