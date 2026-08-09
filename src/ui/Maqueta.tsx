import { useState, type ReactNode } from 'react';
import { Avatar } from './Avatar';
import '../maqueta.css';

// Maqueta navegable de la dirección de arte elegida (ver design/ART_PIPELINE.md,
// registro 2026-08-09). Se abre en /#maqueta — no es accesible desde el juego y
// no toca su estado. Cubre las 5 pantallas del vertical slice (Puerta 4):
// inicio, plantel, ficha, evento social y partido. Datos de mentira.
//
// Los recuadros de foto (MqPhoto) intentan cargar el asset real desde
// public/maqueta/<archivo> y, si no existe, muestran un placeholder SVG.
// Cuando los assets de Higgsfield estén aprobados, se copian con estos nombres
// y aparecen sin tocar código:
//   icono-lista.jpg, icono-pizarra.jpg, icono-marcador.jpg, icono-tabla.jpg,
//   icono-calendario.jpg, icono-camiseta.jpg, icono-cuotas.jpg,
//   icono-gastos.jpg, icono-rifa.jpg, icono-vestuario.jpg, icono-fichajes.jpg,
//   escudo.png, evento-asado.jpg y retrato-<dorsal>.jpg (4 al 14).

type MqScreen = 'inicio' | 'plantel' | 'ficha' | 'evento' | 'partido';

/** Nombre corto para las cards chicas ("El Colo Ferreira" → "Colo"). */
function apodo(nombre: string): string {
  const partes = nombre.replace(/^(El|La) /, '').split(' ');
  return partes[0];
}

interface MqPlayer {
  id: string;
  dorsal: number;
  nombre: string;
  edad: number;
  rol: string;
  tecnica: number;
  fisico: number;
  moral: number;
  frase: string;
  chips: { label: string; warn?: boolean }[];
}

const PLANTEL: MqPlayer[] = [
  { id: 'mq-p4', dorsal: 4, nombre: 'Seba Techera', edad: 31, rol: 'Base', tecnica: 71, fisico: 58, moral: 82, frase: 'Cómodo llevando la voz cantante.', chips: [{ label: 'Titular' }] },
  { id: 'mq-p5', dorsal: 5, nombre: 'Nico Alsina', edad: 24, rol: 'Escolta', tecnica: 66, fisico: 74, moral: 44, frase: 'Molesto: jugó seis minutos el lunes.', chips: [{ label: 'Molesto', warn: true }] },
  { id: 'mq-p6', dorsal: 6, nombre: 'El Colo Ferreira', edad: 28, rol: 'Alero', tecnica: 62, fisico: 66, moral: 75, frase: 'Organiza el asado del sábado.', chips: [{ label: 'Rotación' }] },
  { id: 'mq-p7', dorsal: 7, nombre: 'Marcos Píriz', edad: 35, rol: 'Ala-pívot', tecnica: 58, fisico: 41, moral: 68, frase: 'El físico ya no acompaña, la cabeza sí.', chips: [{ label: 'Veterano' }] },
  { id: 'mq-p8', dorsal: 8, nombre: 'Guille Souto', edad: 22, rol: 'Pívot', tecnica: 55, fisico: 80, moral: 90, frase: 'Eufórico después del partidazo.', chips: [{ label: 'Promesa' }] },
  { id: 'mq-p9', dorsal: 9, nombre: 'Rodri Camejo', edad: 38, rol: 'Base', tecnica: 64, fisico: 35, moral: 60, frase: 'Pide descanso: viene fundido del trabajo.', chips: [{ label: 'Fundido', warn: true }] },
  { id: 'mq-p10', dorsal: 10, nombre: 'Facu Olivera', edad: 26, rol: 'Escolta', tecnica: 60, fisico: 69, moral: 71, frase: 'Debe dos cuotas, pero aparece siempre.', chips: [{ label: 'Debe $120', warn: true }] },
  { id: 'mq-p11', dorsal: 11, nombre: 'Tato Bermúdez', edad: 29, rol: 'Alero', tecnica: 57, fisico: 63, moral: 66, frase: 'Va a todas: entrenamientos y tercer tiempo.', chips: [{ label: 'Cumplidor' }] },
  { id: 'mq-p12', dorsal: 12, nombre: 'Lucho Gaye', edad: 33, rol: 'Pívot', tecnica: 61, fisico: 52, moral: 58, frase: 'Con una técnica: cuidarlo del árbitro estricto.', chips: [{ label: '1 técnica', warn: true }] },
  { id: 'mq-p13', dorsal: 13, nombre: 'Dani Umpiérrez', edad: 27, rol: 'Ala-pívot', tecnica: 53, fisico: 71, moral: 77, frase: 'Feliz de arrancar de titular.', chips: [{ label: 'Titular' }] },
  { id: 'mq-p14', dorsal: 14, nombre: 'Chino Acosta', edad: 30, rol: 'Alero', tecnica: 59, fisico: 60, moral: 63, frase: 'Prometió traer un amigo al próximo picado.', chips: [{ label: 'Rotación' }] },
];

