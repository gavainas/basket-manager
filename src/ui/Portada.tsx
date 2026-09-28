// La portada del juego: el menú central sobre la ilustración del asado.
//
// Composición aprobada por Gabi (public/arte/portada-menu-central/README.md):
// la ilustración original a pantalla completa con un velo encima, el título
// centrado arriba, los dos accesos grandes en el medio —la carpeta con el
// disquete para continuar, la pizarra con la pelota para empezar— y el
// archivador, más chico, para gestionar la partida. Las etiquetas son texto
// HTML, no parte de la imagen; los íconos van sin contenedor.
//
// UI V1 (sep 2026): la composición se queda; lo que cambia es el idioma. El
// velo pasa del marrón al azul noche del Tablero, el título y las etiquetas a
// la tiza, y el naranja deja de ser un subrayado que aparece al pasar el mouse
// para ser el único botón de la pantalla: el acceso que corresponde (seguir la
// partida guardada o, si no hay, empezar una). El segundo paso es una planilla
// azul noche como las del juego, no un panel marrón aparte.
//
// "Nueva partida" abre un segundo paso con las tres modalidades (la Carrera y
// las dos del club en marcha) y el selector de faltas y lesiones. La Carrera
// sigue yendo a sus tres escenas.

import { useEffect, useState } from 'react';
import type { AbsenceDifficulty } from '../game/types';
import { clearSave, loadGame, saveStatus } from '../persistence/storage';
import { CareerSetup } from './CareerSetup';
import type { ConfirmRequest } from './ConfirmDialog';
import { weekLabel } from './helpers';
import './portada.css';

/**
 * Qué partida es la guardada, en una línea: "Atlético El Parque · Temporada 1
 * · Semana 6 de 9". Antes la portada decía sólo "Hay una partida guardada" y
 * había que entrar para saber de qué club y en qué punto estaba.
 */
function resumenGuardado(): string | null {
  const s = loadGame();
  if (!s) return null;
  const donde =
    s.phase === 'preseason' || s.phase === 'preseasonEnd'
      ? 'pretemporada'
      : s.phase === 'seasonEnd'
        ? 'cierre de la temporada'
        : s.phase === 'gameOver'
          ? 'partida terminada'
          : `${weekLabel(s.week, s.seasonLength)}${s.week <= s.seasonLength ? ` de ${s.seasonLength}` : ''}`;
  return `${s.club.name} · Temporada ${s.seasonNumber} · ${donde}`;
}

const ARTE = `${import.meta.env.BASE_URL}arte/portada-menu-central/`;

export const DIFFICULTY_INFO: Record<AbsenceDifficulty, { label: string; desc: string }> = {
  facil: { label: 'Fácil', desc: 'Casi siempre están todos, hay un colchón en la caja y los comercios se animan.' },
  medio: { label: 'Medio', desc: 'La vida pasa: enfermos, viajes, algún lesionado y una caja justa.' },
  dificil: { label: 'Difícil', desc: 'Cada semana falta gente, la caja arranca corta y los imprevistos llueven.' },
};

type Paso = 'inicio' | 'nueva' | 'gestionar';

interface Props {
  /** La ilustración de fondo (`public/portada.webp`, armada con BASE_URL). */
  portada: string;
  onNew: (difficulty: AbsenceDifficulty) => void;
  onNewPreseason: (difficulty: AbsenceDifficulty) => void;
  onNewCareer: (difficulty: AbsenceDifficulty, clubName: string, colors: [string, string]) => void;
  onContinue: () => void;
  ask: (req: ConfirmRequest) => void;
}

