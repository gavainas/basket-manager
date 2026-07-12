import { createContext, useContext, type ReactNode } from 'react';

/** Abre el perfil de un jugador del mundo (rivales) desde cualquier vista. */
export const OpenWorldPlayerContext = createContext<(playerId: string) => void>(() => {});

export function WorldPlayerLink({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenWorldPlayerContext);
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
