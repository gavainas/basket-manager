import { createContext, useContext, type ReactNode } from 'react';

/** Abre la ficha de una liga desde cualquier vista. */
export const OpenLeagueContext = createContext<(leagueId: string) => void>(() => {});

export function LeagueLink({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenLeagueContext);
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