/* ---------- Placeholders SVG (huecos para los assets de Higgsfield) ---------- */

function Ph({ children, title }: { children: ReactNode; title: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title}>
      {children}
    </svg>
  );
}

const PH_ICONS: Record<string, ReactNode> = {
  lista: (
    <Ph title="Planilla de asistencia">
      <rect x="14" y="10" width="36" height="46" rx="3" fill="#fffdf4" stroke="#8a7a55" />
      <rect x="24" y="6" width="16" height="9" rx="2" fill="#b3a276" />
      <path d="M20 24h18M20 32h24M20 40h20M20 48h24" stroke="#8a7a55" strokeWidth="2.4" />
      <path d="M43 22l3 4 6-8" stroke="#4a9e4f" strokeWidth="3" fill="none" />
    </Ph>
  ),
  pizarra: (
    <Ph title="Pizarra táctica">
      <rect x="8" y="12" width="48" height="40" rx="4" fill="#fffdf4" stroke="#8a7a55" />
      <path d="M14 44c8-12 22-12 30-22" stroke="#c0392b" strokeWidth="2.4" fill="none" />
      <circle cx="20" cy="24" r="4" fill="#1d2c4f" />
      <circle cx="34" cy="34" r="4" fill="#1d2c4f" />
      <path d="M42 20l6 6M48 20l-6 6" stroke="#c0392b" strokeWidth="2.6" />
    </Ph>
  ),
  marcador: (
    <Ph title="Marcador">
      <rect x="6" y="14" width="52" height="36" rx="4" fill="#10151f" stroke="#000" />
      <text x="18" y="38" fontSize="16" fontWeight="bold" fill="#f5c445" textAnchor="middle">68</text>
      <text x="32" y="38" fontSize="12" fill="#8091ab" textAnchor="middle">:</text>
      <text x="46" y="38" fontSize="16" fontWeight="bold" fill="#f5c445" textAnchor="middle">62</text>
    </Ph>
  ),
  tabla: (
    <Ph title="Tabla de posiciones">
      <rect x="10" y="8" width="44" height="48" rx="3" fill="#fffdf4" stroke="#8a7a55" />
      <rect x="10" y="8" width="44" height="10" rx="3" fill="#1d2c4f" />
      <path d="M16 26h32M16 34h32M16 42h32M16 50h32" stroke="#c8b795" strokeWidth="2" />
      <circle cx="19" cy="26" r="2.4" fill="#f0862e" />
    </Ph>
  ),
  calendario: (
    <Ph title="Calendario">
      <rect x="10" y="12" width="44" height="42" rx="4" fill="#fffdf4" stroke="#8a7a55" />
      <rect x="10" y="12" width="44" height="10" rx="4" fill="#c0392b" />
      <path d="M20 8v8M44 8v8" stroke="#5a4a30" strokeWidth="3" />
      <circle cx="40" cy="40" r="6" fill="none" stroke="#c0392b" strokeWidth="2.4" />
    </Ph>
  ),
  camiseta: (
    <Ph title="Camiseta del club">
      <path d="M22 12l10 6 10-6 10 8-6 8-4-2v28H22V26l-4 2-6-8z" fill="#1d2c4f" stroke="#0e1830" />
      <path d="M30 18v38M38 18v38" stroke="#f0862e" strokeWidth="5" />
    </Ph>
  ),
  cuotas: (
    <Ph title="Caja de cuotas">
      <rect x="8" y="22" width="48" height="30" rx="4" fill="#8a7a55" stroke="#5a4a30" />
      <rect x="8" y="18" width="48" height="10" rx="4" fill="#a8965f" />
      <rect x="16" y="30" width="14" height="8" rx="1" fill="#7cc47a" stroke="#4a9e4f" />
      <rect x="34" y="30" width="14" height="8" rx="1" fill="#7cc47a" stroke="#4a9e4f" />
      <rect x="25" y="40" width="14" height="8" rx="1" fill="#7cc47a" stroke="#4a9e4f" />
    </Ph>
  ),
  gastos: (
    <Ph title="Gastos">
      <path d="M18 8h28v44l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3z" fill="#fffdf4" stroke="#8a7a55" />
      <path d="M24 20h16M24 28h16M24 36h10" stroke="#8a7a55" strokeWidth="2.4" />
      <text x="40" y="40" fontSize="11" fontWeight="bold" fill="#c0392b">$</text>
    </Ph>
  ),
  rifa: (
    <Ph title="Rifa">
      <rect x="8" y="20" width="34" height="18" rx="2" fill="#e8d8a8" stroke="#8a7a55" transform="rotate(-8 25 29)" />
      <rect x="22" y="28" width="34" height="18" rx="2" fill="#f0e3bd" stroke="#8a7a55" transform="rotate(5 39 37)" />
      <path d="M30 30v14" stroke="#8a7a55" strokeWidth="1.6" strokeDasharray="3 2" transform="rotate(5 39 37)" />
    </Ph>
  ),
  vestuario: (
    <Ph title="Vestuario">
      <rect x="10" y="8" width="20" height="48" fill="#9aa4b5" stroke="#5a6478" />
      <rect x="34" y="8" width="20" height="48" fill="#8a94a5" stroke="#5a6478" />
      <path d="M14 16h12M38 16h12" stroke="#5a6478" strokeWidth="2" />
      <circle cx="27" cy="34" r="1.8" fill="#3a4454" />
      <circle cx="51" cy="34" r="1.8" fill="#3a4454" />
      <rect x="18" y="52" width="28" height="6" rx="2" fill="#c8a56a" />
    </Ph>
  ),
  fichajes: (
    <Ph title="Fichajes">
      <path d="M8 34c8-8 16-8 22-2l4 4" stroke="#d9a077" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M56 34c-8-8-16-8-22-2l-4 4" stroke="#c07f55" strokeWidth="7" strokeLinecap="round" fill="none" />
      <rect x="26" y="28" width="12" height="10" rx="3" fill="#e3af85" stroke="#a96a45" />
    </Ph>
  ),
  escudo: (
    <Ph title="Escudo del club">
      <path d="M32 4l24 8v22c0 14-10 22-24 28C18 56 8 48 8 34V12z" fill="#f1e8d5" stroke="#8a7a55" strokeWidth="2" />
      <path d="M26 6h12v52" fill="#1d2c4f" opacity="0.9" />
      <path d="M20 7h6v53" fill="#f0862e" opacity="0.9" />
      <circle cx="32" cy="30" r="9" fill="#c07033" stroke="#5a3a18" />
      <path d="M23 30h18M32 21v18" stroke="#5a3a18" strokeWidth="1.4" />
      <path d="M28 12l2 4 4-1-3 3 2 4-4-2-3 3 1-4-4-2 4-1z" fill="#f5c445" transform="translate(2 -6)" />
    </Ph>
  ),
  asado: (
    <Ph title="Asado del plantel">
      <rect x="10" y="34" width="44" height="10" rx="3" fill="#3a3a3a" stroke="#1a1a1a" />
      <path d="M16 44l-4 14M48 44l4 14M32 44v14" stroke="#1a1a1a" strokeWidth="3" />
      <path d="M14 34h36" stroke="#6a6a6a" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M24 30c-3-6 3-7 2-12 5 3 4 7 3 12zM36 30c-3-6 3-7 2-12 5 3 4 7 3 12z" fill="#f0862e" />
      <ellipse cx="26" cy="31" rx="5" ry="2.6" fill="#8a4a2a" />
      <ellipse cx="40" cy="31" rx="6" ry="2.8" fill="#a05a32" />
    </Ph>
  ),
};

