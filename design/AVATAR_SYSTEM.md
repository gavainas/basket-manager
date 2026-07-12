# Sistema de retratos — generador modular

Retratos procedurales de cabeza y hombros para todos los jugadores del juego.
**Sin imágenes externas, sin IA en tiempo de ejecución, sin servicios de red**:
todo es SVG dibujado por código, determinístico y serializable.

## Arquitectura

| Archivo | Rol |
| --- | --- |
| [`src/game/appearance.ts`](../src/game/appearance.ts) | Lógica pura (sin React): tipo `Appearance`, cantidades de variantes por capa y derivación determinística desde una seed. |
| [`src/ui/Avatar.tsx`](../src/ui/Avatar.tsx) | Render SVG por capas: cara, orejas, pelo, barba, ojos, cejas, nariz, boca, marcas de edad, accesorios, cuello y camiseta. |
| [`src/ui/AvatarGallery.tsx`](../src/ui/AvatarGallery.tsx) | Pantalla de validación (solo dev): abrir el juego y navegar a `/#retratos`. |

## Determinismo y persistencia

- La seed es el **id del jugador** (persistente en el save): misma seed → misma cara,
  entre pantallas, sesiones y partidas.
- Cada capa se elige con un **hash independiente** (`FNV-1a(seed + ':' + capa)`),
  así agregar variantes a una capa **no** cambia las demás capas de jugadores existentes.
- `Player.appearance` (opcional) permite guardar una apariencia fija en el perfil;
  si falta, se deriva del id. Hoy nadie la guarda; existe como gancho para cuando
  haga falta congelar caras ante cambios del generador.

**Regla de oro para ampliar**: agregar variantes SIEMPRE al final de cada lista y
nunca reordenar ni borrar — los índices derivados dependen del orden.

## Capas y variantes actuales (prototipo)

| Capa | Variantes | Nota |
| --- | --- | --- |
| `faceShape` | 6 | ovalado, redondo, alargado, cuadrado, fino, robusto |
| `skinTone` | 12 | rampa de claro a oscuro |
| `eyes` | 5 | normal, achinados, grandes, caídos, entrecerrados |
| `eyebrows` | 4 | rectas, arqueadas, gruesas, finas |
| `nose` | 5 | corta, ancha, aguileña, redonda, larga |
| `mouth` | 3 | fina, media, ancha (la curva la pone la expresión) |
| `ears` | 3 | chicas, medias, grandes |
| `hair` | 8 | rapado, corto, tupido, flequillo, rulos, casquete, despeinado, prolijo |
| `hairColor` | 8 | negro→rubio→colorado + **gris y blanco (canas)** |
| `baldness` | 4 | completo, entradas, coronilla, pelado |
| `facialHair` | 6 | nada, bigote, candado, completa, desprolija, chivita |
| `ageDetail` | 4 | nada, ojeras, ojeras + frente, arrugas |
| `expression` | 5 | neutro, sonrisa, malhumorado, cansado, confiado |
| `accessory` | 5 | nada, vincha, lentes, aro, curita |

Combinaciones teóricas: ~10^10. La meta de la etapa 2 (ver abajo) es acercarse a
las cantidades del brief (20 caras, 35 pelos, 30 barbas, etc.) **solo cuando las
piezas actuales empiecen a repetirse demasiado**.

## Identidad amateur

La edad del jugador **sesga** la apariencia (en `appearanceFromSeed(seed, age)`):

- **Calvicie**: casi nula antes de los 25; a los 39+ la mayoría tiene entradas,
  coronilla o está pelado.
- **Canas**: probabilidad que crece desde los ~30 (gris o blanco).
- **Marcas de edad**: ojeras → línea de frente → patas de gallo y surcos.
- **Barba**: más frecuente que en un plantel profesional (60%).
- **Accesorios**: con moderación (20%): vincha, lentes, aro, curita.

La panza y el estado físico NO se representan en el retrato (encuadre de cabeza y
hombros): van por atributos, descripciones y futuras ilustraciones de cuerpo entero.

## Consistencia

- Mismo encuadre y ángulo (de frente, cabeza y hombros), viewBox `0 0 100 100`.
- Legible de 24 a 96 px (validar en `/#retratos`, fila "Lectura en distintos tamaños").
- Fondo transparente: el contenedor `.avatar` pone fondo y borde; la camiseta toma
  el color del club vía prop `jersey` (por defecto `var(--accent)`).

## Uso

```tsx
<Avatar seed={p.id} age={p.age} appearance={p.appearance} title={p.name} />
```

Integrado hoy en `PlayerCard` (plantel/convocatoria) y `PlayerProfile` (ficha).

## Etapa 2 (pendiente)

- Retratos para `WorldPlayer` (rivales) y quinteto (`slot-avatar` de WeekView).
- Camiseta con el color real de cada club rival.
- Más variantes por capa (respetando la regla de apéndice).
- Expresión ligada al estado de ánimo del momento (hoy es fija por seed).
- Exportación a PNG con fondo transparente si hiciera falta fuera del juego.
