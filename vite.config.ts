import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// Versión visible en el menú: hash y fecha del commit con el que se hizo este
// build. Así cualquiera puede saber qué versión está jugando (y si el deploy
// de GitHub Pages ya le llegó o sigue viendo caché).
function gitBuildInfo(): { hash: string; date: string } {
  try {
    return {
      hash: execSync('git log -1 --format=%h').toString().trim(),
      date: execSync('git log -1 --format=%cI').toString().trim(),
    };
  } catch {
    return { hash: 'dev', date: new Date().toISOString() };
  }
}
const build = gitBuildInfo();

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages y en local.
  base: './',
  define: {
    __COMMIT_HASH__: JSON.stringify(build.hash),
    __COMMIT_DATE__: JSON.stringify(build.date),
  },
  server: {
    // Respeta el puerto asignado por el entorno (p. ej. preview del harness).
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
