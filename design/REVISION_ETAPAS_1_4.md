# Revisión de las etapas 1–4 — 2026-09-15

Rama: `codex/partido-semana-propuestas`.
Base: `49846d9c6783b0d638fdcf2a04f2eb1d1e75ec5f`.
Alcance aprobado: verificar los problemas, corregir partido y cronología semanal, y preparar dos composiciones de tablero para elegir. La integración visual general, fichajes y el set de retratos quedan fuera de esta rama.

## Etapa 1: reproducción

Se contrastaron los hallazgos del playtest anterior con la versión actual del repositorio. Antes de los cambios, las cinco pruebas de `tests/revisionPartido.test.ts` fallaron:

| Hallazgo | Causa | Pantalla y referencia de implementación |
| --- | --- | --- |
| El jugador guardado por cuatro faltas vuelve automáticamente | La decisión no persistía como reserva; cerradores/DT podían seleccionarlo | Partido, incidencia y banco; `game/narrative.ts`, `game/match.ts` |
| Relato adjudica jugadas no registradas | El reparto de puntos añadía tipos de tiro, rebotes y asistencias aleatorias | Partido, relato; `game/relato.ts` |
| Recién llegado tratado como desaparecido de todo el partido | Se miraban cuarto y puntos, sin minutos efectivos | Partido e informe; `game/narrative.ts` |
| Nota baja con “Imparable” | El comentario priorizaba puntos antes que valoración | Informe, planilla; `game/rating.ts` |

El reingreso se reprodujo con dos pruebas distintas: plan del manager y rotación del DT. Además se contrastaron las dos fuentes de tiempo del partido y los offsets fijos del calendario.

**Límite de la verificación actual:** el navegador rechazó localhost y archivos locales por su política de acceso. Esta rama no se volvió a jugar en la interfaz durante esta sesión. Las pruebas del motor no se presentan como un nuevo playtest manual. El sitio publicado no se modificó.

## Etapa 2: partido

- Las salidas elegidas ante incidencias guardan una reserva. La rotación del DT, los planes y los reemplazos automáticos la respetan. Un cambio o una unidad elegidos explícitamente por el manager pueden devolver al jugador; los expulsados, lesionados y llegadas tardías siguen sujetos a sus restricciones.
- El banco identifica al jugador como reservado. La reserva sobrevive a guardar/cargar y termina con ese partido.
- El reloj de presentación se comparte entre el partido y el pie global: mismo marcador, sin adelantar el récord cuando el motor ya calculó el final. El marcador deja de animar cifras intermedias que no coinciden con el relato.
- Los tramos nuevos conservan minutos y energía de ambos extremos para interpolar la presentación. No se anticipa la recuperación del entretiempo. El suplementario tampoco adelanta sus cinco minutos.
- El reloj muestra minutos y segundos transcurridos. La cancha muestra los jugadores del tramo visible; los puntos ocultan también los de cuartos futuros ya calculados.
- El relato conserva autores y puntos, sin atribuir tipo de tiro, asistencia o rebote a una reconstrucción visual. Las rachas ya no inventan un tiempo muerto ni cantidades de triples. No se añadió un simulador de posesiones: los aportes visuales siguen siendo una presentación determinista de los puntos del tramo.
- Los comentarios consideran minutos reales y la valoración global; el resumen deja de afirmar cómo se decidió el partido basándose sólo en la diferencia final.

Compatibilidad: campos nuevos opcionales, sin cambiar SAVE_VERSION ni constantes de balance. Las partidas previas continúan; un tramo antiguo sin instantánea conserva la presentación anterior de energía hasta empezar un tramo nuevo. El aumento del save queda limitado al partido en curso, no a la historia de temporadas.

## Etapa 3: semana

- `game/weekTimeline.ts` centraliza la fecha relativa de planificación, convocatoria y asado.
- Convocatoria temprana: dos días antes; tardía: el día del encuentro. Las gestiones/asado se ubican antes de la convocatoria, cuando se resuelven. El texto distingue previsto/realizado.
- Los mensajes de rivalidad hablan del próximo partido sin asumir sábado o domingo.
- El botón global dice “Ir a la semana” y desaparece al estar ya allí. Avanzar efectivamente sigue siendo una acción del flujo semanal.

## Etapa 4: dos composiciones para revisar

Ver [A y B](propuestas/README.md). Ambas láminas se inspeccionaron renderizadas. B es la recomendación para orientar al jugador nuevo; A prioriza la anticipación del encuentro. No se integró ninguna al juego.

## Validación

- `npm run build`: correcto. Se mantiene el aviso de Vite por tamaño del bundle, sin error de compilación.
- `npm test`: **118 pruebas, 16 archivos, todas correctas**. Incluyen 13 nuevas regresiones y las pruebas de guardado, pretemporada, carrera, temporadas, tramos e incidencias existentes.
- `git diff --check`: correcto.
- No se afirma una validación visual de React: queda pendiente abrir la rama en una vista accesible y probar pausa, sustitución, incidencia, salto de cuarto, suplementario, informe y convocatoria tardía a 1366 × 768.

Antes de integrar: elegir A/B y completar esa prueba de interfaz. Las propuestas no cambian el juego publicado.
