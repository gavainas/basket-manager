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

/** ¿El foco está en algo que ya usa el teclado? (ahí decide el navegador). */
function focoEnControl(): boolean {
  const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
  return ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tag);
}

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
        if (focoEnControl()) return;
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

/** ¿El foco está en un campo de texto o un desplegable? (ahí los números y las letras son suyos). */
function focoEnCampo(): boolean {
  const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag);
}

/**
 * ¿Hay una ficha, un diálogo o un evento abierto? Los que pasan por
 * `useTeclasModal` están en la pila; el modal de los eventos de la semana no
 * (no se cierra con Escape: hay que contestarlo), así que se mira también el
 * DOM. Mientras haya uno abierto, el teclado es de él.
 */
function hayModal(): boolean {
  return pila.length > 0 || document.querySelector('.modal-backdrop') !== null;
}

/**
 * Las teclas de navegación del marco (sep 2026, del diagnóstico: "es un juego
 * de PC: atajos para las secciones y Esc para volver al tablero"): los números
 * 1 a 7 llevan a cada sección de la barra de arriba y Escape vuelve al
 * Tablero. Con una ficha, un diálogo o un evento abierto no hacen nada (Escape
 * ahí cierra la ficha, y lo maneja `useTeclasModal`); con el foco en un campo
 * o un desplegable tampoco (los números son del campo). Ctrl, Alt y Cmd
 * quedan para el navegador.
 */
export function useTeclasSecciones(teclas: { onSeccion: (numero: number) => void; onEscape: () => void }) {
  const ref = useRef(teclas);
  ref.current = teclas;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      if (hayModal() || focoEnCampo()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        ref.current.onEscape();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        ref.current.onSeccion(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * La barra espaciadora de una pantalla: la acción que el pie ya muestra como
 * botón principal, al alcance de una tecla. Es un juego de PC y el partido se
 * juega cuarto a cuarto: tener que ir al mouse entre cuarto y cuarto rompe el
 * ritmo (design/DIAGNOSTICO_2026-09.md, "UX y navegación").
 *
 * No hace nada si hay una ficha o un diálogo abierto (ese se lleva el teclado)
 * ni si el foco está en un botón —ahí Espacio ya activa ese botón y pisarlo
 * sería activar dos cosas con una tecla—. `accion` en null la apaga: sirve
 * para los momentos en que la pantalla no acepta la acción (una incidencia
 * sin resolver, el reloj esperando el tramo).
 */
export function useEspacio(accion: (() => void) | null) {
  const ref = useRef(accion);
  ref.current = accion;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.repeat || pila.length > 0 || focoEnControl()) return;
      const fn = ref.current;
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
