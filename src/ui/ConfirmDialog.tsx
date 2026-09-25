// Confirmación propia en reemplazo de window.confirm: los confirm() nativos
// colgaban el panel en algunos navegadores y en el celular son fáciles de
// tocar mal (ver design/INFORME_TESTING_GD.md, apéndice técnico).

import { useEffect, useRef } from 'react';
import { Icon, type IconName } from './Icon';
import { useTeclasModal } from './teclas';

export interface ConfirmRequest {
  title: string;
  message: string;
  /** Etiqueta del botón que confirma (dice la acción, no "OK"). */
  confirmLabel: string;
  /** Acción destructiva: el botón de confirmar se pinta en rojo. */
  danger?: boolean;
  icon?: IconName;
  onConfirm: () => void;
}

interface Props {
  req: ConfirmRequest | null;
  onClose: () => void;
}

export function ConfirmDialog({ req, onClose }: Props) {
  // Escape cancela. Enter confirma sólo lo que no destruye nada: una partida
  // guardada no se pisa ni se borra con una tecla apretada de más.
  const confirmar = () => {
    if (!req) return;
    onClose();
    req.onConfirm();
  };
  useTeclasModal({ onClose, onConfirm: req && !req.danger ? confirmar : undefined }, !!req);
  // El foco entra al diálogo al abrirse: si se quedara en el botón que lo
  // abrió (Salir), Enter volvería a apretar ese botón en vez de contestar.
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (req) caja.current?.focus();
  }, [req]);
  if (!req) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={caja} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="event-head">
          <div className="event-icon">
            <Icon name={req.icon ?? 'alerta'} size={30} />
          </div>
          <h2>{req.title}</h2>
        </div>
        <p className="event-text">{req.message}</p>
        <div className="options">
          <button className={req.danger ? 'danger' : 'primary'} onClick={confirmar}>
            {req.confirmLabel}
          </button>
          <button className="ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
