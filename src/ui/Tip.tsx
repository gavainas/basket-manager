import type { ReactNode } from 'react';

/** Envuelve un valor con una explicación al pasar el mouse (y title como respaldo táctil). */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="tip" data-tip={text} title={text}>
      {children}
    </span>
  );
}

/** Explicaciones de los valores del juego: no asumimos que el jugador ya sabe. */
export const TIPS = {
  valoracion:
    'Estimación del cuerpo técnico sobre la calidad del jugador. El valor real solo se ve en la cancha.',
  fisico: 'Estado físico: baja con los minutos jugados y se recupera descansando durante la semana.',
  motivacion:
    'Ganas de jugar por el club. Baja con derrotas, banco y problemas; sube con victorias, charlas y buen ambiente.',
  compromiso:
    'Qué tan confiable es fuera de la cancha: con poco compromiso falta a entrenamientos y falla en la convocatoria.',
  afinidadSocial: 'Qué tan integrado está al grupo: suma a la química del equipo.',
  moralGeneral: 'Promedio de motivación de todo el plantel.',
  ambienteSocial: 'El clima del vestuario y del club: potencia la química del quinteto en la cancha.',
  organizacion: 'Qué tan ordenado está el club: mejora el rendimiento y evita papelones.',
  prestigioDeportivo: 'Cómo te ven en la liga: pesa en los objetivos de la comisión y atrae jugadores.',
  prestigioSocial: 'Cómo te ve el barrio: pesa en rifas, sponsors y en sumar gente al club.',
  piernas:
    'Frescura durante el partido: cae con los minutos y la marca hombre; se recupera en el banco y el entretiempo.',
  pesoVestuario:
    'Influencia en el grupo: la construyen el cariño de los compañeros, la antigüedad y los partidazos.',
  afinidadDt: 'La relación del jugador con vos: la definen los minutos, el rol que le das y las charlas.',
  banco: 'Los suplentes citados: durante el partido entran con cambios entre cuartos.',
  titulares: 'Los cinco que arrancan el partido. Conviene cubrir las cinco posiciones naturales.',
} as const;
