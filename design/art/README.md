# Exploración de arte — Puerta 1: direcciones artísticas

Material de la **Puerta 1** del [pipeline de arte](../ART_PIPELINE.md): tres direcciones
visuales claramente distintas, presentadas sobre la pantalla comparable que pide el
pipeline (la **plantilla**), con los mismos seis jugadores y los mismos datos en las tres.

> **Estado: PROPUESTA — nada de esto está integrado al juego.**
> No hay un solo cambio en `src/`. El juego se ve exactamente igual que antes de esta
> exploración. Ninguna dirección está aprobada; los retratos son bocetos del *estilo*,
> no personajes finales (eso es la Puerta 3, la hoja de 12 personajes).

## Cómo verla

- Abrir [`puerta1-direcciones.html`](puerta1-direcciones.html) en cualquier navegador
  (es autocontenida: sin dependencias, sin red, funciona desde el celular).
- Arriba hay tres pestañas para cambiar de dirección; al final, la misma card de
  Diego Techera en los tres estilos y una tabla comparativa.

## Las tres direcciones

| | Tesis | Tema | Retratos |
| --- | --- | --- | --- |
| **A · Planilla nocturna** | La noche de liga: datos primero, calma de planilla digital. Evolución seria de lo actual. | Oscuro (continuidad) | Vector plano sobrio |
| **B · Carné de socio** | El juego como papelería del club: boletín, planilla, carné con foto. | Claro / papel (ruptura) | Figurita a tinta con número de camiseta |
| **C · Pizarra del vestuario** | La previa en el vestuario: fichas magnéticas sobre la pizarra, notas en tiza. | Pizarra oscura + fichas claras (mixto) | Caricatura adulta de contorno grueso |

Los tres territorios salen de los ejemplos sugeridos en la Puerta 1 del pipeline
(manager sobrio / club de barrio editorial / caricatura adulta estilizada), a propósito
bien separados entre sí para que la elección diga algo.

### Riesgos anotados por dirección

- **A**: quedar genérico ("otro manager oscuro"). Si gana, hay que encontrarle el rasgo propio.
- **B**: legibilidad de pantallas densas sobre papel claro, y que el recurso "sello/Courier" no canse.
- **C**: pasarse de rosca hacia lo infantil (prohibición explícita de la futura Art Bible).

### Notas técnicas honestas

- Las tipografías son *stacks del sistema* (sin webfonts): la serifa de B y la "tiza" de C
  van a variar según el dispositivo. Si una dirección gana, se elige tipografía real en Puerta 2.
- Los retratos están dibujados a mano en SVG como bocetos de estilo. La exploración fina de
  personajes (edades, cuerpos, expresiones) es territorio de Higgsfield + Puerta 3.

## Qué se espera de Gabi (criterio de salida de la Puerta 1)

Una dirección elegida **y** observaciones concretas, en el formato del pipeline:

- **Conservar**: qué dirección o qué partes van tal cual.
- **Combinar**: mezclas (p. ej. "la UI de A con los retratos de C").
- **Descartar**: qué no va y por qué.

Con esa devolución se registra la decisión en `ART_PIPELINE.md` (sección *Registro de
aprobaciones*) y recién entonces siguen la Puerta 2 (UI y personajes por separado), la
hoja de 12 personajes y el vertical slice de 5 pantallas. Hasta que eso pase, **no se
integra nada de esto al juego**.
