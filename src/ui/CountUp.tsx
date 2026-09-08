import { useEffect, useRef, useState } from 'react';

/** Quien pidió menos movimiento en el sistema operativo, no lo recibe. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Un número que sube (o baja) número a número hasta el valor nuevo, en vez de
 * saltar de golpe: es el marcador del partido, y es la primera de las cinco
 * animaciones de T5. Mientras cuenta lleva la clase `contando`, que en CSS
 * hace latir el número una vez. Con `prefers-reduced-motion` salta directo.
 */
export function CountUp({ value, duration = 600, className = '' }: { value: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const [counting, setCounting] = useState(false);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    setCounting(true);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setCounting(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`${className}${counting ? ' contando' : ''}`.trim()}>{shown}</span>;
}
