import { activePlayers, clubPosition } from './match';
import type { GameState } from './types';

export type Grade = 'Excelente' | 'Buena' | 'Regular' | 'Mala';

export interface SeasonDimension {
  key: string;
  label: string;
  score: number; // 0-100
  grade: Grade;
  detail: string;
}

export interface SeasonEvaluation {
  outcomeTitle: string;
  outcomeText: string;
  dimensions: SeasonDimension[];
  position: number;
  record: string;
  isGameOver: boolean;
}

function grade(score: number): Grade {
  if (score >= 75) return 'Excelente';
  if (score >= 55) return 'Buena';
  if (score >= 35) return 'Regular';
  return 'Mala';
}

export function computeSeasonEvaluation(state: GameState): SeasonEvaluation {
  const row = state.standings.find((r) => r.teamId === 'club')!;
  const played = row.wins + row.losses;
  const winPct = played > 0 ? row.wins / played : 0;
  const position = clubPosition(state);
  const active = activePlayers(state.players);

  const oroChamp = state.playoffs?.champions.oro === 'club';
  const plataChamp = state.playoffs?.champions.plata === 'club';
  const lostFinal = !!state.playoffs?.ties.some(
    (t) => t.round === 'final' && t.isUserMatch && t.winnerId !== undefined && t.winnerId !== 'club'
  );
  const cupBonus = oroChamp ? 18 : plataChamp ? 10 : lostFinal ? 5 : 0;
  const sportScore = Math.min(100, Math.round(winPct * 65 + ((10 - position) / 9) * 35) + cupBonus);
  const moneyRatio = state.club.money / Math.max(state.startingMoney, 1);
  const financeScore = state.club.money < 0 ? 0 : Math.round(Math.min(100, moneyRatio * 55 + (state.club.money > 0 ? 25 : 0)));
  const retentionScore = Math.max(0, 100 - state.playersLeftCount * 20);
  const memorableScore = Math.min(100, state.memorableMoments.length * 25);

  const dimensions: SeasonDimension[] = [
    {
      key: 'sport',
      label: 'Resultado deportivo',
      score: sportScore,
      grade: grade(sportScore),
      detail: `${row.wins} ${row.wins === 1 ? 'ganado' : 'ganados'}, ${row.losses} ${row.losses === 1 ? 'perdido' : 'perdidos'}. Posición final: ${position}° de 10.`,
    },
    {
      key: 'finance',
      label: 'Salud financiera',
      score: financeScore,
      grade: grade(financeScore),
      detail: `Caja final: $${state.club.money} (arrancaste con $${state.startingMoney}).`,
    },
    {
      key: 'retention',
      label: 'Retención de jugadores',
      score: retentionScore,
      grade: grade(retentionScore),
      detail:
        state.playersLeftCount === 0
          ? `Nadie abandonó el club. Plantel final: ${active.length} jugadores.`
          : state.playersLeftCount === 1
            ? `1 jugador se fue. Plantel final: ${active.length}.`
            : `${state.playersLeftCount} jugadores se fueron. Plantel final: ${active.length}.`,
    },
    {
      key: 'sportPrestige',
      label: 'Prestigio deportivo',
      score: state.club.sportPrestige,
      grade: grade(state.club.sportPrestige),
      detail: 'Cómo ve la liga al club como rival.',
    },
    {
      key: 'socialPrestige',
      label: 'Prestigio social',
      score: state.club.socialPrestige,
      grade: grade(state.club.socialPrestige),
      detail: 'Cuánta gente quiere pertenecer a este grupo.',
    },
    {
      key: 'memorable',
      label: 'Momentos memorables',
      score: memorableScore,
      grade: grade(memorableScore),
      detail:
        state.memorableMoments.length > 0
          ? `${state.memorableMoments.length} momento${state.memorableMoments.length > 1 ? 's' : ''} para el recuerdo.`
          : 'Una temporada sin grandes historias para contar.',
    },
  ];

  let outcomeTitle: string;
  let outcomeText: string;
  const isGameOver = state.phase === 'gameOver';

  if (isGameOver && state.club.money < 0) {
    outcomeTitle = 'Fracaso financiero';
    outcomeText = state.gameOverReason ?? 'El club quebró antes de terminar la temporada.';
  } else if (isGameOver) {
    outcomeTitle = 'Plantel desintegrado';
    outcomeText = state.gameOverReason ?? 'El club se quedó sin jugadores para competir.';
  } else if (oroChamp && state.club.socialClimate < 40) {
    outcomeTitle = 'Campeones… con el vestuario roto';
    outcomeText = 'Se llevaron la Copa de Oro, pero el grupo terminó quebrado. ¿Cuántos volverán el año que viene?';
  } else if (oroChamp) {
    outcomeTitle = '¡Campeones de la Copa de Oro!';
    outcomeText = 'Temporada soñada: el club se queda con la copa grande y el barrio habla de ustedes.';
  } else if (plataChamp) {
    outcomeTitle = 'Campeones de la Copa de Plata';
    outcomeText = 'No era la copa grande, pero es una vuelta olímpica igual. El grupo la festejó como corresponde.';
  } else if (lostFinal) {
    outcomeTitle = 'Subcampeones: la final se escapó';
    outcomeText = 'Llegar a la final ya fue un logro, pero la última pelota no quiso entrar. El año que viene es revancha.';
  } else if (position === 1) {
    outcomeTitle = 'Los mejores de la fase regular';
    outcomeText = 'Dominaron la temporada... hasta los playoffs. La tabla dice campeones morales; la copa dice otra cosa.';
  } else if (state.memorableMoments.length >= 3 && sportScore >= 45 && retentionScore >= 60) {
    outcomeTitle = 'Temporada inolvidable';
    outcomeText = 'Más allá de la tabla, esta temporada dejó historias que el grupo va a contar durante años.';
  } else if (retentionScore >= 80 && state.club.socialPrestige >= 60 && winPct < 0.45) {
    outcomeTitle = 'Gran grupo, poco roce deportivo';
    outcomeText = 'Deportivamente flojo, pero el grupo humano quedó fuerte y nadie se quiere ir. Hay base para crecer.';
  } else if (financeScore >= 60 && retentionScore >= 70) {
    outcomeTitle = 'Club ordenado y sostenible';
    outcomeText = 'Caja sana, plantel estable. No hubo gloria, pero el club está mejor que como lo encontraste.';
  } else if (position >= 8) {
    outcomeTitle = 'Mala campaña';
    outcomeText = 'Terminaron en el fondo de la tabla y quedaron cosas por resolver. A rearmar en el verano.';
  } else if (sportScore >= 50 && financeScore >= 40 && retentionScore >= 60) {
    outcomeTitle = 'Temporada equilibrada';
    outcomeText = 'Ni gloria ni desastre: el club compitió, sobrevivió y aprendió. Para un club amateur, eso ya es bastante.';
  } else {
    outcomeTitle = 'Temporada con más dudas que certezas';
    outcomeText = 'El club llegó al final, pero entre deudas, bajas o malos resultados quedó la sensación de que algo hay que cambiar.';
  }

  return {
    outcomeTitle,
    outcomeText,
    dimensions,
    position,
    record: `${row.wins}-${row.losses}`,
    isGameOver,
  };
}
