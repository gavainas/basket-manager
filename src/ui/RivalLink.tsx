import { createContext, useContext, type ReactNode } from 'react';

/** Abre la ficha de un club rival desde cualquier parte de la UI. */
export const OpenRivalContext = createContext<(rivalId: string) => void>(() => {});

/** Nombre de club rival clickeable: abre su ficha. */
export function RivalLink({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenRivalContext);
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
