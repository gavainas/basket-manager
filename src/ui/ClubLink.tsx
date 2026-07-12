import { createContext, useContext, type ReactNode } from 'react';

/** Abre la ficha institucional de un club (propio o rival). */
export const OpenClubContext = createContext<(clubId: string) => void>(() => {});

export function ClubLink({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenClubContext);
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
