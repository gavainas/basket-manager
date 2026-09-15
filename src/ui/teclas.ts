// Los atajos de teclado de los modales. Es un juego de PC (el objetivo es
// Steam): la ficha que abriste con un click se tiene que cerrar con Escape,
// y el diálogo que pregunta se tiene que contestar con Enter, sin ir a buscar
// el botón con el mouse (design/DIAGNOSTICO_2026-09.md, "UX y navegación").
//
// Los modales se apilan (una ficha de jugador abierta desde un evento, una
// confirmación sobre una ficha): Escape cierra sólo el de más arriba, así que
// cada uno se anota en una pila al montarse y se borra al desmontarse, y el
// que escucha la tecla es el último anotado. Las callbacks van en refs para
// que un re-render del padre (que las recrea) no saque y vuelva a meter el
// modal en la pila —eso lo pondría arriba del que se abrió después.

import { useEffect, useRef } from 'react';

interface Teclas {
  /** Escape. */
  onClose?: () => void;
  /** Enter, salvo que el foco esté en un botón o un campo (ahí decide el navegador). */
  onConfirm?: () => void;
}

const pila: symbol[] = [];

/**
 * Escucha Escape (y opcionalmente Enter) mientras el componente está montado.
 * `activo` en falso no anota nada: sirve para los componentes que se montan
 * siempre y muestran el modal sólo a veces (`ConfirmDialog`).
 */
export function useTeclasModal(teclas: Teclas, activo = true) {
  const yo = useRef<symbol | null>(null);
  if (yo.current === null) yo.current = Symbol('modal');
  const ref = useRef(teclas);
  ref.current = teclas;

  useEffect(() => {
    if (!activo) return;
    const id = yo.current!;
    pila.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== id) return;
      const { onClose, onConfirm } = ref.current;
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter' && onConfirm) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tag)) return;
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = pila.lastIndexOf(id);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [activo]);
}
