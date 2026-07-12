import { createContext } from 'react';

export type AppTab = 'resumen' | 'plantilla' | 'finanzas' | 'liga' | 'rankings' | 'historia' | 'semana';

/** Cambia de pestaña desde cualquier vista (App provee la implementación). */
export const NavigateTabContext = createContext<(tab: AppTab) => void>(() => {});
