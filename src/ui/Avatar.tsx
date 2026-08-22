import type { Appearance } from '../game/appearance';
import { appearanceFromSeed } from '../game/appearance';
import type { Personality } from '../game/types';

// La foto del jugador (decisión de dirección, ago 2026): con `personality`,
// el componente muestra el RETRATO ILUSTRADO por arquetipo — esa es la foto
// oficial del juego. El SVG procedural de abajo era el placeholder y queda
// como generador de respaldo (galería #retratos y cualquier cara sin
// personalidad conocida). Con ocho retratos para planteles enteros hay
// repetidos: la variante (espejo + tono del fondo), estable por seed, los
// separa hasta que exista el set grande por seed (Puerta 3 de ART_PIPELINE).

const ARCHIVO: Record<Personality, string> = {
  veterano: 'p-veterano.webp',
  talentoso_informal: 'p-talentoso.webp',
  social: 'p-social.webp',
  cumplidor: 'p-cumplidor.webp',
  competitivo: 'p-competitivo.webp',
  protagonista: 'p-protagonista.webp',
  leal: 'p-leal.webp',
  mercenario: 'p-mercenario.webp',
};

/** Variante estable por persona: la misma seed muestra siempre la misma cara. */
function varianteFor(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 3;
}

// Retrato SVG por capas (ver design/AVATAR_SYSTEM.md). Plano, cálido y legible
// en chico; mismo encuadre (cabeza y hombros, de frente) para todos.

const SKIN_TONES = [
  '#f6d7bd', '#f0c9a8', '#eabd96', '#e3af85', '#d9a077', '#cf9066',
  '#c07f55', '#a96a45', '#93583a', '#7c4830', '#653a27', '#50301f',
];

const HAIR_COLORS = [
  '#241f1a', // negro
  '#3c2a1c', // castaño oscuro
  '#5d4126', // castaño
  '#7d5a33', // castaño claro
  '#a8894f', // rubio
  '#8c4a2a', // colorado
  '#8f9298', // gris (canas)
  '#d8dbdf', // blanco
];

/** w: media cara a la altura de los pómulos · jw: media mandíbula · chin: y del mentón · top: y del cráneo. */
const FACES = [
  { w: 17, jw: 10, chin: 60, top: 22 },     // ovalado
  { w: 19, jw: 13, chin: 58, top: 24 },     // redondo
  { w: 15.5, jw: 9.5, chin: 63, top: 21 },  // alargado
  { w: 18, jw: 14.5, chin: 60, top: 23 },   // cuadrado
  { w: 15, jw: 8, chin: 61, top: 23 },      // fino
  { w: 20.5, jw: 15.5, chin: 59, top: 24 }, // robusto
  { w: 17.5, jw: 9, chin: 62, top: 22 },    // anguloso
  { w: 19.5, jw: 15, chin: 61, top: 25 },   // cachetón
];

const EAR_SIZES = [2.2, 2.9, 3.6];

/** Oscurece/aclara un color hex multiplicando sus canales. */
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface Props {
  /** Seed persistente (el id del jugador): misma seed, misma cara siempre. */
  seed: string;
  age?: number;
  size?: number;
  /** Color de camiseta; por defecto el azul de cancha (el naranja está reservado
   *  para la acción: doce camisetas naranjas se lo comen). */
  jersey?: string;
  /** Apariencia ya calculada/guardada; si falta se deriva de la seed. */
  appearance?: Appearance;
  /** Pisa la expresión base: 0 neutro · 1 sonrisa · 2 malhumorado · 3 cansado · 4 confiado.
   *  (Solo aplica al SVG de respaldo: el retrato ilustrado es la foto fija.) */
  expressionOverride?: number;
  /** Gorra (solo para contextos sociales; solo el SVG de respaldo). */
  cap?: boolean;
  title?: string;
  /** Con personalidad, la foto es el retrato ilustrado por arquetipo. */
  personality?: Personality;
}

