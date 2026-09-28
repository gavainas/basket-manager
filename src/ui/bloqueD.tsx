import type { ReactNode } from 'react';
import type { GameState, Personality } from '../game/types';
import { clubByLegacyId } from '../game/world';
import { Busto } from './Busto';
import { Crest } from './Crest';
import './bloque-d.css';

/*
 * Piezas comunes del bloque «club y competición» de la UI V1 (Liga,
 * Calendario, Rankings, Finanzas, El club, Historia). Lo que se repite entre
 * esas pantallas y no está en `v1.css`: la planilla con su título de renglón,
 * la cara redonda de las listas y el escudo chico por id de equipo.
 */

/**
 * La cara de una persona en una lista densa: el mismo busto del Tablero,
 * recortado en un círculo. Rule 6 de la guía: en tablas densas, la cara chica.
 */
export function Cara({ id, personality, size = 30 }: { id: string; personality?: Personality; size?: number }) {
  return (
    <span className="bd-cara" style={{ width: size, height: size }} aria-hidden="true">
      <Busto seed={id} personality={personality} />
    </span>
  );
}

/**
 * Una planilla del bloque: el único panel de cada zona. `titulo` va en voz
 * display con la línea punteada abajo; `mano` lo escribe a mano y le pega la
 * cinta (una sola por pantalla: la protagonista).
 */
export function Planilla({
  titulo,
  nota,
  mano = false,
  className = '',
  focus,
  children,
}: {
  titulo: ReactNode;
  nota?: ReactNode;
  mano?: boolean;
  className?: string;
  focus?: string;
  children: ReactNode;
}) {
  return (
    <section className={`bd-plan v1-planilla${mano ? ' bd-plan-mano' : ''} ${className}`} data-focus={focus}>
      {mano && (
        <>
          <i className="v1-cinta a" />
          <i className="v1-cinta b" />
        </>
      )}
      {mano ? (
        <h3 className="v1-mano bd-mano">
          {titulo}
          {nota && <span>{nota}</span>}
        </h3>
      ) : (
        <h3 className="bd-tit">
          <span>{titulo}</span>
          {nota && <small>{nota}</small>}
        </h3>
      )}
      {children}
    </section>
  );
}

/** El escudo de un equipo de la liga por su id clásico ('club' es el nuestro). */
export function EscudoLegacy({ state, id, size = 20 }: { state: GameState; id: string; size?: number }) {
  const club = clubByLegacyId(state.world, id);
  if (!club) return <span className="bd-escudo-vacio" style={{ width: size, height: size }} />;
  return <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={size} />;
}

/** El escudo de un equipo del mundo (fixtures del calendario). */
export function EscudoEquipo({ state, teamId, size = 20 }: { state: GameState; teamId: string; size?: number }) {
  const team = state.world.teams.find((t) => t.id === teamId);
  const club = state.world.clubs.find((c) => c.id === team?.clubId);
  if (!club) return <span className="bd-escudo-vacio" style={{ width: size, height: size }} />;
  return <Crest seed={club.id} name={club.name} colors={club.colors} founded={club.founded} size={size} />;
}

/** «1 semana», «3 semanas»: sin «1 semanas» en ningún lado. */
export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}
