# Motor de partido: posesiones, estadísticas y vista top-down

**Estado: ToDo, para más adelante** (idea de Gabi, ago 2026). Este documento es
el diseño acordado y el diagnóstico medido del motor actual. **En el juego no
hay nada implementado**: lo que sí existe es un **prototipo funcionando fuera
del juego** en [`prototipos/motor-partido.html`](../prototipos/motor-partido.html)
(publicado en <https://claude.ai/code/artifact/57996554-285f-44f2-a50b-eb4967d7f886>),
que valida las decisiones de abajo con números medidos. Ver
[`prototipos/LEEME.md`](../prototipos/LEEME.md).

El objetivo, en palabras de Gabi: *"que el partido no sea solamente hacer
cambios en cada cuarto y elegir la táctica"*. Y una restricción dura que manda
sobre todo el diseño: **el tanteador tiene que ser real**. Nada de 20 a 19.

---

## 1. Qué hay hoy: un motor de *cuartos*, no de partido

El corazón está en `playQuarter` ([`src/game/match.ts`](../src/game/match.ts)).
La lógica real es:

```
atk      = promedio de los 5 en cancha × química × organización × cobertura × táctica
rivalEff = rival.strength × mod de convocatoria × azar del día × piernas
ourQ     = 62/4 + (atk − rivalEff) × 0.55/4 + suerte + racha + momentum
```

Y después **la planilla se reparte hacia atrás**: `distribute()` toma los puntos
del cuarto ya calculados y los prorratea entre los 5 según su `perf` del día.
Los rebotes salen de `rng.int(7,12)` repartido por peso de posición. Las
asistencias, igual.

Consecuencia central: **los números no vienen de acciones de básquet**. No hay
posesiones, ni tiros, ni intentos, ni porcentajes, ni pérdidas, ni faltas
personales. El relato tampoco: `quarterFlavor` ([`narrative.ts`](../src/game/narrative.ts))
elige la frase *después*, mirando umbrales — "metió dos triples seguidos" se
dispara porque el jugador tiene ≥8 puntos en el cuarto, no porque haya tirado
dos triples.

Y hay una asimetría que salta a la vista: **vos tenés planilla, el rival es un
número**. `rollRivalMatchday` ([`world.ts`](../src/game/world.ts)) sortea los
presentes del rival con nombre, posición, nivel y personalidad… y todo eso se
colapsa en `mod` (un multiplicador entre 0.85 y 1.05). El mundo que ya está
construido — planteles completos, scouting progresivo, `timesFaced` por
persona — no entra a la cancha.

---

## 2. El diagnóstico medido: el marcador está comprimido

Gabi planteó que el motor debería conocer las estadísticas reales del rival
para que *"si jugás contra tremendo equipo te ganen por 20"*. **La separación
que pedía ya existe**: `rival.strength` y `wp.level` son la verdad y es lo que
el motor usa; el ruido lo mete `perceivedLevel` en
[`scouting.ts`](../src/game/scouting.ts), que es capa de **presentación**. El
motor ya juega con los datos reales y el usuario ya ve una estimación que
mejora con `timesFaced`. Esa arquitectura está bien y hay que conservarla.

El problema es otro, y está medido. Con el motor real, 400 partidos por fila,
zona + ataque de equipo, sin gestión del manager:

| Fuerza rival | Nuestra fuerza | % victorias | Margen medio | \|margen\| ≥ 15 | \|margen\| ≥ 20 | Peor derrota |
|---|---|---|---|---|---|---|
| 45 | 55.6 | 92% | +10.2 | 26% | 8% | −10 |
| 55 | 55.6 | 79% | +5.9 | 11% | 2% | −12 |
| 65 | 55.6 | 59% | +1.2 | 3% | 0% | −17 |
| 75 | 55.6 | 34% | −3.4 | 8% | 1% | −23 |
| 85 | 55.6 | 13% | −8.0 | 18% | 5% | −28 |
| **95** | 55.6 | **3%** | **−12.4** | 38% | **14%** | −31 |

Contra un rival de 95 — un abismo, prácticamente dos categorías arriba — se
pierde por **12 de promedio** y se le gana **3 de cada 100 veces**. La paliza no
existe.

Las tres causas, en orden de peso:

1. **La remontada automática** (`comebackDeficit: 9`, `comebackFactor: 0.15`,
   `comebackMaxPoints: 3`). Cuando vas abajo de 9, el motor te regala hasta 3
   puntos por cuarto. Contra un rival muy superior eso se activa en los cuartos
   2, 3 y 4: **hasta 9 puntos de descuento gratis**, todos los partidos. Es la
   mitad de la compresión.
2. **El azar por cuarto** (`luckPerQuarter: 5` más `rivalDayVariance: 0.1`).
   Suficiente ruido como para que un abismo de 40 puntos de fuerza se dé vuelta
   3 veces de cada 100.
3. **Los pisos** (`Math.max(4, …)` por cuarto en cada equipo).

Las tres son prótesis razonables para un motor que no genera varianza propia: sin
posesiones, la única forma de que un partido no esté sentenciado al minuto uno es
inyectar remontada y suerte a mano. **Un motor de posesiones las hace
innecesarias** — la varianza sale sola de los tiros que entran y los que no.

**Un dato aparte, para no perderlo**: el punto de equilibrio (50% de victorias)
cae cerca de fuerza rival ≈ 67, no 55.6. `evaluateTeam().strength` y
`rival.strength` **no están en la misma escala** (el rival se multiplica además
por `freshFactor` ≈ 1.07). Hay un sesgo sistemático de ~12 puntos a favor del
jugador. Revisar al re-balancear.

**Lo que sí está bien hoy**: los totales. Media de **63.5 puntos por equipo por
partido** (p10 = 56, p90 = 71, mín 49, máx 80). Es un marcador de básquet
amateur creíble y es el número que el motor nuevo tiene que sostener.

---

## 3. Lo que falta simular (el ToDo de estadísticas)

Para ambos equipos, no solo el nuestro:

- Puntos, **intentos y convertidos** separados por 2, 3 y libres → porcentajes.
- Rebotes ofensivos y defensivos por separado.
- Asistencias, pérdidas, recuperos, tapas.
- **Faltas personales por jugador**, faltas de equipo por cuarto y **bonus**.
- Quinta falta = afuera. En un plantel amateur con seis en el banco, eso es
  drama del bueno y engancha con el tema central del juego (juntar cinco).
- Minutos (ya existen), +/− por jugador.

**Obstáculo conocido, hay que decidirlo antes de empezar**: ni nuestros
jugadores ni los del mundo tienen los atributos que un motor de posesiones come.
`Player` tiene una sola `technique` ([`types.ts`](../src/game/types.ts));
`WorldPlayer` tiene un solo `level`. No hay tiro, rebote, pase ni defensa por
separado. Dos caminos:

- **Derivarlos determinísticamente** del id + nivel + posición (mismo truco que
  los retratos procedurales). Barato, no toca ningún save. Pero la profundidad
  se *ve* real y viene de un solo número: dos pívots del mismo nivel tiran igual.
- **Abrir los atributos de verdad**. Toca ficha, mercado, scouting, progresión y
  migración de save. Es lo correcto a largo plazo y es bastante más trabajo.

Recomendación: arrancar derivando, con la derivación aislada en una función
única para poder reemplazarla por atributos reales después sin tocar el motor.

---

## 4. La vista top-down (el pedido central)

Fichitas numéricas moviéndose en movimientos coordinados de básquet. **No** son
jugadores 3D ni una simulación física real: son cinco tokens por equipo sobre
media cancha, moviéndose entre posiciones con nombre.

Lo que Gabi quiere poder **ver**, no leer:

- Si pusiste **correr la cancha**, que corran: transición, tokens cruzando a
  toda velocidad, tiro rápido.
- Si pusiste **dársela a la estrella**, que la pelota vaya a la estrella y tire
  la estrella.
- Si el rival te marca **zona**, que se vea la zona: los cinco tokens rivales
  acomodados en 2-3, moviéndose con la pelota en bloque, en vez de cada uno
  pegado a su marca.

Implementación conceptual: cada posesión que el motor genera trae, además del
resultado, un **tipo de jugada** (transición / pick and roll / poste bajo /
movimiento de pelota / tiro forzado sobre el reloj). La vista tiene una
biblioteca de **plantillas de animación** — trayectorias predefinidas de los 5
tokens y la pelota — y elige la plantilla que corresponde a ese tipo de jugada,
con los nombres y números reales encima. No hay pathfinding ni física: son
interpolaciones sobre curvas guardadas. Con ~15 plantillas de ataque y 3 de
defensa (hombre / zona / presión) ya se lee la táctica.

### La regla que evita el 20 a 19

Esta es la decisión de arquitectura más importante del documento:

> **La animación no genera el marcador. El motor genera todas las posesiones
> como datos, y la vista es un reproductor de ese stream.**

63 puntos por equipo son ~62 posesiones por lado, ~15 por cuarto, ~125 en el
partido. Si el marcador dependiera de las jugadas animadas, animar 125 posesiones
a 4 segundos serían 8 minutos por partido — insostenible dentro de un bucle
semanal — y la tentación sería animar 20 y quedarse con un 20 a 19. Ese camino
está prohibido por diseño.

En cambio: el motor resuelve las 125 posesiones completas (milisegundos), el
marcador y la planilla son reales y completos siempre, y la vista **reproduce**
ese stream con control de velocidad — x1, x4, saltar al final del cuarto,
o directamente no mirar y quedarse con el resumen de hoy. Es el modelo de la
vista 2D de Football Manager y es el único que sostiene las dos cosas a la vez.

**Riesgo de ritmo, a tener presente**: hoy el partido son 4 clics dentro de un
bucle semanal. La vista top-down tiene que ser **opcional y salteable**, y el
cuarto tiene que seguir siendo la unidad de decisión. Si la animación se vuelve
obligatoria, cambia el género del juego.

---

## 5. Etapas sugeridas

1. **Motor de posesiones sin animación.** El cuarto sigue resolviéndose de un
   clic y la UI casi no cambia, pero el marcador del cuarto sale de simular ~15
   posesiones por lado en vez de una fórmula. Entra lo que de verdad mueve la
   aguja: planilla del rival con nombres, intentos y porcentajes, faltas y bonus,
   matchups por posición, y relato generado por lo que pasó en vez de elegido por
   umbral (eso mata la repetición de raíz, que hoy `freshLiveNote` parchea).
2. **Re-balance.** Todo `BALANCE.liveMatch` (70 líneas de números medidos) muere.
   Volver a pegarle a los objetivos de [`BALANCE.md`](BALANCE.md) con `npm run sim`
   es probablemente **más trabajo que escribir el motor**. Objetivos: sostener la
   media de 63.5 puntos por equipo, y que un rival muy superior gane por 20 —
   con las prótesis de remontada y suerte apagadas o muy reducidas.
3. **La vista top-down** como reproductor del stream de posesiones, opcional.
4. **Atributos reales por jugador**, si la derivación se queda corta.

## 5 bis. Lo que el prototipo ya probó (ago 2026)

El prototipo implementa las etapas 1 y 3 fuera del juego. Lo que quedó medido:

| Métrica | Prototipo | Objetivo | Motor de hoy |
| --- | --- | --- | --- |
| Puntos por equipo | 62.5 | ~63 | 63.5 |
| 2P / 3P / TL | 50% / 34% / 68% | de básquet | no existen |
| Faltas por equipo | 13.6 | 12-18 | no existen |
| Expulsados por 5 faltas | 0.34 por equipo | que pase | no existen |
| **Margen vs. rival de 95** | **−21.9** | ~−20 | **−12.4** |
| **Palizas de 20+ vs. 95** | **58%** | frecuente | **14%** |
| Desvío del margen entre parejos | 12.2 | 12-13 | 12 (con prótesis) |
| 1800 partidos completos | 1.4 s | que no moleste | — |

Las cuatro conclusiones que importan:

1. **La hipótesis central se confirma.** Sin remontada automática, sin suerte
   por cuarto y sin rachas inyectadas, la diferencia de nivel se paga sola y la
   varianza entre equipos parejos queda donde tiene que estar. Las prótesis del
   motor actual no son necesarias cuando hay posesiones.
2. **La derivación de atributos desde un solo número alcanza para empezar.** El
   prototipo saca doce atributos de `nivel` + puesto + ruido fijo y produce
   planillas creíbles. Abrir atributos de verdad puede esperar.
3. **Ninguna táctica domina.** Las nueve combinaciones de defensa entre equipos
   parejos caen entre −1.3 y +1.3 puntos de margen. Para llegar ahí hubo que
   darle a la marca hombre un costo de piernas y a la presión una recompensa
   que escale con las piernas que quedan: sin eso, la presión quedaba dominada
   (perdía contra las tres defensas) y hombre ganaba siempre.
4. **La regla de la animación se sostiene en la práctica.** 1800 partidos en
   1.4 s es la prueba de que el motor no depende de la vista: la cancha puede ir
   a 8× o saltearse entera sin tocar el marcador.

Lo que el prototipo **no** despeja: el re-balance de `BALANCE.liveMatch` contra
los objetivos de [`BALANCE.md`](BALANCE.md), el enganche con ánimo/notas/
lesiones, y el motor abstracto para las divisionales sin plantel generado.

## 6. Qué NO hace este ToDo

- **No reemplaza el motor del resto del mundo.** Los planteles solo se generan
  donde importan (divisional del club y vecinas); las otras 8 divisionales / 75
  equipos no tienen cinco nombres que simular. El motor de posesiones corre solo
  en los partidos del club; el resto de la pirámide sigue con el modelo abstracto
  actual. Son dos motores conviviendo, no un reemplazo.
- **No es lo más urgente.** El roadmap ya marca cosas más baratas y que hoy se
  notan más: el DT que no respeta fatiga ni posiciones (P1-9) y la saturación de
  los diales sociales en la segunda mitad.
