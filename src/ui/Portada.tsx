// La portada del juego: el menú central sobre la ilustración del asado.
//
// Composición aprobada por Gabi (public/arte/portada-menu-central/README.md):
// la ilustración original a pantalla completa con un velo oscuro encima, el
// título centrado arriba, los dos accesos grandes en el medio —la carpeta con
// el disquete para continuar, la pizarra con la pelota para empezar— y el
// archivador, más chico, para gestionar la partida. Las etiquetas son texto
// HTML, no parte de la imagen; los íconos van sin contenedor.
//
// "Nueva partida" abre un segundo paso con las tres modalidades (la Carrera y
// las dos del club en marcha) y el selector de faltas y lesiones, que antes
// vivía en el panel lateral. La Carrera sigue yendo a sus tres escenas.

import { useEffect, useState } from 'react';
import type { AbsenceDifficulty } from '../game/types';
import { clearSave, saveStatus } from '../persistence/storage';
import { CareerSetup } from './CareerSetup';
import type { ConfirmRequest } from './ConfirmDialog';

const ARTE = `${import.meta.env.BASE_URL}arte/portada-menu-central/`;

export const DIFFICULTY_INFO: Record<AbsenceDifficulty, { label: string; desc: string }> = {
  facil: { label: 'Fácil', desc: 'Casi siempre están todos: la vida molesta poco.' },
  medio: { label: 'Medio', desc: 'La vida pasa: enfermos, viajes y algún lesionado.' },
  dificil: { label: 'Difícil', desc: 'Cada semana falta gente: armar el equipo con los que vinieron es el juego.' },
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
    <div className="portada">
      {/* La ilustración original, intacta, a sangre. El velo es una capa aparte
          (--portada-velo) para ajustar el contraste sin tocar la imagen. */}
      <div className="portada-fondo" style={{ backgroundImage: `url(${portada})` }} role="img" aria-label="Asado en la cantina del club" />
      <div className="portada-velo" />

      <div className="portada-contenido">
        {/* El título es texto: todavía no hay logo (ver el README del lote).
            Oswald 700 es la aproximación a la collegiate del boceto. */}
        <h1 className="portada-titulo">
          <span className="portada-t1">Básquet</span>
          <span className="portada-t2">Manager</span>
          <span className="portada-t3">Amateur</span>
        </h1>

        {paso === 'inicio' && (
          <>
            <div className="portada-accesos">
              <button
                className="portada-acceso"
                disabled={!saved}
                aria-disabled={!saved}
                title={saved ? 'Seguir la partida guardada' : 'No hay ninguna partida guardada'}
                onClick={onContinue}
              >
                <img src={`${ARTE}continuar.webp`} alt="" draggable={false} />
                <span className="portada-etiqueta">Continuar partida</span>
                {!saved && (
                  <span className="portada-nota">
                    {status === 'incompatible' ? 'La partida guardada es de una versión vieja' : 'Sin partida guardada'}
                  </span>
                )}
              </button>
              <button className="portada-acceso" title="Empezar un club nuevo o el de siempre" onClick={() => setPaso('nueva')}>
                <img src={`${ARTE}nueva-partida.webp`} alt="" draggable={false} />
                <span className="portada-etiqueta">Nueva partida</span>
              </button>
            </div>
            <button className="portada-acceso portada-acceso-chico" title="Ver y borrar la partida guardada" onClick={() => setPaso('gestionar')}>
              <img src={`${ARTE}gestionar.webp`} alt="" draggable={false} />
              <span className="portada-etiqueta">Gestionar partida</span>
            </button>
          </>
        )}

        {paso === 'nueva' && (
          <div className="portada-panel" role="dialog" aria-labelledby="portada-nueva-t">
            <h2 id="portada-nueva-t">Nueva partida</h2>
            <div className="portada-modos">
              <button className="portada-modo" onClick={() => setCarrera(true)}>
                <span className="portada-modo-k">Carrera · el club desde cero</span>
                <span className="portada-modo-t">Fundar tu club</span>
                <span className="portada-modo-d">Sin plantel, con una libreta de amigos. Ocho en cuatro semanas o no hay temporada.</span>
              </button>
              <button className="portada-modo" onClick={() => onNewPreseason(difficulty)}>
                <span className="portada-modo-k">Club en marcha · Atlético El Parque</span>
                <span className="portada-modo-t">Armá el plantel en la pretemporada</span>
                <span className="portada-modo-d">Renovaciones, mercado y elección de liga antes de la primera fecha.</span>
              </button>
              <button className="portada-modo" onClick={() => onNew(difficulty)}>
                <span className="portada-modo-k">Club en marcha · Atlético El Parque</span>
                <span className="portada-modo-t">Partida directa</span>
                <span className="portada-modo-d">Plantel ya armado: a la primera semana.</span>
              </button>
            </div>
            <div className="portada-dificultad">
              <div className="portada-dif-k">Faltas y lesiones</div>
              <div className="segmented">
                {(Object.keys(DIFFICULTY_INFO) as AbsenceDifficulty[]).map((d) => (
                  <button key={d} className={difficulty === d ? 'on' : ''} onClick={() => setDifficulty(d)}>
                    {DIFFICULTY_INFO[d].label}
                  </button>
                ))}
              </div>
              <p className="portada-dif-d">{DIFFICULTY_INFO[difficulty].desc}</p>
            </div>
            {status !== 'none' && (
              <p className="portada-aviso">
                {status === 'incompatible'
                  ? 'Hay una partida guardada de una versión que este juego ya no puede leer: si empezás una nueva, se pierde.'
                  : 'Hay una partida guardada: empezar una nueva la sobrescribe (se pide confirmación).'}
              </p>
            )}
            <button className="portada-volver" onClick={() => setPaso('inicio')}>
              ← Volver
            </button>
          </div>
        )}

        {paso === 'gestionar' && (
          <div className="portada-panel" role="dialog" aria-labelledby="portada-gestionar-t">
            <h2 id="portada-gestionar-t">Gestionar partida</h2>
            <p className="portada-panel-p">
              {status === 'ok'
                ? 'Hay una partida guardada. El juego guarda solo, en este navegador, cada vez que pasa algo.'
                : status === 'incompatible'
                  ? 'Hay una partida guardada de una versión que este juego ya no puede leer. No se va a cargar.'
                  : 'No hay ninguna partida guardada en este navegador.'}
            </p>
            {status !== 'none' && (
              <button
                className="danger"
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
            <button className="portada-volver" onClick={() => setPaso('inicio')}>
              ← Volver
            </button>
          </div>
        )}

        <p className="portada-version">
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
