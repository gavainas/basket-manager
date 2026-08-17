import type { RivalStyle } from '../game/types';
import { rivalStyleInfo } from './helpers';
import { Icon } from './Icon';

/**
 * Chip del estilo de juego de un rival. Existía repetido en seis lugares con el
 * emoji pegado al label; ahora el ícono viene aparte y hereda el color del chip.
 */
export function StyleChip({ style }: { style: RivalStyle }) {
  const info = rivalStyleInfo(style);
  return (
    <span className="chip con-ico" title={info.desc}>
      <Icon name={info.icon} size={13} />
      {info.label}
    </span>
  );
}
