// Confirmación propia en reemplazo de window.confirm: los confirm() nativos
// colgaban el panel en algunos navegadores y en el celular son fáciles de
// tocar mal (ver design/INFORME_TESTING_GD.md, apéndice técnico).

export interface ConfirmRequest {
  title: string;
  message: string;
  /** Etiqueta del botón que confirma (dice la acción, no "OK"). */
  confirmLabel: string;
  /** Acción destructiva: el botón de confirmar se pinta en rojo. */
  danger?: boolean;
  icon?: string;
  onConfirm: () => void;
}

interface Props {
  req: ConfirmRequest | null;
  onClose: () => void;
}

export function ConfirmDialog({ req, onClose }: Props) {
  if (!req) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-head">
          <div className="event-icon">{req.icon ?? '❓'}</div>
          <h2>{req.title}</h2>
        </div>
        <p className="event-text">{req.message}</p>
        <div className="options">
          <button
            className={req.danger ? 'danger' : 'primary'}
            onClick={() => {
              onClose();
              req.onConfirm();
            }}
          >
            {req.confirmLabel}
          </button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
