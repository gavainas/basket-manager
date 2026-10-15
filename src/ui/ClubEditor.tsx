import { useState } from 'react';
import { CREST_VARIANTS } from '../game/crest';
import {
  DEFAULT_IDENTITY,
  IDENTITY_LIMITS,
  IDENTITY_PRESETS,
  crestDesignOf,
  hasErrors,
  normalizeIdentity,
  validateIdentity,
  type ClubIdentity,
  type KitDesign,
} from '../game/identity';
import { clubInitials } from '../game/crest';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { IdentityTheme } from './IdentityTheme';
import { Kit, KIT_LABELS } from './Kit';

/**
 * Fundar el club: el paso previo a la primera semana.
 *
 * Es la primera decisión de la partida y tiene que poder saltearse rápido —
 * viene con un club completo cargado y el botón de empezar habilitado desde el
 * segundo cero—, pero también aguantar que alguien se quede diez minutos
 * eligiendo el color del vivo.
 *
 * Todo lo que se edita se ve al lado, en vivo: escudo, camiseta y una muestra
 * del encabezado del juego. No hay carga de imágenes: el escudo se arma con las
 * piezas del generador que ya usa el resto del juego (game/crest.ts).
 */

/** Colores de club, no de paleta de diseño: los que se ven en una liga de barrio. */
const COLORES: { hex: string; label: string }[] = [
  { hex: '#1d1f24', label: 'Negro' },
  { hex: '#2d5c8a', label: 'Azul' },
  { hex: '#2a4f9b', label: 'Azul francia' },
  { hex: '#1f6b4a', label: 'Verde' },
  { hex: '#8d2b2b', label: 'Bordó' },
  { hex: '#c0392b', label: 'Rojo' },
  { hex: '#e07a2a', label: 'Naranja' },
  { hex: '#f2c230', label: 'Amarillo' },
  { hex: '#5b2a86', label: 'Violeta' },
  { hex: '#2b7f86', label: 'Petróleo' },
  { hex: '#b06a9a', label: 'Rosa viejo' },
  { hex: '#8a6a3d', label: 'Marrón' },
  { hex: '#9aa0a6', label: 'Gris' },
  { hex: '#f4f1ea', label: 'Blanco' },
];

const FORMAS = ['Español', 'Con punta', 'Círculo', 'Rombo', 'Banderín'];
const PARTICIONES = ['Plena', 'Palo', 'Faja', 'Cuartelado', 'Banda', 'Chevrón'];
const FIGURAS = ['Sin figura', 'Pelota', 'Estrella', 'Aro', 'Laurel'];
const ESTRELLAS = [0, 1, 3];

function Campo({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="ce-campo">
      <span className="ce-label">{label}</span>
      {children}
      {error ? <span className="ce-error">{error}</span> : hint ? <span className="ce-hint">{hint}</span> : null}
    </label>
  );
}

