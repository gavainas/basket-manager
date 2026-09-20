// La semana del club: cinco etapas que comparten la anatomía de pantalla (los
// cinco pasos arriba, el panel de la etapa abajo). Desde sep 2026 (punto 3 del
// roadmap) cada etapa vive en su archivo bajo `semana/` y acá sólo se elige
// cuál mostrar:
//
//   1 · La semana     → semana/LaSemana.tsx     (PlanningPanel)
//   2 · Convocatoria  → semana/Convocatoria.tsx (CallUpPanel)
//   3 · Quinteto      → semana/Quinteto.tsx     (LineupPanel)
//   4 · Partido       → PartidoVivo.tsx
//   5 · Informe       → semana/Informe.tsx      (MatchResultPanel)
//
// Lo que comparten (los pasos, la tira de días, los helpers chicos) está en
// `semana/comun.tsx`.

import { PartidoVivo } from './PartidoVivo';
import { Steps, type Props } from './semana/comun';
import { PlanningPanel } from './semana/LaSemana';
import { CallUpPanel } from './semana/Convocatoria';
import { LineupPanel } from './semana/Quinteto';
import { MatchResultPanel } from './semana/Informe';

export function WeekView({ state, dispatch }: Props) {
  /* Desde sep 2026 ninguna etapa mide la ventana: cada una crece lo que su
     contenido pide y la scrollea `.app-shell`, con el pie de acción pegado
     abajo (design/PLAN_MARCO_FIJO.md, "La regla cambió"). */
  const fija =
    state.phase === 'planning' ||
    state.phase === 'callUp' ||
    state.phase === 'lineup' ||
    state.phase === 'match' ||
    state.phase === 'matchResult';

  return (
    <div className={fija ? 'semana-vista pantalla' : undefined}>
      <Steps phase={state.phase} />
      {state.phase === 'planning' && <PlanningPanel state={state} dispatch={dispatch} />}
      {state.phase === 'callUp' && <CallUpPanel state={state} dispatch={dispatch} />}
      {state.phase === 'lineup' && <LineupPanel state={state} dispatch={dispatch} />}
      {state.phase === 'match' && <PartidoVivo state={state} dispatch={dispatch} />}
      {state.phase === 'matchResult' && <MatchResultPanel state={state} dispatch={dispatch} />}
    </div>
  );
}
