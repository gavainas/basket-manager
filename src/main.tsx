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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
