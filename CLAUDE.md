# CLAUDE.md

## Reglas de shell (obligatorias)

- **Nunca usar `cd`**: la sesión ya está en el directorio del proyecto.
- **Nunca encadenar comandos** con `&&`, `;` ni pipes (`|`).
- **Un solo comando por llamada** a la herramienta de shell.

## Proyecto

Juego de gestión de un club de básquet amateur (React + TypeScript + Vite, sin backend; estado en LocalStorage).

- `npm run dev` — servidor de desarrollo (http://localhost:5173)
- `npm run build` — chequeo de TypeScript + build a `dist/`

Toda la lógica del juego vive en `src/game/` y es independiente de React. Los números de balance están centralizados en `src/game/balance.ts`. El roadmap de features está en `ROADMAP.md`.
