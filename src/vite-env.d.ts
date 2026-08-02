/// <reference types="vite/client" />

// Inyectadas en el build por vite.config.ts (define): la versión del juego
// que se muestra en el menú principal.
declare const __COMMIT_HASH__: string;
declare const __COMMIT_DATE__: string;
