import { useState } from 'react';
import { APPEARANCE_VARIANTS } from '../game/appearance';
import { Avatar } from './Avatar';

// Pantalla de validación del generador de retratos (solo desarrollo).
// Se abre navegando a /#retratos — no es accesible desde el juego.

const NAMES = [
  'El Colo', 'Marcos', 'Tuli', 'Gordo Dani', 'Seba', 'El Profe',
  'Nico', 'Tano', 'Lucho', 'El Ruso', 'Fede', 'Chino',
  'Pablo', 'El Flaco', 'Maxi', 'Turco', 'Agus', 'Beto',
  'Damián', 'El Pela', 'Gonza', 'Negro Ale', 'Rama', 'Doctor',
  'Cristian', 'El Pibe', 'Mati', 'Vasco', 'Leo', 'El Mudo',
  'Javi', 'Peti', 'Emi', 'Don Osvaldo', 'Kevin', 'El Primo',
];

const JERSEYS = ['#f08c2e', '#4ea8de', '#3ddc84', '#d95d5d', '#9d6fd6', '#e0c14e'];

export function AvatarGallery() {
  const [batch, setBatch] = useState(0);

  const combos = Object.values(APPEARANCE_VARIANTS).reduce((acc, n) => acc * n, 1);
  const players = NAMES.map((name, i) => ({
    name,
    seed: `retrato-${batch}-${i}`,
    age: 18 + ((i * 7 + batch * 5) % 27) + (i % 9 === 0 ? 8 : 0),
    jersey: JERSEYS[i % JERSEYS.length],
  }));

  return (
    <div className="app-shell">
      <div className="topbar">
        <span className="club-name">🏀 Retratos — validación del generador</span>
        <div className="spacer" />
        <button onClick={() => setBatch((b) => b + 1)}>Otra tanda</button>
        <button onClick={() => { window.location.hash = ''; window.location.reload(); }}>Volver al juego</button>
      </div>

      <p className="muted">
        {NAMES.length} jugadores derivados de seeds distintas. Mismo encuadre, edad sesgando canas,
        calvicie y arrugas. Combinaciones teóricas del sistema: ~{combos.toExponential(1).replace('e+', ' × 10^')}.
      </p>

      <h2 className="section-title">Lectura en distintos tamaños</h2>
      <div className="size-row">
        {[24, 32, 42, 64, 96].map((s) => (
          <div key={s} style={{ textAlign: 'center' }}>
            <div className="avatar" style={{ width: s, height: s }}>
              <Avatar seed={`retrato-${batch}-0`} age={34} size={s} />
            </div>
            <div className="muted">{s}px</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Tanda {batch + 1}</h2>
      <div className="gallery-grid">
        {players.map((p) => (
          <div key={p.seed} className="gallery-tile">
            <div className="avatar">
              <Avatar seed={p.seed} age={p.age} jersey={p.jersey} title={p.name} />
            </div>
            <div className="g-name">{p.name}</div>
            <div className="g-age">{p.age} años</div>
          </div>
        ))}
      </div>
    </div>
  );
}
