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
- `npm run sim` — harness de balance: simula temporadas y reporta métricas (ver `design/BALANCE.md`)

Toda la lógica del juego vive en `src/game/` y es independiente de React. Los números de balance están centralizados en `src/game/balance.ts`; antes de ajustarlos, correr `npm run sim` y comparar contra los objetivos de `design/BALANCE.md`. El roadmap de features está en `ROADMAP.md`.

La versión jugable vive en **https://gavainas.github.io/basket-manager/** (es la build que Gabi prueba, a veces incluso desde el celular, pero el formato objetivo es PC): cada push a `main` la redeploya solo vía GitHub Actions (`.github/workflows/deploy.yml`). Por eso todo trabajo termina commiteado **y pusheado**, con mensaje detallado — cada commit es una versión a la que Gabi puede pedir volver.
