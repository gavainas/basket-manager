import { useState } from 'react';
import { CLUB_COLORS } from '../data/worldData';
import { BALANCE } from '../game/balance';
import type { AbsenceDifficulty } from '../game/types';
import { USER_CLUB_ID } from '../game/world';
import { Crest } from './Crest';
import { Icon } from './Icon';

/**
 * La entrada del modo Carrera (T3 del diagnóstico de septiembre): la historia
 * primero, en tres escenas con el arte que ya está aprobado (la derrota, el
 * bar, la cancha desde la tribuna), y de ahí sale la creación: le ponés
 * nombre y colores al club (el escudo procedural ya sale de eso), y arrancás
 * sin plantel. No se generó ningún asset nuevo: las escenas son las cabeceras
 * y el fondo que el juego ya usa (ver public/arte/LEEME.md).
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

/** Las tres escenas de la intro: imagen ya aprobada, encuadre y texto. */
const ESCENAS: { art: string; pos: string; titulo: string; texto: string[] }[] = [
  {
    art: 'cab-derrota.webp',
    pos: 'center 40%',
    titulo: 'Un martes a las once de la noche',
    texto: [
      'Era un partido que no importaba. Fecha 7, ustedes ya afuera de todo, el rival con seis jugadores y un delegado que quería irse a dormir.',
      'Bajaste a defender, plantaste el pie, y la rodilla hizo un ruido que todavía escuchás. Cruzados. Los dos.',
    ],
  },
  {
    art: 'cab-bar.webp',
    pos: 'center 34%',
    titulo: 'Dos años sin pisar una cancha',
    texto: [
      'La rodilla volvió, más o menos. Vos no. Un día te diste cuenta de que hacía dos años que no pisabas un gimnasio, ni para mirar.',
      'Hasta que un jueves, en el bar, el del laburo te dijo lo que vos venías pensando sin decirlo: "¿Y si armamos algo? Vos ponés la cabeza, nosotros las piernas".',
    ],
  },
  {
    art: 'fondo-gimnasio.webp',
    pos: 'center 55%',
    titulo: 'Una libreta con nombres',
    texto: [
      'No tenés equipo. Tenés amigos: el del laburo, tu primo, el que jugaba con vos antes de la rodilla, el pibe del edificio. Una libreta, una pelota, y cuatro semanas.',
      `La liga pide ${BALANCE.preseason.minPlayers} fichas para inscribir un club. Con siete no hay temporada. Fichar es pedir un favor, y del segundo en adelante te van a preguntar quién más va.`,
    ],
  },
];

interface Props {
  difficulty: AbsenceDifficulty;
  onStart: (clubName: string, colors: [string, string]) => void;
  onBack: () => void;
  /** La portada del menú, para la pantalla de fundación. */
  portada: string;
}

export function CareerSetup({ difficulty, onStart, onBack, portada }: Props) {
  const [paso, setPaso] = useState(0);
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(1);
  const [sugerido] = useState(() => NOMBRES_SUGERIDOS[Math.floor(Math.random() * NOMBRES_SUGERIDOS.length)]);
  const colors = CLUB_COLORS[colorIdx] ?? CLUB_COLORS[0];
  const nombre = name.trim() || sugerido;
  const base = import.meta.env.BASE_URL;

  // Las tres escenas de la historia, a pantalla completa.
  if (paso < ESCENAS.length) {
    const e = ESCENAS[paso];
    return (
      <div
        className="carrera-escena"
        style={{ backgroundImage: `url(${base}arte/${e.art})`, backgroundPosition: e.pos }}
      >
        <div className="carrera-escena-texto">
          <div className="carrera-escena-paso">
            {paso + 1} / {ESCENAS.length}
          </div>
          <h1>{e.titulo}</h1>
          {e.texto.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          <div className="carrera-escena-botones">
            <button className="primary" onClick={() => setPaso(paso + 1)}>
              {paso === ESCENAS.length - 1 ? 'Fundar el club →' : 'Seguir →'}
            </button>
            <button onClick={() => setPaso(ESCENAS.length)}>Saltar la historia</button>
            <button onClick={onBack}>Volver al menú</button>
          </div>
        </div>
      </div>
    );
  }

  // La fundación: la portada a la izquierda, el formulario a la derecha.
  return (
    <div className="menu-screen">
      <div className="menu-portada" style={{ backgroundImage: `url(${portada})` }} role="img" aria-label="Asado en la cantina del club" />
      <div className="menu-panel">
        <div className="carrera-setup">
          <div className="carrera-intro">
            <h1>
              Carrera <span>· el club desde cero</span>
            </h1>
            <p>
              Arrancás con <strong>${BALANCE.carrera.startingMoney}</strong> que juntaron entre todos, que no alcanzan
              para la ficha de la liga: o te la fían, o jugás en la plaza. Necesitás{' '}
              <strong>{BALANCE.preseason.minPlayers} en {BALANCE.preseason.weeks} semanas</strong>. El mercado de
              fichajes de verdad llega el año que viene, si el club llega.
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
              Faltas y lesiones:{' '}
              <strong>{difficulty === 'facil' ? 'Fácil' : difficulty === 'dificil' ? 'Difícil' : 'Medio'}</strong> (se
              elige en el menú).
            </p>

            <div className="confirm-bar">
              <button className="primary" onClick={() => onStart(nombre, colors)}>
                Fundar {nombre} →
              </button>
              <button onClick={() => setPaso(0)}>Volver a la historia</button>
              <button onClick={onBack}>Menú</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
