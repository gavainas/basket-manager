import { CLUB_COLORS } from '../data/worldData';
import { CREST_VARIANTS, clubInitials, crestFromSeed } from '../game/crest';
import { Crest } from './Crest';

// Pantalla de validación de escudos, solo desarrollo: abrir el juego y navegar a
// `/#escudos`. Hermana de `AvatarGallery` (`/#retratos`).
//
// Lo que hay que mirar acá, en este orden:
// 1. **Lectura en chico**: la fila de 18px es el caso real de la tabla de
//    posiciones. Si dos escudos no se distinguen ahí, el generador falla.
// 2. **Variedad**: la grilla con nombres de clubes de verdad. Si tres seguidos
//    se parecen, falta una capa o sobra correlación.
// 3. **Cobertura**: las filas por capa muestran cada variante aislada.

const CLUBES = [
  'Atlético El Parque',
  'Círculo Sportivo',
  'Deportivo La Curva',
  'Bohemios del Parque',
  'Unión Vecinal',
  'La Terminal',
  'Los Cardales',
  'Cilindro Viejo',
  'Halcones de la Costa',
  'Ferro del Norte',
  'Social Lanús Oeste',
  'Club 17 de Agosto',
  'Juventud de Villa',
  'Bella Vista',
  'Puerto Norte',
  'Villa Mitre',
  'El Rejunte',
  'Los Suplentes',
  'Barrio Sur',
  '18 de Mayo',
];

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>{titulo}</h3>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>{children}</div>
    </div>
  );
}

export function CrestGallery() {
  const colores = (i: number) => CLUB_COLORS[i % CLUB_COLORS.length];

  return (
    <div className="app-shell" style={{ paddingTop: '1.5rem' }}>
      <div className="vista sec-partidos">
        <h1 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Escudos
        </h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Generador procedural (<code>game/crest.ts</code>). Mismo id de club → mismo escudo. El detalle entra por
          umbral de tamaño: abajo de 28px solo silueta, partición y filete.
        </p>

        <Fila titulo="Lectura en distintos tamaños">
          {[18, 24, 28, 34, 44, 64, 96].map((s) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <Crest seed="c-parque" name="Atlético El Parque" colors={colores(0)} founded={1974} size={s} />
              <div className="muted" style={{ fontSize: '0.7rem', marginTop: '0.3rem' }}>
                {s}px
              </div>
            </div>
          ))}
        </Fila>

        <Fila titulo="El caso real: la fila de la tabla, a 18px">
          {CLUBES.map((n, i) => (
            <Crest key={n} seed={`club-${i}`} name={n} colors={colores(i)} founded={1930 + ((i * 7) % 80)} size={18} />
          ))}
        </Fila>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Variedad con nombres reales</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.9rem',
            }}
          >
            {CLUBES.map((n, i) => {
              const d = crestFromSeed(`club-${i}`, n, 1930 + ((i * 7) % 80));
              return (
                <div key={n} style={{ textAlign: 'center' }}>
                  <Crest
                    seed={`club-${i}`}
                    name={n}
                    colors={colores(i)}
                    founded={1930 + ((i * 7) % 80)}
                    size={64}
                  />
                  <div style={{ fontSize: '0.72rem', marginTop: '0.35rem', lineHeight: 1.25 }}>{n}</div>
                  <div className="muted" style={{ fontSize: '0.66rem' }}>
                    {clubInitials(n)} · f{d.shape} p{d.partition} c{d.charge} ★{d.stars}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Fila titulo={`Siluetas (${CREST_VARIANTS.shape})`}>
          {Array.from({ length: CREST_VARIANTS.shape }, (_, i) => (
            <Crest
              key={i}
              seed={`x`}
              name="Barrio Sur"
              colors={colores(0)}
              size={54}
              design={{ shape: i, partition: 0, charge: 0, stars: 0, initials: 'BS' }}
            />
          ))}
        </Fila>

        <Fila titulo={`Particiones (${CREST_VARIANTS.partition})`}>
          {Array.from({ length: CREST_VARIANTS.partition }, (_, i) => (
            <Crest
              key={i}
              seed={`y`}
              name="Barrio Sur"
              colors={colores(1)}
              size={54}
              design={{ shape: 0, partition: i, charge: 0, stars: 0, initials: 'BS' }}
            />
          ))}
        </Fila>

        <Fila titulo={`Figuras centrales (${CREST_VARIANTS.charge})`}>
          {Array.from({ length: CREST_VARIANTS.charge }, (_, i) => (
            <Crest
              key={i}
              seed={`z`}
              name="Barrio Sur"
              colors={colores(2)}
              size={54}
              design={{ shape: 0, partition: 0, charge: i, stars: 0, initials: 'BS' }}
            />
          ))}
        </Fila>

        <Fila titulo="Estrellas por antigüedad">
          {[0, 1, 3].map((n) => (
            <Crest
              key={n}
              seed={`w${n}`}
              name="Barrio Sur"
              colors={colores(3)}
              size={54}
              design={{ shape: 0, partition: 2, charge: 0, stars: n, initials: 'BS' }}
            />
          ))}
        </Fila>
      </div>
    </div>
  );
}