function MqPhoto({ file, ph, className, avatar }: {
  file: string;
  /** Clave del placeholder SVG, o 'avatar' si se pasa avatar. */
  ph?: string;
  className?: string;
  avatar?: { seed: string; age: number; size: number };
}) {
  const [missing, setMissing] = useState(false);
  if (!missing) {
    return (
      <img
        className={`mq-photo ${className ?? ''}`}
        src={`${import.meta.env.BASE_URL}maqueta/${file}`}
        alt=""
        onError={() => setMissing(true)}
      />
    );
  }
  return (
    <span className={`mq-photo ${className ?? ''}`} title={`Asset pendiente: ${file}`}>
      {avatar ? <Avatar seed={avatar.seed} age={avatar.age} size={avatar.size} jersey="#1d2c4f" /> : PH_ICONS[ph ?? '']}
    </span>
  );
}

/* ---------- Piezas comunes ---------- */

function MqCard({ file, ph, label, sub, onClick }: {
  file: string; ph: string; label: string; sub?: string; onClick?: () => void;
}) {
  return (
    <button className="mq-card" onClick={onClick}>
      <MqPhoto file={file} ph={ph} />
      <span className="mq-card-label">
        {label}
        {sub && <span className="mq-card-sub">{sub}</span>}
      </span>
    </button>
  );
}

