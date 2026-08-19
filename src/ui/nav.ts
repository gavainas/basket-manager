import { createContext } from 'react';

export type AppTab =
  | 'resumen'
  | 'plantilla'
  | 'finanzas'
  | 'liga'
  | 'agenda'
  | 'rankings'
  | 'historia'
  | 'club'
  | 'semana';

/**
 * Ancla dentro de una vista. El inicio es un menú de tiles y cada tile promete
 * algo concreto ("Vestuario", "Cuotas"): sin ancla, tocarlo te deja arriba de
 * una pantalla larga y la promesa queda a mitad de camino. La vista marca la
 * card con `data-focus` y App la trae al centro al navegar.
 */
export type AppFocus =
  | 'vestuario'
  | 'cuerpo-tecnico'
  | 'cuotas'
  | 'gastos'
  | 'objetivos'
  | 'noticias'
  | 'grupo'
  | 'rivales';

/** Cambia de pantalla desde cualquier vista (App provee la implementación). */
export const NavigateTabContext = createContext<(tab: AppTab, focus?: AppFocus) => void>(() => {});
