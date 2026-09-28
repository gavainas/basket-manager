import { useState } from 'react';
import { CLUB_COLORS } from '../data/worldData';
import { BALANCE } from '../game/balance';
import type { AbsenceDifficulty } from '../game/types';
import { USER_CLUB_ID } from '../game/world';
import { Crest } from './Crest';
import './carrera.css';

/**
 * La entrada del modo Carrera (T3 del diagnóstico de septiembre): la historia
 * primero, en tres escenas con el arte que ya está aprobado (la derrota, el
 * bar, la cancha desde la tribuna), y de ahí sale la creación: le ponés
 * nombre y colores al club (el escudo procedural ya sale de eso), y arrancás
 * sin plantel. No se generó ningún asset nuevo: las escenas son las cabeceras
 * y el fondo que el juego ya usa (ver public/arte/LEEME.md).
 *
 * UI V1 (sep 2026): las escenas son de videojuego —la imagen a sangre, el
 * texto abajo a la izquierda sobre un velo azul noche, un solo botón naranja
 * para seguir— y la fundación pasa en el gimnasio vacío que va a ser del
 * club: a la izquierda, sin caja, el escudo y el nombre que se van armando;
 * a la derecha, el acta de fundación como planilla con cinta.
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
  /** La portada del menú (la fundación pasa en el gimnasio; se conserva por la firma). */
  portada: string;
}

export function CareerSetup({ difficulty, onStart, onBack }: Props) {
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
    const ultima = paso === ESCENAS.length - 1;
    return (
      <div className="carrera-v1 cv1-escena">
        <div className="cv1-img" style={{ backgroundImage: `url(${base}arte/${e.art})`, backgroundPosition: e.pos }} />
        <div className="cv1-velo" />
        <div className="cv1-texto v1-hero">
          <div className="v1-eyebrow">
            Carrera · el club desde cero · <b>{paso + 1} de {ESCENAS.length}</b>
          </div>
          <div className="cv1-puntos" aria-hidden="true">
            {ESCENAS.map((_, i) => (
              <i key={i} className={i === paso ? 'on' : i < paso ? 'hecho' : ''} />
            ))}
          </div>
          <h1 className="v1-titulo">{e.titulo}</h1>
          {e.texto.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
          <div className="cv1-botones">
            <button className="primary v1-cta" onClick={() => setPaso(paso + 1)} autoFocus>
              {ultima ? 'Fundar el club →' : 'Seguir →'}
            </button>
            {!ultima && (
              <button className="cv1-ghost" onClick={() => setPaso(ESCENAS.length)}>
                Saltar la historia
              </button>
            )}
            <button className="cv1-ghost" onClick={onBack}>
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    );
  }

  // La fundación: el club que se va armando a la izquierda, el acta a la derecha.
  const dificultad = difficulty === 'facil' ? 'Fácil' : difficulty === 'dificil' ? 'Difícil' : 'Medio';
  return (
    <div className="carrera-v1 cv1-fundacion">
      <div className="cv1-img" style={{ backgroundImage: `url(${base}arte/fondo-gimnasio.webp)`, backgroundPosition: 'center 55%' }} />
      <div className="cv1-velo" />

      <div className="cv1-fund-grid">
        <section className="cv1-fund-hero v1-hero" aria-label="El club">
          <div className="v1-eyebrow">
            Carrera · <b>el club desde cero</b>
          </div>
          <h1 className="v1-titulo">Fundá el club</h1>
          <div className="cv1-club">
            <Crest seed={USER_CLUB_ID} name={nombre} colors={colors} founded={2025} size={148} />
            <div>
              <div className="cv1-club-nombre">{nombre}</div>
              <div className="cv1-club-sub">
                {NOMBRE_COLORES[colorIdx] ?? 'Sus colores'} · sin plantel todavía
              </div>
            </div>
          </div>
          <p className="v1-frase cv1-frase">
            Arrancás con <b>${BALANCE.carrera.startingMoney}</b> que juntaron entre todos, que no alcanzan para la ficha de
            la liga: o te la fían, o jugás en la plaza. Necesitás{' '}
            <b>
              {BALANCE.preseason.minPlayers} en {BALANCE.preseason.weeks} semanas
            </b>
            . El mercado de fichajes de verdad llega el año que viene, si el club llega.
          </p>
        </section>

        <section className="cv1-acta v1-planilla" aria-label="El acta de fundación">
          <i className="v1-cinta a" />
          <i className="v1-cinta b" />
          <h2 className="v1-mano">
            El acta <span>de fundación</span>
          </h2>

          <label className="cv1-campo">
            <span className="cv1-k">Nombre del club</span>
            <input
              type="text"
              maxLength={40}
              placeholder={sugerido}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <span className="cv1-ayuda">El escudo saca las iniciales del nombre: dos o tres palabras con carácter.</span>
          </label>

          <div className="cv1-campo">
            <span className="cv1-k">Colores</span>
            <div className="cv1-colores">
              {CLUB_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`cv1-color${i === colorIdx ? ' on' : ''}`}
                  title={NOMBRE_COLORES[i] ?? 'Colores'}
                  aria-label={NOMBRE_COLORES[i] ?? 'Colores'}
                  aria-pressed={i === colorIdx}
                  onClick={() => setColorIdx(i)}
                  style={{ background: `linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)` }}
                />
              ))}
            </div>
            <span className="cv1-ayuda">{NOMBRE_COLORES[colorIdx] ?? ''}</span>
          </div>

          <p className="cv1-dificultad cv1-ayuda">
            Faltas y lesiones: <b>{dificultad}</b> (se elige en el menú).
          </p>

          <div className="cv1-acta-pie">
            <button className="primary v1-cta" onClick={() => onStart(nombre, colors)}>
              Fundar {nombre} →
            </button>
            <div className="cv1-acta-otros">
              <button className="cv1-ghost" onClick={() => setPaso(0)}>
                Volver a la historia
              </button>
              <button className="cv1-ghost" onClick={onBack}>
                Menú
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