export function Portada({ portada, onNew, onNewPreseason, onNewCareer, onContinue, ask }: Props) {
  const [, forceRender] = useState(0);
  const [difficulty, setDifficulty] = useState<AbsenceDifficulty>('medio');
  const [paso, setPaso] = useState<Paso>('inicio');
  const [carrera, setCarrera] = useState(false);
  const status = saveStatus();
  const saved = status === 'ok';
  const resumen = saved ? resumenGuardado() : null;

  // Escape vuelve al menú central desde cualquiera de los dos pasos.
  useEffect(() => {
    if (paso === 'inicio') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaso('inicio');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paso]);

  if (carrera) {
    return (
      <CareerSetup
        difficulty={difficulty}
        portada={portada}
        onStart={(n, c) => onNewCareer(difficulty, n, c)}
        onBack={() => setCarrera(false)}
      />
    );
  }

  return (
    <div className={`portada-v1${paso === 'inicio' ? '' : ' en-paso'}`}>
      {/* La ilustración original, intacta, a sangre. El velo es una capa aparte
          para ajustar el contraste sin tocar la imagen. */}
      <div className="pv1-fondo" style={{ backgroundImage: `url(${portada})` }} role="img" aria-label="Asado en la cantina del club" />
      <div className="pv1-velo" />

      <div className="pv1-contenido">
        {/* El título es texto: todavía no hay logo (ver el README del lote). */}
        <h1 className="pv1-titulo">
          <span className="pv1-t1">Básquet</span>
          <span className="pv1-t2">Manager</span>
          <span className="pv1-t3">Amateur</span>
        </h1>

        {paso === 'inicio' && (
          <>
            <div className="pv1-accesos">
              {/* El único naranja de la portada es el acceso que toca: seguir
                  la partida guardada, o empezar una si no hay. */}
              <button
                className={`pv1-acceso${saved ? ' principal' : ''}`}
                disabled={!saved}
                aria-disabled={!saved}
                title={saved ? 'Seguir la partida guardada' : 'No hay ninguna partida guardada'}
                onClick={onContinue}
              >
                <img src={`${ARTE}continuar.webp`} alt="" draggable={false} />
                <span className="pv1-etiqueta">Continuar partida</span>
                <span className="pv1-nota">
                  {saved
                    ? (resumen ?? 'La partida guardada')
                    : status === 'incompatible'
                      ? 'La partida guardada es de una versión vieja'
                      : 'Sin partida guardada'}
                </span>
              </button>
              <button
                className={`pv1-acceso${saved ? '' : ' principal'}`}
                title="Empezar un club nuevo o el de siempre"
                onClick={() => setPaso('nueva')}
              >
                <img src={`${ARTE}nueva-partida.webp`} alt="" draggable={false} />
                <span className="pv1-etiqueta">Nueva partida</span>
                <span className="pv1-nota">Fundar un club o tomar uno en marcha</span>
              </button>
            </div>
            <button className="pv1-acceso pv1-acceso-chico" title="Ver y borrar la partida guardada" onClick={() => setPaso('gestionar')}>
              <img src={`${ARTE}gestionar.webp`} alt="" draggable={false} />
              <span className="pv1-etiqueta">Gestionar partida</span>
            </button>
          </>
        )}

        {paso === 'nueva' && (
          <section className="pv1-panel v1-planilla" role="dialog" aria-labelledby="pv1-nueva-t">
            <header className="pv1-panel-cab">
              <h2 id="pv1-nueva-t">Nueva partida</h2>
              <span>Elegí cómo empezar</span>
            </header>
            <div className="pv1-modos">
              <button className="pv1-modo" onClick={() => setCarrera(true)}>
                <span className="pv1-modo-k">Carrera · el club desde cero</span>
                <span className="pv1-modo-t">Fundar tu club</span>
                <span className="pv1-modo-d">Sin plantel, con una libreta de amigos. Ocho en cuatro semanas o no hay temporada.</span>
              </button>
              <button className="pv1-modo" onClick={() => onNewPreseason(difficulty)}>
                <span className="pv1-modo-k">Club en marcha · Atlético El Parque</span>
                <span className="pv1-modo-t">Armá el plantel en la pretemporada</span>
                <span className="pv1-modo-d">Renovaciones, mercado y elección de liga antes de la primera fecha.</span>
              </button>
              <button className="pv1-modo" onClick={() => onNew(difficulty)}>
                <span className="pv1-modo-k">Club en marcha · Atlético El Parque</span>
                <span className="pv1-modo-t">Partida directa</span>
                <span className="pv1-modo-d">Plantel ya armado: a la primera semana.</span>
              </button>
            </div>
            <div className="pv1-dificultad">
              <span className="pv1-dif-k">Faltas y lesiones</span>
              <div className="pv1-dif-opciones" role="radiogroup" aria-label="Faltas y lesiones">
                {(Object.keys(DIFFICULTY_INFO) as AbsenceDifficulty[]).map((d) => (
                  <button
                    key={d}
                    role="radio"
                    aria-checked={difficulty === d}
                    className={difficulty === d ? 'on' : ''}
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_INFO[d].label}
                  </button>
                ))}
              </div>
              <p className="pv1-dif-d">{DIFFICULTY_INFO[difficulty].desc}</p>
            </div>
            {status !== 'none' && (
              <p className="pv1-aviso">
                {status === 'incompatible'
                  ? 'Hay una partida guardada de una versión que este juego ya no puede leer: si empezás una nueva, se pierde.'
                  : 'Hay una partida guardada: empezar una nueva la sobrescribe (se pide confirmación).'}
              </p>
            )}
            <button className="pv1-volver" onClick={() => setPaso('inicio')}>
              ← Volver <kbd>Esc</kbd>
            </button>
          </section>
        )}

        {paso === 'gestionar' && (
          <section className="pv1-panel v1-planilla" role="dialog" aria-labelledby="pv1-gestionar-t">
            <header className="pv1-panel-cab">
              <h2 id="pv1-gestionar-t">Gestionar partida</h2>
              <span>El juego guarda solo</span>
            </header>
            <p className="pv1-panel-p">
              {status === 'ok'
                ? <>Hay una partida guardada: <b>{resumen ?? 'la de siempre'}</b>. El juego guarda solo, en este navegador, cada vez que pasa algo.</>
                : status === 'incompatible'
                  ? 'Hay una partida guardada de una versión que este juego ya no puede leer. No se va a cargar.'
                  : 'No hay ninguna partida guardada en este navegador.'}
            </p>
            {status !== 'none' && (
              <button
                className="danger pv1-borrar"
                onClick={() =>
                  ask({
                    title: 'Borrar la partida guardada',
                    message: 'Se pierden el club, el plantel y toda su historia. Esto no se puede deshacer.',
                    confirmLabel: 'Borrar todo',
                    danger: true,
                    onConfirm: () => {
                      clearSave();
                      forceRender((n) => n + 1);
                    },
                  })
                }
              >
                Borrar partida guardada
              </button>
            )}
            <button className="pv1-volver" onClick={() => setPaso('inicio')}>
              ← Volver <kbd>Esc</kbd>
            </button>
          </section>
        )}

        <p className="pv1-version">
          Versión {__COMMIT_HASH__} ·{' '}
          {new Date(__COMMIT_DATE__).toLocaleString('es-UY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </p>
      </div>
    </div>
  );
}
