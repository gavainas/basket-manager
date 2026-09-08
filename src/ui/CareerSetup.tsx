import { useState } from 'react';
import { CLUB_COLORS } from '../data/worldData';
import { BALANCE } from '../game/balance';
import type { AbsenceDifficulty } from '../game/types';
import { USER_CLUB_ID } from '../game/world';
import { Crest } from './Crest';
import { Icon } from './Icon';

/**
 * La entrada del modo Carrera (T3 del diagnóstico de septiembre): la historia
 * primero, y de ahí sale la creación. Le ponés nombre y colores al club (el
 * escudo procedural ya sale de eso), y arrancás sin plantel: la primera
 * pretemporada es una libreta de contactos.
 */

const NOMBRES_SUGERIDOS = [
  'Club Atlético Los Cruzados',
  'Los Amigos del Parque',
  'Deportivo La Esquina',
  'Unión de la Cuadra',
  'Club Social El Aro',
  'Bohemios del Sur',
  'Atlético Media Cancha',
];

const NOMBRE_COLORES = ['Azul y blanco', 'Bordó y crema', 'Verde y blanco', 'Negro y oro', 'Violeta y blanco', 'Ladrillo y hueso'];

interface Props {
  difficulty: AbsenceDifficulty;
  onStart: (clubName: string, colors: [string, string]) => void;
  onBack: () => void;
}

export function CareerSetup({ difficulty, onStart, onBack }: Props) {
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(1);
  const [sugerido] = useState(() => NOMBRES_SUGERIDOS[Math.floor(Math.random() * NOMBRES_SUGERIDOS.length)]);
  const colors = CLUB_COLORS[colorIdx] ?? CLUB_COLORS[0];
  const nombre = name.trim() || sugerido;

  return (
    <div className="carrera-setup">
      <div className="carrera-intro">
        <h1>
          Carrera <span>· el club desde cero</span>
        </h1>
        <p>
          Te comiste los cruzados en un partido que no importaba, un martes a las once de la noche. La rodilla
          no volvió, y las canchas tampoco: un día te diste cuenta de que hacía dos años que no pisabas una.
        </p>
        <p>
          Lo único que te quedó del básquet es una libreta con nombres. El del laburo, tu primo, el que jugaba con
          vos antes de la rodilla, el pibe del edificio. Y una idea que no se te va: si nadie te da un equipo,
          armalo.
        </p>
        <p>
          No tenés plantel: tenés amigos. Fichar es pedir un favor, y el segundo ya te va a preguntar quién más
          va. Necesitás <strong>{BALANCE.preseason.minPlayers} para inscribir al club</strong> y tenés{' '}
          <strong>{BALANCE.preseason.weeks} semanas</strong>. Con siete no hay temporada. Arrancás con{' '}
          <strong>${BALANCE.carrera.startingMoney}</strong> que juntaron entre todos, que no alcanzan para la
          ficha de la liga: o te la fían, o jugás en la plaza. El mercado de fichajes de verdad llega el año que
          viene, si el club llega.
        </p>
      </div>

      <div className="carrera-form card">
        <h3 className="card-band">
          <Icon name="inscripcion" size={17} /> Fundá el club
        </h3>
        <div className="carrera-escudo">
          <Crest seed={USER_CLUB_ID} name={nombre} colors={colors} founded={2025} size={132} />
          <div className="carrera-escudo-nombre">{nombre}</div>
        </div>

        <label className="carrera-campo">
          <span className="carrera-k">Nombre del club</span>
          <input
            type="text"
            maxLength={40}
            placeholder={sugerido}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <span className="hint">El escudo saca las iniciales del nombre: dos o tres palabras con carácter.</span>
        </label>

        <div className="carrera-campo">
          <span className="carrera-k">Colores</span>
          <div className="carrera-colores">
            {CLUB_COLORS.map((c, i) => (
              <button
                key={i}
                type="button"
                className={`carrera-color${i === colorIdx ? ' on' : ''}`}
                title={NOMBRE_COLORES[i] ?? 'Colores'}
                onClick={() => setColorIdx(i)}
                style={{ background: `linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)` }}
              />
            ))}
          </div>
          <span className="hint">{NOMBRE_COLORES[colorIdx] ?? ''}</span>
        </div>

        <p className="hint">
          Faltas y lesiones: <strong>{difficulty === 'facil' ? 'Fácil' : difficulty === 'dificil' ? 'Difícil' : 'Medio'}</strong>{' '}
          (se elige en el menú).
        </p>

        <div className="confirm-bar">
          <button className="primary" onClick={() => onStart(nombre, colors)}>
            Fundar {nombre} →
          </button>
          <button onClick={onBack}>Volver</button>
        </div>
      </div>
    </div>
  );
}