export function Avatar({ seed, age, size = 42, jersey = 'var(--sec-partidos)', appearance, expressionOverride, cap, title, personality }: Props) {
  if (personality) {
    return (
      <img
        className={`retrato-img v${varianteFor(seed)}`}
        src={`${import.meta.env.BASE_URL}arte/${ARCHIVO[personality]}`}
        width={size}
        height={size}
        alt=""
        title={title}
        loading="lazy"
      />
    );
  }
  const base = appearance ?? appearanceFromSeed(seed, age);
  const a = expressionOverride == null ? base : { ...base, expression: expressionOverride };
  const f = FACES[a.faceShape % FACES.length];
  const skin = SKIN_TONES[a.skinTone % SKIN_TONES.length];
  const skinDark = shade(skin, 0.72);
  const hairC = HAIR_COLORS[a.hairColor % HAIR_COLORS.length];
  const beardC = shade(hairC, 0.92);
  const eyeC = '#262a35';
  const mouthC = shade(skin, 0.55);
  const dx = f.w * 0.42; // separación de ojos/cejas según ancho de cara
  const mouthY = f.chin - 7;

  // ---- Cara ----
  const facePath = `M ${50 - f.w} 38
    Q ${50 - f.w} ${f.top} 50 ${f.top}
    Q ${50 + f.w} ${f.top} ${50 + f.w} 38
    Q ${50 + f.w} ${f.chin - 8} ${50 + f.jw} ${f.chin - 2}
    Q ${50 + f.jw * 0.5} ${f.chin + 4} 50 ${f.chin + 4}
    Q ${50 - f.jw * 0.5} ${f.chin + 4} ${50 - f.jw} ${f.chin - 2}
    Q ${50 - f.w} ${f.chin - 8} ${50 - f.w} 38 Z`;

  // ---- Pelo: casco base parametrizado por estilo, modificado por calvicie ----
  const hair: { d: string; opacity?: number }[] = [];
  const hairCapPath = (v: number, ff: number, fs: number) => `M ${50 - f.w - v} 42
    Q ${50 - f.w - v} ${f.top - v} 50 ${f.top - v}
    Q ${50 + f.w + v} ${f.top - v} ${50 + f.w + v} 42
    L ${50 + f.w - 0.5} 42
    Q ${50 + f.w - 0.5} ${fs} ${50 + f.w * 0.5} ${fs}
    Q ${50 + f.w * 0.28} ${ff} 50 ${ff}
    Q ${50 - f.w * 0.28} ${ff} ${50 - f.w * 0.5} ${fs}
    Q ${50 - f.w + 0.5} ${fs} ${50 - f.w + 0.5} 42 Z`;
  const sidePatches = (opacity: number, topY: number) => {
    hair.push(
      { d: `M ${50 - f.w - 1.5} 42 Q ${50 - f.w - 1.5} ${topY} ${50 - f.w + 3.5} ${topY - 0.5} L ${50 - f.w + 4} 42 Z`, opacity },
      { d: `M ${50 + f.w + 1.5} 42 Q ${50 + f.w + 1.5} ${topY} ${50 + f.w - 3.5} ${topY - 0.5} L ${50 + f.w - 4} 42 Z`, opacity },
    );
  };
  let extraHair: React.ReactNode = null;
  if (cap) {
    // Con gorra el pelo solo asoma por los costados, cualquiera sea el peinado.
    if (a.baldness < 3) sidePatches(1, 34.5);
  } else if (a.baldness === 3) {
    sidePatches(0.3, 37); // sombra de pelo al costado, casi pelado
  } else if (a.baldness === 2) {
    sidePatches(1, 32.5); // coronilla: solo los costados
  } else {
    const recede = a.baldness === 1 ? 4.5 : 0; // entradas: las sienes suben
    const styles: [number, number, number, number?][] = [
      [0, 31, 33, 0.5],  // rapado
      [1, 30, 33],       // corto clásico
      [3, 28.5, 33.5],   // tupido
      [1.5, 34, 31],     // flequillo
      [2.5, 30, 33.5],   // rulos
      [2, 33.5, 33.5],   // casquete
      [1.5, 30, 32.5],   // despeinado
      [1.2, 31, 32],     // prolijo
      [2, 31, 33],       // media melena
      [1.5, 29, 33.5],   // raya al medio
      [1.5, 30.5, 33],   // erizo
      [5, 29.5, 34],     // afro
    ];
    const [v, ff, fs, op] = styles[a.hair % styles.length];
    hair.push({ d: hairCapPath(v, ff, fs - recede), opacity: op });
    if (a.hair === 4) {
      // rulos: bultos sobre el casco
      extraHair = (
        <g fill={hairC}>
          {[-13, -6, 1, 8].map((x) => (
            <circle key={x} cx={50 + x + 2.5} cy={f.top - 1} r={3.4} />
          ))}
        </g>
      );
    }
    if (a.hair === 6) {
      // despeinado: mechones parados
      extraHair = (
        <g fill={hairC}>
          <path d={`M 41 ${f.top - 0.5} L 44 ${f.top - 7} L 47 ${f.top - 1} Z`} />
          <path d={`M 48 ${f.top - 1.5} L 51 ${f.top - 8} L 54 ${f.top - 1.5} Z`} />
          <path d={`M 55 ${f.top - 1} L 58 ${f.top - 6} L 60 ${f.top - 0.5} Z`} />
        </g>
      );
    }
    if (a.hair === 8) {
      // media melena: cae por los costados hasta la mandíbula
      extraHair = (
        <g fill={hairC}>
          <path d={`M ${50 - f.w - 2.4} 40 L ${50 - f.w - 2.4} ${f.chin - 8} Q ${50 - f.w - 2.4} ${f.chin - 5} ${50 - f.w + 1.6} ${f.chin - 5} L ${50 - f.w + 1.6} 42 Z`} />
          <path d={`M ${50 + f.w + 2.4} 40 L ${50 + f.w + 2.4} ${f.chin - 8} Q ${50 + f.w + 2.4} ${f.chin - 5} ${50 + f.w - 1.6} ${f.chin - 5} L ${50 + f.w - 1.6} 42 Z`} />
        </g>
      );
    }
    if (a.hair === 9) {
      // raya al medio
      extraHair = <path d={`M 50 ${f.top - 1} L 50 30.5`} stroke={skin} strokeWidth={1.1} fill="none" />;
    }
    if (a.hair === 10) {
      // erizo: púas cortas parejas
      extraHair = (
        <g fill={hairC}>
          {[-12, -6, 0, 6, 12].map((x) => (
            <path key={x} d={`M ${48 + x} ${f.top - 0.5} L ${50 + x} ${f.top - 5} L ${52 + x} ${f.top - 0.5} Z`} />
          ))}
        </g>
      );
    }
    if (a.hair === 11) {
      // afro: masa redondeada por encima y a los costados
      extraHair = (
        <g fill={hairC}>
          <circle cx={50 - f.w - 1} cy={f.top + 3} r={5} />
          <circle cx={50 + f.w + 1} cy={f.top + 3} r={5} />
          <circle cx={50 - 8} cy={f.top - 3.5} r={5.5} />
          <circle cx={50 + 8} cy={f.top - 3.5} r={5.5} />
          <circle cx={50} cy={f.top - 5} r={5.5} />
        </g>
      );
    }
  }

  // ---- Barba ----
  let beard: React.ReactNode = null;
  if (a.facialHair === 1) {
    beard = <path d={`M ${50 - 6.5} ${mouthY - 2} Q 50 ${mouthY - 5.2} ${50 + 6.5} ${mouthY - 2} Q 50 ${mouthY - 3} ${50 - 6.5} ${mouthY - 2} Z`} fill={beardC} />;
  } else if (a.facialHair === 2) {
    beard = (
      <g fill={beardC}>
        <path d={`M ${50 - 6.5} ${mouthY - 2} Q 50 ${mouthY - 5.2} ${50 + 6.5} ${mouthY - 2} Q 50 ${mouthY - 3} ${50 - 6.5} ${mouthY - 2} Z`} />
        <path d={`M ${50 - 6.8} ${mouthY - 1} Q ${50 - 7} ${f.chin + 3.5} 50 ${f.chin + 3.5} Q ${50 + 7} ${f.chin + 3.5} ${50 + 6.8} ${mouthY - 1} L ${50 + 4.6} ${mouthY - 0.5} Q ${50 + 4.4} ${f.chin} 50 ${f.chin} Q ${50 - 4.4} ${f.chin} ${50 - 4.6} ${mouthY - 0.5} Z`} />
      </g>
    );
  } else if (a.facialHair === 3 || a.facialHair === 4) {
    const d = `M ${50 - f.w - 0.8} 42
      Q ${50 - f.w - 0.8} ${f.chin - 6} ${50 - f.jw - 0.8} ${f.chin + 0.5}
      Q ${50 - f.jw * 0.5} ${f.chin + 6.2} 50 ${f.chin + 6.2}
      Q ${50 + f.jw * 0.5} ${f.chin + 6.2} ${50 + f.jw + 0.8} ${f.chin + 0.5}
      Q ${50 + f.w + 0.8} ${f.chin - 6} ${50 + f.w + 0.8} 42
      L ${50 + f.w - 2.5} 43
      Q ${50 + f.w - 3} ${mouthY - 3.5} ${50 + f.jw * 0.55} ${mouthY - 2}
      Q 50 ${mouthY - 4.5} ${50 - f.jw * 0.55} ${mouthY - 2}
      Q ${50 - f.w + 3} ${mouthY - 3.5} ${50 - f.w + 2.5} 43 Z`;
    beard = <path d={d} fill={beardC} opacity={a.facialHair === 4 ? 0.42 : 1} />;
  } else if (a.facialHair === 5) {
    beard = <path d={`M ${50 - 3.2} ${f.chin - 2.5} Q 50 ${f.chin - 0.5} ${50 + 3.2} ${f.chin - 2.5} Q ${50 + 3} ${f.chin + 4.2} 50 ${f.chin + 4.6} Q ${50 - 3} ${f.chin + 4.2} ${50 - 3.2} ${f.chin - 2.5} Z`} fill={beardC} />;
  } else if (a.facialHair === 6) {
    // patillas largas
    beard = (
      <g fill={beardC}>
        <path d={`M ${50 - f.w - 0.6} 40 L ${50 - f.w - 0.6} ${f.chin - 7} L ${50 - f.w + 2.8} ${f.chin - 8} L ${50 - f.w + 2.8} 41 Z`} />
        <path d={`M ${50 + f.w + 0.6} 40 L ${50 + f.w + 0.6} ${f.chin - 7} L ${50 + f.w - 2.8} ${f.chin - 8} L ${50 + f.w - 2.8} 41 Z`} />
      </g>
    );
  } else if (a.facialHair === 7) {
    // bigote grueso caído
    beard = <path d={`M ${50 - 7} ${mouthY - 2} Q 50 ${mouthY - 5.6} ${50 + 7} ${mouthY - 2} L ${50 + 7.2} ${mouthY + 3.2} L ${50 + 4.9} ${mouthY + 3.2} Q ${50 + 4.5} ${mouthY - 2.4} 50 ${mouthY - 2.8} Q ${50 - 4.5} ${mouthY - 2.4} ${50 - 4.9} ${mouthY + 3.2} L ${50 - 7.2} ${mouthY + 3.2} Z`} fill={beardC} />;
  }

  // ---- Ojos ----
  const eyeY = 42;
  const eyes: React.ReactNode = (() => {
    const lid = (sign: number) => (
      <path d={`M ${50 + sign * dx - 2.6} ${eyeY - 2} Q ${50 + sign * dx} ${eyeY - 3} ${50 + sign * dx + 2.6} ${eyeY - 2}`} stroke={skinDark} strokeWidth={0.9} fill="none" />
    );
    const tired = a.eyes === 4 || a.expression === 3;
    const [rx, ry] = [
      [1.9, 2.1], [2.3, 1.1], [2.3, 2.7], [2.1, 1.8], [2.2, 1.2],
    ][a.eyes % 5];
    return (
      <g fill={eyeC}>
        <ellipse cx={50 - dx} cy={eyeY} rx={rx} ry={ry} transform={a.eyes === 3 ? `rotate(-9 ${50 - dx} ${eyeY})` : undefined} />
        <ellipse cx={50 + dx} cy={eyeY} rx={rx} ry={ry} transform={a.eyes === 3 ? `rotate(9 ${50 + dx} ${eyeY})` : undefined} />
        {tired && lid(-1)}
        {tired && lid(1)}
      </g>
    );
  })();

  // ---- Cejas (la expresión les cambia el ángulo) ----
  const brows: React.ReactNode = (() => {
    const widths = [1.7, 1.7, 2.7, 1.2];
    const bw = widths[a.eyebrows % widths.length];
    let innerY = 36.4, outerY = 36, liftL = 0;
    if (a.expression === 2) { innerY = 37.8; outerY = 34.9; } // malhumorado
    if (a.expression === 3) { innerY = 37; outerY = 37; }     // cansado
    if (a.expression === 4) liftL = -1.8;                     // confiado: una ceja arriba
    const arch = a.eyebrows === 1 ? -1.6 : 0;
    const brow = (sign: number, lift: number) => {
      const xi = 50 + sign * (dx - 3), xo = 50 + sign * (dx + 3.2);
      const midX = (xi + xo) / 2, midY = (innerY + outerY) / 2 + arch + lift;
      return <path d={`M ${xi} ${innerY + lift} Q ${midX} ${midY} ${xo} ${outerY + lift}`} stroke={beardC} strokeWidth={bw} strokeLinecap="round" fill="none" />;
    };
    return <g>{brow(-1, liftL)}{brow(1, 0)}</g>;
  })();

  // ---- Nariz ----
  const noses = [
    `M 50 44 L 49.2 49 Q 50 50.6 51.8 49.7`,
    `M 50 43.5 L 48.6 48.5 Q 50.2 51.4 53 49.4`,
    `M 50.2 43.5 L 48.2 46.5 L 49.4 50 Q 50.2 51 51.8 50`,
    `M 50 44 L 49.4 47.8 M 50.3 49.5 m -1.7 0 a 1.7 1.7 0 1 0 3.4 0 a 1.7 1.7 0 1 0 -3.4 0`,
    `M 50 43 L 49 50.5 Q 50 51.8 51.6 50.9`,
  ];
  const nose = <path d={noses[a.nose % noses.length]} stroke={skinDark} strokeWidth={a.nose === 1 ? 1.8 : 1.4} strokeLinecap="round" fill="none" />;

  // ---- Boca (forma según variante, curva según expresión) ----
  const mouth: React.ReactNode = (() => {
    const wd = [8, 11, 13][a.mouth % 3];
    const sw = [1.6, 2.2, 2.8][a.mouth % 3];
    const x1 = 50 - wd / 2, x2 = 50 + wd / 2;
    const ds = [
      `M ${x1} ${mouthY} Q 50 ${mouthY + 0.8} ${x2} ${mouthY}`,
      `M ${x1} ${mouthY} Q 50 ${mouthY + 3.6} ${x2} ${mouthY}`,
      `M ${x1} ${mouthY + 1.5} Q 50 ${mouthY - 2.2} ${x2} ${mouthY + 1.5}`,
      `M ${x1} ${mouthY + 0.5} L ${x2} ${mouthY + 0.5}`,
      `M ${x1} ${mouthY + 1} Q 50 ${mouthY + 2.6} ${x2} ${mouthY - 1.6}`,
    ];
    return <path d={ds[a.expression % ds.length]} stroke={mouthC} strokeWidth={sw} strokeLinecap="round" fill="none" />;
  })();

  // ---- Marcas de edad ----
  const ageMarks: React.ReactNode = a.ageDetail === 0 ? null : (
    <g stroke={skinDark} strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.75}>
      <path d={`M ${50 - dx - 2} 45.5 Q ${50 - dx} 47 ${50 - dx + 2} 45.8`} />
      <path d={`M ${50 + dx - 2} 45.8 Q ${50 + dx} 47 ${50 + dx + 2} 45.5`} />
      {a.ageDetail >= 2 && <path d={`M 44.5 31.5 Q 50 33.2 55.5 31.5`} />}
      {a.ageDetail >= 3 && (
        <>
          <path d={`M ${50 - dx - 3.4} 41 L ${50 - dx - 5.4} 40.2`} />
          <path d={`M ${50 - dx - 3.4} 43.2 L ${50 - dx - 5.4} 43.8`} />
          <path d={`M ${50 + dx + 3.4} 41 L ${50 + dx + 5.4} 40.2`} />
          <path d={`M ${50 + dx + 3.4} 43.2 L ${50 + dx + 5.4} 43.8`} />
          <path d={`M ${50 - 5} 50.5 Q ${50 - 7} 53 ${50 - 5.5} 55.5`} />
          <path d={`M ${50 + 5} 50.5 Q ${50 + 7} 53 ${50 + 5.5} 55.5`} />
        </>
      )}
    </g>
  );

  // ---- Gorra (contextos sociales): tapa el pelo y anula vincha/cinta ----
  const capArt: React.ReactNode = cap ? (
    <g>
      <path
        d={`M ${50 - f.w - 1.8} 33.5 Q ${50 - f.w - 1.8} ${f.top - 5} 50 ${f.top - 5} Q ${50 + f.w + 1.8} ${f.top - 5} ${50 + f.w + 1.8} 33.5 Q 50 30.5 ${50 - f.w - 1.8} 33.5 Z`}
        fill={jersey}
      />
      <path d={`M ${50 - f.w * 0.75} 33.2 Q 50 40.5 ${50 + f.w * 0.75} 33.2 Q 50 35.8 ${50 - f.w * 0.75} 33.2 Z`} fill={jersey} />
      <path d={`M ${50 - f.w * 0.75} 33.2 Q 50 40.5 ${50 + f.w * 0.75} 33.2 Q 50 35.8 ${50 - f.w * 0.75} 33.2 Z`} fill="rgba(0,0,0,0.25)" />
      <path d={`M ${50 - f.w - 1.8} 33.5 Q 50 30.5 ${50 + f.w + 1.8} 33.5`} stroke="rgba(0,0,0,0.3)" strokeWidth={1.2} fill="none" />
      <circle cx={50} cy={f.top - 4.5} r={1.3} fill="rgba(0,0,0,0.28)" />
    </g>
  ) : null;

  // ---- Accesorios ----
  let accessory: React.ReactNode = null;
  if (cap && (a.accessory === 1 || a.accessory === 5)) {
    // La gorra ocupa el lugar de la vincha o la cinta.
  } else if (a.accessory === 1) {
    accessory = <rect x={50 - f.w - 1.2} y={30.2} width={(f.w + 1.2) * 2} height={4.4} rx={2} fill={jersey} opacity={0.92} />;
  } else if (a.accessory === 2) {
    accessory = (
      <g stroke="#20242e" strokeWidth={1.3} fill="rgba(255,255,255,0.07)">
        <circle cx={50 - dx} cy={eyeY} r={5} />
        <circle cx={50 + dx} cy={eyeY} r={5} />
        <path d={`M ${50 - dx + 5} ${eyeY - 1} Q 50 ${eyeY - 2.5} ${50 + dx - 5} ${eyeY - 1}`} fill="none" />
      </g>
    );
  } else if (a.accessory === 3) {
    accessory = <circle cx={50 - f.w - 0.4} cy={44.8} r={1.3} stroke="#e8c35a" strokeWidth={1.1} fill="none" />;
  } else if (a.accessory === 4) {
    accessory = (
      <g transform={`rotate(-16 ${50 + dx + 2} 33)`}>
        <rect x={50 + dx - 1.5} y={31.6} width={7} height={2.8} rx={1.2} fill="#d9b48f" />
        <rect x={50 + dx + 0.8} y={32.3} width={2.4} height={1.4} rx={0.6} fill="#c49c78" />
      </g>
    );
  } else if (a.accessory === 5) {
    accessory = <rect x={50 - f.w - 1} y={31.4} width={(f.w + 1) * 2} height={2.4} rx={1.2} fill="#20242e" opacity={0.95} />;
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title ?? 'Retrato'}>
      {/* Cuello y hombros con camiseta del club */}
      <rect x={44} y={f.chin - 4} width={12} height={26} fill={skin} />
      <path d={`M 44 ${f.chin + 1} Q 50 ${f.chin + 6.5} 56 ${f.chin + 1} L 56 ${f.chin - 2} L 44 ${f.chin - 2} Z`} fill={skinDark} opacity={0.45} />
      <path d="M 8 100 L 8 92 Q 11 76 30 72 L 41 69 Q 50 79 59 69 L 70 72 Q 89 76 92 92 L 92 100 Z" fill={jersey} />
      <path d="M 41 69 Q 50 79 59 69" stroke="rgba(0,0,0,0.3)" strokeWidth={1.6} fill="none" />
      {/* Orejas detrás de la cara */}
      <ellipse cx={50 - f.w - 0.6} cy={41.5} rx={EAR_SIZES[a.ears % 3]} ry={EAR_SIZES[a.ears % 3] + 0.8} fill={skin} />
      <ellipse cx={50 + f.w + 0.6} cy={41.5} rx={EAR_SIZES[a.ears % 3]} ry={EAR_SIZES[a.ears % 3] + 0.8} fill={skin} />
      <path d={facePath} fill={skin} />
      {beard}
      {hair.map((h, i) => (
        <path key={i} d={h.d} fill={hairC} opacity={h.opacity ?? 1} />
      ))}
      {extraHair}
      {ageMarks}
      {brows}
      {eyes}
      {nose}
      {mouth}
      {accessory}
      {capArt}
    </svg>
  );
}