function Swatches({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (hex: string) => void;
  id: string;
}) {
  return (
    <div className="ce-colores">
      <div className="ce-swatches">
        {COLORES.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`ce-swatch${value.toLowerCase() === c.hex.toLowerCase() ? ' on' : ''}`}
            style={{ background: c.hex }}
            title={c.label}
            aria-label={c.label}
            aria-pressed={value.toLowerCase() === c.hex.toLowerCase()}
            onClick={() => onChange(c.hex)}
          />
        ))}
      </div>
      <div className="ce-color-libre">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="ce-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function Segmentado<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => React.ReactNode;
}) {
  return (
    <div className="ce-segmentado">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          className={o === value ? 'on' : ''}
          aria-pressed={o === value}
          onClick={() => onChange(o)}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

export function ClubEditor({
  modeLabel,
  difficultyLabel,
  onConfirm,
  onCancel,
}: {
  /** Qué partida se está por empezar, para que el manager sepa dónde está parado. */
  modeLabel: string;
  difficultyLabel: string;
  onConfirm: (identity: ClubIdentity) => void;
  onCancel: () => void;
}) {
  const [identity, setIdentity] = useState<ClubIdentity>(DEFAULT_IDENTITY);
  // Mientras el manager no toque las iniciales, salen solas del nombre. En
  // cuanto las edita, mandan ellas: es su club.
  const [inicialesManuales, setInicialesManuales] = useState(false);
  const [intento, setIntento] = useState(false);

  const errores = validateIdentity(identity);
  const mostrar = (k: keyof typeof errores) => (intento ? errores[k] : undefined);

  const set = (cambio: Partial<ClubIdentity>) => setIdentity((prev) => ({ ...prev, ...cambio }));
  const setColor = (cual: 'primary' | 'secondary', hex: string) =>
    setIdentity((prev) => ({ ...prev, colors: { ...prev.colors, [cual]: hex } }));
  const setCrest = (cambio: Partial<ClubIdentity['crest']>) =>
    setIdentity((prev) => ({ ...prev, crest: { ...prev.crest, ...cambio } }));

  const cambiarNombre = (name: string) => {
    setIdentity((prev) => ({
      ...prev,
      name,
      initials: inicialesManuales ? prev.initials : clubInitials(name || DEFAULT_IDENTITY.name),
    }));
  };

  const aplicarPreset = (p: ClubIdentity) => {
    setIdentity(p);
    setInicialesManuales(true);
  };

  const confirmar = () => {
    setIntento(true);
    const limpia = normalizeIdentity(identity);
    if (hasErrors(validateIdentity(limpia))) return;
    onConfirm(limpia);
  };

  const lugar = [identity.neighborhood, identity.city].filter(Boolean).join(' · ');

  return (
    <div className="editor-screen">
      <div className="editor-top">
        <div>
          <h1>Fundá tu club</h1>
          <p className="editor-sub">
            {modeLabel} · Faltas y lesiones: {difficultyLabel}. Todo esto se puede dejar como está y empezar ya.
          </p>
        </div>
        <button className="ce-volver" onClick={onCancel}>
          <Icon name="salir" size={16} /> Volver al menú
        </button>
      </div>

      <div className="editor-grid">
        {/* ---------- Formulario ---------- */}
        <div className="card editor-form">
          <h3>
            <Icon name="inscripcion" size={17} /> La ficha del club
          </h3>

          <div className="ce-presets">
            <span className="ce-label">Arrancar desde…</span>
            <div className="ce-preset-row">
              {IDENTITY_PRESETS.map((p) => (
                <button key={p.label} type="button" className="ce-preset" onClick={() => aplicarPreset(p.identity)}>
                  <Crest
                    seed="preset"
                    name={p.identity.name}
                    colors={[p.identity.colors.primary, p.identity.colors.secondary]}
                    design={crestDesignOf(p.identity)}
                    size={26}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Campo label="Nombre del club" error={mostrar('name')} hint={`Hasta ${IDENTITY_LIMITS.name.max} caracteres.`}>
            <input
              type="text"
              value={identity.name}
              maxLength={IDENTITY_LIMITS.name.max}
              onChange={(e) => cambiarNombre(e.target.value)}
            />
          </Campo>

          <div className="ce-fila">
            <Campo label="Nombre corto" error={mostrar('shortName')} hint="El que entra en las tablas.">
              <input
                type="text"
                value={identity.shortName}
                maxLength={IDENTITY_LIMITS.shortName.max}
                onChange={(e) => set({ shortName: e.target.value })}
              />
            </Campo>
            <Campo label="Iniciales" error={mostrar('initials')} hint="1 a 3 letras, van en el escudo.">
              <input
                type="text"
                className="ce-iniciales"
                value={identity.initials}
                maxLength={IDENTITY_LIMITS.initials.max}
                onChange={(e) => {
                  setInicialesManuales(true);
                  set({ initials: e.target.value.toUpperCase() });
                }}
              />
            </Campo>
          </div>

          <div className="ce-fila">
            <Campo label="Barrio">
              <input
                type="text"
                value={identity.neighborhood}
                maxLength={IDENTITY_LIMITS.neighborhood.max}
                onChange={(e) => set({ neighborhood: e.target.value })}
              />
            </Campo>
            <Campo label="Ciudad">
              <input
                type="text"
                value={identity.city}
                maxLength={IDENTITY_LIMITS.city.max}
                onChange={(e) => set({ city: e.target.value })}
              />
            </Campo>
          </div>

          <Campo label="Nombre de la cancha" error={mostrar('venueName')} hint="Dónde juega de local.">
            <input
              type="text"
              value={identity.venueName}
              maxLength={IDENTITY_LIMITS.venueName.max}
              onChange={(e) => set({ venueName: e.target.value })}
            />
          </Campo>

          <Campo label="Color principal">
            <Swatches id="ce-primario" value={identity.colors.primary} onChange={(h) => setColor('primary', h)} />
          </Campo>

          <Campo label="Color secundario" error={mostrar('colors')}>
            <Swatches id="ce-secundario" value={identity.colors.secondary} onChange={(h) => setColor('secondary', h)} />
          </Campo>

          <Campo label="Camiseta">
            <Segmentado
              options={['lisa', 'franjas', 'banda'] as KitDesign[]}
              value={identity.kit}
              onChange={(kit) => set({ kit })}
              render={(k) => KIT_LABELS[k]}
            />
          </Campo>

          <h3 className="ce-sub">
            <Icon name="liga" size={17} /> El escudo
          </h3>

          <Campo label="Forma">
            <Segmentado
              options={Array.from({ length: CREST_VARIANTS.shape }, (_, i) => i)}
              value={identity.crest.shape}
              onChange={(shape) => setCrest({ shape })}
              render={(i) => FORMAS[i]}
            />
          </Campo>

          <Campo label="Partición">
            <Segmentado
              options={Array.from({ length: CREST_VARIANTS.partition }, (_, i) => i)}
              value={identity.crest.partition}
              onChange={(partition) => setCrest({ partition })}
              render={(i) => PARTICIONES[i]}
            />
          </Campo>

          <Campo label="Símbolo">
            <Segmentado
              options={Array.from({ length: CREST_VARIANTS.charge }, (_, i) => i)}
              value={identity.crest.charge}
              onChange={(charge) => setCrest({ charge })}
              render={(i) => FIGURAS[i]}
            />
          </Campo>

          <Campo label="Estrellas" hint="Las que se bordan cuando hay algo para contar.">
            <Segmentado
              options={ESTRELLAS}
              value={identity.crest.stars}
              onChange={(stars) => setCrest({ stars })}
              render={(n) => (n === 0 ? 'Ninguna' : n === 1 ? '★' : '★★★')}
            />
          </Campo>
        </div>

        {/* ---------- Vista previa ---------- */}
        <IdentityTheme identity={identity} className="editor-preview">
          <div className="card">
            <h3>
              <Icon name="destacado" size={17} /> Así te va a ver la liga
            </h3>

            <div className="ce-preview-piezas">
              <div className="ce-pieza">
                <Crest
                  seed="preview"
                  name={identity.name || DEFAULT_IDENTITY.name}
                  colors={[identity.colors.primary, identity.colors.secondary]}
                  design={crestDesignOf(identity)}
                  size={140}
                />
                <span className="ce-pieza-label">Escudo</span>
              </div>
              <div className="ce-pieza">
                <Kit identity={identity} size={150} number={9} />
                <span className="ce-pieza-label">Camiseta · {KIT_LABELS[identity.kit]}</span>
              </div>
            </div>

            {/* Muestra del encabezado real del juego: la misma estructura que
                el shell, para que se vea cómo queda el club puesto. */}
            <div className="ce-muestra">
              <div className="ce-muestra-label">El encabezado del juego</div>
              <div className="ce-topbar">
                <div className="ce-marca">
                  <Crest
                    seed="preview"
                    name={identity.name || DEFAULT_IDENTITY.name}
                    colors={[identity.colors.primary, identity.colors.secondary]}
                    design={crestDesignOf(identity)}
                    size={34}
                  />
                  <div>
                    <div className="ce-club">{identity.name || DEFAULT_IDENTITY.name}</div>
                    <div className="ce-lugar">{lugar || 'Temporada 1'}</div>
                  </div>
                </div>
                <div className="ce-pantalla">
                  <Icon name="plantel" size={16} /> Plantilla
                </div>
              </div>

              <div className="ce-muestra-tira">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="ce-jugador">
                    <span className="ce-retrato" />
                    <span className="ce-jug-nombre">Jugador {n}</span>
                  </div>
                ))}
              </div>

              <div className="ce-muestra-chips">
                <span className="chip club">Local en {identity.venueName || 'la cancha'}</span>
                <span className="chip good">Al día</span>
                <span className="chip warn">Fundido</span>
                <span className="chip bad">Lesionado</span>
              </div>
              <p className="ce-nota muted">
                Los colores de aviso (verde, amarillo, rojo) no cambian con el club: una lesión se tiene que leer igual
                en todos los clubes.
              </p>
            </div>

            <button className="primary ce-empezar" onClick={confirmar}>
              Fundar el club y empezar
            </button>
            {intento && hasErrors(errores) && (
              <p className="ce-error" role="alert">
                Revisá los campos marcados y volvé a intentar.
              </p>
            )}
          </div>
        </IdentityTheme>
      </div>
    </div>
  );
}
