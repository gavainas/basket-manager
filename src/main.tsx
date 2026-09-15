import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Tipografía condensada empaquetada, no del sistema: Bahnschrift solo existe en
// Windows y el juego va a Steam. Oswald es SIL OFL y viaja con el build.
// Solo el subconjunto latino, solo los pesos que usamos.
import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/oswald/latin-700.css';

import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

/**
 * Las dos pantallas de validación (`/#retratos` y `/#escudos`, ver
 * design/AVATAR_SYSTEM.md y design/SISTEMA_VISUAL.md) se eligen acá y no
 * adentro de App, por dos razones:
 *
 * - **Se cargan sólo si se piden.** Con `import()` quedan en su propio chunk:
 *   son pantallas de desarrollo y no tienen por qué viajar en el bundle que
 *   descarga el que entra a jugar.
 * - **Adentro de App eran un `return` condicional antes de la mitad de los
 *   hooks**: si el hash cambiaba en caliente, el orden de hooks cambiaba y
 *   React lo hubiera cortado. Acá no hay hooks de por medio.
 */
const galerias: Record<string, () => Promise<() => React.JSX.Element>> = {
  '#retratos': () => import('./ui/AvatarGallery').then((m) => m.AvatarGallery),
  '#escudos': () => import('./ui/CrestGallery').then((m) => m.CrestGallery),
};

/* Cambiar el hash no vuelve a ejecutar esto, así que escribir `#retratos` en
   la barra y dar Enter no hacía nada (tampoco antes, cuando la decisión vivía
   en App: el hash no dispara un render). El juego no usa el hash para nada
   más, así que recargar es la respuesta simple y predecible. */
window.addEventListener('hashchange', () => window.location.reload());

const abrirGaleria = galerias[window.location.hash];
if (abrirGaleria) {
  abrirGaleria().then((Galeria) => {
    root.render(
      <React.StrictMode>
        <Galeria />
      </React.StrictMode>
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
