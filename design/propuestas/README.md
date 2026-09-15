# Dos propuestas de tablero — 15 de septiembre de 2026

**Láminas para elegir composición, todavía no integradas al juego.** Resolución: 1366 × 768. No son capturas de una versión implementada ni prototipos navegables.

## A · La próxima fecha

![A — La próxima fecha](tablero-a.png)

El rival y el encuentro ocupan el primer plano. La escena del vestuario acompaña el próximo partido. La decisión semanal queda en una franja propia, inmediatamente debajo. Favorece la anticipación deportiva y la presencia del club.

## B · La semana en tus manos — recomendada

![B — La semana en tus manos](tablero-b.png)

La tarea actual queda en el centro, con el presupuesto de dos gestiones y la secuencia que sigue. Rival, vestuario e informe acompañan. Favorece la comprensión del ciclo para alguien que juega por primera vez.

## Comparación controlada

Las dos usan **el mismo estado de prueba** (`estado.json`), obtenido mediante tres fechas del motor con semilla 11 y quinteto sugerido: semana 4, récord 2–1, caja $303, 13 jugadores y último resultado 69–66. No es una reconstrucción de la partida del usuario. La escena y los ocho retratos son los assets aprobados de `public/arte`; se conserva deliberadamente su repetición. Oswald es la fuente empaquetada del juego. Ningún asset nuevo fue generado.

La aprobación pendiente es **la composición A o B**, no un cambio de paleta ni un nuevo set de personajes. Según `design/ART_PIPELINE.md`, una composición de revisión no autoriza su expansión al resto del juego. La etapa 4 autorizó preparar ambas; su integración corresponde a la etapa siguiente.

## Archivos

- `tablero-a.png`, `tablero-b.png`: imágenes listas para comparar.
- `tablero-a.svg`, `tablero-b.svg`: láminas vectoriales autónomas; las imágenes están embebidas y los titulares usan curvas de Oswald.
- `estado.json`: datos compartidos de la comparación.
- `generar.py`: fuente de las dos composiciones. Requiere Python con fontTools y Node con sharp (o `CODEX_PRIMARY_RUNTIME_NODE_MODULES` apuntando a la instalación). Ejecutar `python3 design/propuestas/generar.py` desde la raíz, después de `npm ci`. Para PNG, rasterizar los SVG con sharp.

Verificación realizada: ambas láminas fueron rasterizadas e inspeccionadas a 1366 × 768. La maquetación React final y sus interacciones siguen pendientes; el navegador de esta sesión bloqueó localhost y los archivos locales.
