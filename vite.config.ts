import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que el build funcione en GitHub Pages y en local.
  base: './',
  server: {
    // Respeta el puerto asignado por el entorno (p. ej. preview del harness).
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
