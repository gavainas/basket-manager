import { createContext, useContext, type ReactNode } from 'react';

/**
 * Abre la ficha de un jugador desde cualquier parte de la UI.
 * App provee la implementación; cualquier vista puede usar <PlayerLink>.
 */
export const OpenProfileContext = createContext<(playerId: string) => void>(() => {});

/** Nombre de jugador clickeable: abre su ficha completa. */
export function PlayerLink({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenProfileContext);
  return (
    <span
      className="plink"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        open(id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          open(id);
        }
      }}
    >
      {children}
    </span>
  );
}
