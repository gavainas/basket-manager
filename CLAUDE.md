# CLAUDE.md

## Reglas de shell (obligatorias)

- **Nunca usar `cd`**: la sesión ya está en el directorio del proyecto.
- **Nunca encadenar comandos** con `&&`, `;` ni pipes (`|`).
- **Un solo comando por llamada** a la herramienta de shell.

## Proyecto

Juego de gestión de un club de básquet amateur (React + TypeScript + Vite, sin backend; estado en LocalStorage).

- `npm run dev` — servidor de desarrollo (http://localhost:5173)
- `npm run build` — chequeo de TypeScript + build a `dist/`
- `npm run sim` — harness de balance: simula temporadas y reporta métricas (ver `design/BALANCE.md`)

Toda la lógica del juego vive en `src/game/` y es independiente de React. Los números de balance están centralizados en `src/game/balance.ts`; antes de ajustarlos, correr `npm run sim` y comparar contra los objetivos de `design/BALANCE.md`. El roadmap de features está en `ROADMAP.md`.