function MqHeader({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="mq-header">
      <span className="mq-header-ico">{icon}</span>
      {children}
    </div>
  );
}

function Bar({ label, value, kind }: { label: string; value: number; kind?: 'good' | 'bad' }) {
  return (
    <div className="mq-bar-row">
      <span>{label}</span>
      <span className={`mq-bar ${kind ?? ''}`}><i style={{ width: `${value}%` }} /></span>
      <b>{value}</b>
    </div>
  );
}

/* ---------- Pantallas ---------- */

function Inicio({ go, openFicha }: { go: (s: MqScreen) => void; openFicha: (p: MqPlayer) => void }) {
  return (
    <>
      <div className="mq-grid">
        <div>
          <div className="mq-group">
            <MqHeader icon="📋">La semana</MqHeader>
            <div className="mq-cards">
              <MqCard file="icono-lista.jpg" ph="lista" label="Pasar lista" sub="2 avisaron que no vienen" onClick={() => go('plantel')} />
              <MqCard file="icono-pizarra.jpg" ph="pizarra" label="Quinteto" onClick={() => go('partido')} />
              <MqCard file="icono-marcador.jpg" ph="marcador" label="Partido" onClick={() => go('partido')} />
              <MqCard file="evento-asado.jpg" ph="asado" label="Asado" sub="El Colo lo está armando" onClick={() => go('evento')} />
            </div>
          </div>
          <div className="mq-group">
            <MqHeader icon="🏆">La liga</MqHeader>
            <div className="mq-cards">
              <MqCard file="icono-tabla.jpg" ph="tabla" label="Tabla" sub="3° · a un juego del 2°" />
              <MqCard file="icono-calendario.jpg" ph="calendario" label="Calendario" />
              <MqCard file="icono-camiseta.jpg" ph="camiseta" label="Rivales" />
            </div>
          </div>
        </div>

        <div className="mq-hero">
          <MqPhoto file="escudo.png" ph="escudo" />
          <div className="mq-week">Semana 7 de 11</div>
          <div>
            <span className="mq-plaque">vs. Deportivo Sayago · lunes 20:30</span>
          </div>
          <div>
            <span className="mq-plaque dark">Caja $1.240</span>
          </div>
          <div className="mq-side">
            <button className="mq-advance" onClick={() => go('partido')}>» Avanzar semana</button>
            <button>Guardar</button>
            <button>Noticias</button>
          </div>
        </div>

        <div>
          <div className="mq-group">
            <MqHeader icon="👥">El plantel</MqHeader>
            <div className="mq-cards">
              <MqCard file="icono-lista.jpg" ph="lista" label="Plantilla" sub="12 fichas · 1 molesto" onClick={() => go('plantel')} />
              <MqCard file="icono-vestuario.jpg" ph="vestuario" label="Vestuario" sub="2 camarillas y un roce" onClick={() => go('evento')} />
              <MqCard file="icono-fichajes.jpg" ph="fichajes" label="Fichajes" />
            </div>
          </div>
          <div className="mq-group">
            <MqHeader icon="💰">La caja</MqHeader>
            <div className="mq-cards">
              <MqCard file="icono-cuotas.jpg" ph="cuotas" label="Cuotas" sub="3 deben este mes" />
              <MqCard file="icono-gastos.jpg" ph="gastos" label="Gastos" />
              <MqCard file="icono-rifa.jpg" ph="rifa" label="Rifa" />
            </div>
          </div>
        </div>
      </div>

      <div className="mq-strip-wrap">
        <MqHeader icon="🏀">El equipo</MqHeader>
        <div className="mq-strip">
          {PLANTEL.map((p) => (
            <button key={p.id} className="mq-player" onClick={() => openFicha(p)}>
              <MqPhoto file={`retrato-${p.dorsal}.jpg`} avatar={{ seed: p.id, age: p.edad, size: 68 }} />
              <span className="mq-dorsal">{p.dorsal}</span>
              <span className="mq-name">{apodo(p.nombre)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Plantel({ go, openFicha }: { go: (s: MqScreen) => void; openFicha: (p: MqPlayer) => void }) {
  return (
    <>
      <button className="mq-back" onClick={() => go('inicio')}>‹ Volver</button>
      <MqHeader icon="👥">Plantilla · 12 fichas</MqHeader>
      <div style={{ height: 8 }} />
      <div className="mq-roster">
        {PLANTEL.map((p) => (
          <button key={p.id} className="mq-card" onClick={() => openFicha(p)}>
            <MqPhoto file={`retrato-${p.dorsal}.jpg`} avatar={{ seed: p.id, age: p.edad, size: 72 }} />
            <span className="mq-card-label">
              {p.nombre}
              <span className="mq-card-sub">{p.rol} · {p.edad} años</span>
            </span>
            <span>
              {p.chips.map((c) => (
                <span key={c.label} className={`mq-chip ${c.warn ? 'warn' : ''}`}>{c.label}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function Ficha({ p, go }: { p: MqPlayer; go: (s: MqScreen) => void }) {
  return (
    <>
      <button className="mq-back" onClick={() => go('plantel')}>‹ Plantilla</button>
      <div className="mq-sheet">
        <div className="mq-ficha-top">
          <MqPhoto file={`retrato-${p.dorsal}.jpg`} avatar={{ seed: p.id, age: p.edad, size: 92 }} />
          <div>
            <h3>#{p.dorsal} {p.nombre}</h3>
            <div>
              <span className="mq-chip">{p.rol}</span>
              <span className="mq-chip">{p.edad} años</span>
              {p.chips.map((c) => (
                <span key={c.label} className={`mq-chip ${c.warn ? 'warn' : ''}`}>{c.label}</span>
              ))}
            </div>
          </div>
        </div>
        <Bar label="Técnica" value={p.tecnica} />
        <Bar label="Físico" value={p.fisico} kind={p.fisico < 45 ? 'bad' : undefined} />
        <Bar label="Moral" value={p.moral} kind={p.moral >= 65 ? 'good' : p.moral < 50 ? 'bad' : undefined} />
        <p className="mq-human">“{p.frase}”</p>
      </div>
      <div className="mq-sheet">
        <h3>Historia reciente</h3>
        <div className="mq-incident">Fecha 6 · 14 puntos vs. La Comercial — figura del equipo.</div>
        <div className="mq-incident">Fecha 5 · Se quedó al tercer tiempo: sumó con el grupo.</div>
        <div className="mq-incident">Pretemporada · Prometiste pelear el puesto de titular.</div>
      </div>
    </>
  );
}

function Evento({ go }: { go: (s: MqScreen) => void }) {
  const [elegido, setElegido] = useState<string | null>(null);
  return (
    <>
      <button className="mq-back" onClick={() => go('inicio')}>‹ Volver</button>
      <div className="mq-sheet">
        <div className="mq-ficha-top">
          <MqPhoto file="evento-asado.jpg" ph="asado" />
          <h3>El Colo quiere hacer un asado</h3>
        </div>
        <p style={{ fontSize: 13.5, margin: '4px 0 10px' }}>
          “Che, hace mucho que no juntamos al plantel. Este sábado en lo de mi vieja,
          ¿le damos para adelante? Ya tengo 8 confirmados.”
        </p>
        {!elegido && (
          <>
            <button className="mq-option" onClick={() => setElegido('si')}>
              <b>Dale, el club pone la carne</b>
              Cuesta $180 de la caja. El grupo lo va a valorar.
            </button>
            <button className="mq-option" onClick={() => setElegido('cada-uno')}>
              <b>Que cada uno traiga lo suyo</b>
              Gratis, pero alguno se va a borrar.
            </button>
            <button className="mq-option" onClick={() => setElegido('no')}>
              <b>Mejor después del partido del lunes</b>
              El Colo se lo toma a mal: era su idea.
            </button>
          </>
        )}
        {elegido && (
          <div className="mq-outcome">
            {elegido === 'si' && 'Asadazo: fueron 10 de 12. Seba y el Chino quedaron socios de parrilla — la química del quinteto lo va a notar el lunes.'}
            {elegido === 'cada-uno' && 'Asado bueno: fueron 8. Facu se borró a última hora (“ando corto”) y quedó marcado en el grupo.'}
            {elegido === 'no' && 'El Colo bajó la idea sin decir nada. El grupo de WhatsApp estuvo callado toda la semana.'}
          </div>
        )}
      </div>
    </>
  );
}

function Partido({ go }: { go: (s: MqScreen) => void }) {
  return (
    <>
      <button className="mq-back" onClick={() => go('inicio')}>‹ Volver</button>
      <div className="mq-score">
        <span>
          <span className="mq-pts">68</span>
          <span className="mq-team">Nuestro club</span>
        </span>
        <span className="mq-vs">FINAL</span>
        <span>
          <span className="mq-pts">62</span>
          <span className="mq-team">Dep. Sayago</span>
        </span>
      </div>
      <div className="mq-sheet">
        <h3>El relato</h3>
        <div className="mq-incident">4° cuarto · Íbamos 8 abajo y la remontamos con la segunda unidad.</div>
        <div className="mq-incident">Guille Souto (19 pts) fue una pared en la pintura.</div>
        <div className="mq-incident">Técnica a Lucho por discutir con Barreto — la segunda del año.</div>
        <div className="mq-incident">Nico entró 6 minutos y se fue sin saludar. Habrá que hablarlo.</div>
      </div>
      <div className="mq-sheet">
        <h3>El quinteto</h3>
        <div className="mq-strip">
          {PLANTEL.slice(0, 5).map((p) => (
            <span key={p.id} className="mq-player">
              <MqPhoto file={`retrato-${p.dorsal}.jpg`} avatar={{ seed: p.id, age: p.edad, size: 68 }} />
              <span className="mq-dorsal">{p.dorsal}</span>
              <span className="mq-name">{apodo(p.nombre)}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Raíz ---------- */

export function Maqueta() {
  const [screen, setScreen] = useState<MqScreen>('inicio');
  const [ficha, setFicha] = useState<MqPlayer>(PLANTEL[0]);
  const openFicha = (p: MqPlayer) => {
    setFicha(p);
    setScreen('ficha');
  };
  return (
    <div className="mq-root">
      <div className="mq-court-lines" />
      <div className="mq-content">
        <div className="mq-note">
          <span>
            🎨 Maqueta de dirección de arte — los dibujos son huecos para los assets
            generados (no es el juego real).
          </span>
          <button onClick={() => { window.location.hash = ''; window.location.reload(); }}>
            Volver al juego
          </button>
        </div>
        {screen === 'inicio' && <Inicio go={setScreen} openFicha={openFicha} />}
        {screen === 'plantel' && <Plantel go={setScreen} openFicha={openFicha} />}
        {screen === 'ficha' && <Ficha p={ficha} go={setScreen} />}
        {screen === 'evento' && <Evento go={setScreen} />}
        {screen === 'partido' && <Partido go={setScreen} />}
      </div>
    </div>
  );
}
