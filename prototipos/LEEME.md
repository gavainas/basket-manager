# Prototipos

Cosas que se prueban **fuera del juego**. Nada de acá se importa desde `src/`
ni entra al build de `dist/`: son bancos de prueba para decidir si una idea
vale la pena antes de tocar el juego.

## `motor-partido.html`

Prototipo del motor de posesiones y la vista top-down descritos en
[`design/MOTOR_PARTIDO.md`](../design/MOTOR_PARTIDO.md). Un solo archivo, sin
dependencias: se abre con doble click.

Publicado en <https://claude.ai/code/artifact/57996554-285f-44f2-a50b-eb4967d7f886>.

Qué tiene:

- **Motor de posesiones completo**: ~130 posesiones por partido, cada una con
  quién la trae, pérdida, quién tira, desde dónde, contra qué defensor, si
  entra, falta, tiros libres y rebote disputado. Planilla real para **los dos
  equipos** (intentos, porcentajes, RO/RD, asistencias, pérdidas, recuperos,
  tapas, faltas con bonus y quinta personal).
- **Vista top-down**: fichitas numeradas sobre cancha FIBA, con formaciones por
  tipo de jugada y el esquema defensivo dibujado (el bloque 2-3 de la zona, las
  líneas de marca en hombre, los cinco pares desparramados en presión).
- **Pestaña Balance**: simula 1800 partidos sin animación y muestra si el
  marcador da real y si la diferencia de nivel se paga.

### Calibrarlo

```
node prototipos/calibrar.cjs [partidos]
```

Extrae los `<script id="motor*">` del propio HTML y los corre en Node, así que
hay **una sola copia del motor** y no puede haber deriva entre lo que se mide y
lo que se ve. Cambiaste los números de `M` → corré esto.

### Dónde quedó calibrado (ago 2026)

| Métrica | Prototipo | Objetivo | Motor del juego hoy |
| --- | --- | --- | --- |
| Puntos por equipo | 62.5 | ~63 | 63.5 |
| 2P / 3P / TL | 50% / 34% / 68% | de básquet | no existen |
| Faltas por equipo | 13.6 | 12-18 | no existen |
| Expulsados por 5 faltas | 0.34 por equipo | que pase | no existen |
| Margen vs. rival de 95 | **−21.9** | ~−20 | **−12.4** |
| Palizas de 20+ vs. 95 | **58%** | frecuente | **14%** |
| Margen entre parejos (desvío) | 12.2 | 12-13 | — |
| 1800 partidos | 1.4 s | que no moleste | — |

Ninguna de las nueve combinaciones de defensa domina: entre equipos parejos
caen todas entre −1.3 y +1.3 puntos de margen.

### Lo que el prototipo NO resuelve

Atributos reales por jugador (acá se derivan de un solo nivel), el enganche con
el resto del juego (ánimo, notas, lesiones, cansancio entre fechas), el motor
abstracto para las divisionales sin plantel generado, y el re-balance de
`BALANCE.liveMatch`, que sigue siendo la parte más cara del trabajo.
