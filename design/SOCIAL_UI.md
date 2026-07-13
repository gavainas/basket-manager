# UI social — eventos y estados humanos

El mundo social (asados, cuotas, vestuario, grupo de WhatsApp) es la mitad del juego
y no puede sentirse como pop-ups administrativos. Este documento define la familia
visual para eventos sociales y los componentes de "estado humano".

## Principio: estados humanos, no solo porcentajes

Todo dato sobre una persona se acompaña de contexto en castellano:

| ❌ Solo el número | ✅ Número + contexto |
| --- | --- |
| Moral: 62% | Barra 62 + "Molesto porque jugó solo seis minutos." |
| Compromiso: 40% | Barra 40 + "No confirmó si llega al partido del lunes." |
| Cuota: pendiente | Chip "Cuota atrasada" + "Debe 3 semanas; dice que la semana que viene." |

El motor **ya genera** estos textos: `PlayerMood` (emoción + frase postpartido),
`CallUpEntry.note` (excusas de convocatoria), comentarios de rating, notas de
`AvailabilityProfile`, timeline personal. La regla de UI es: **si el motor tiene
una frase, la frase va al lado del número** — nunca mostrar la cifra sola.

**Implementado** (`src/game/humanState.ts` + `.human-note`): `playerNotes(state, p)`
deriva frases priorizadas sobre ánimo, banco, cuota, promesas, rachas, físico y
motivación. La card de jugador muestra la más urgente; la ficha las muestra todas.
**💬 El grupo del club** (Dashboard, `.chat-list`): las reacciones del último
partido como chat del vestuario, con retrato y expresión acorde a la emoción
(`EMOTION_EXPRESSION`).

Las notas de relaciones también están: íntimos (🍻), rivalidades (⚡) y relación
con el DT (🧊/👊) salen de las afinidades de `relations.ts`; la agenda personal
(🗓) de los fichados con disponibilidad también aparece como nota. Pendiente:
participación social como nota.

## Anatomía de un evento social

`EventModal` ya implementa los puntos 1-5 y parte de 6-7: ícono por familia
(mapa `EVENT_ICONS`), título narrativo, participantes con retratos
(`.event-people`, con la expresión que pide la situación — y **gorra** en los
eventos festivos: `CAP_EVENTS`), opciones con hint, el **desenlace muestra a los
implicados** y el momento queda **anotado en la historia personal** de cada uno
(`resolveEvent` en `week.ts`). Las **consecuencias diferidas** también están:
`later(s, semanas, nota)` en `events.ts` agenda una `DelayedNote` que
`advanceWeek` comunica semanas después (noticia + ánimo + timeline del
implicado; si el jugador ya se fue del club, la historia muere ahí).

1. **Título narrativo** — con voz propia: "¿Quién compra la carne?", no "Evento de asado".
2. **Ilustración o ícono** — un emoji/ícono grande por familia de evento (🍖 asado,
   🍺 tercer tiempo, 👕 camisetas, 💸 cuotas, 📱 grupo, 🌧 suspensión…).
3. **Participantes** — retratos (`Avatar`) de los jugadores involucrados, clickeables
   hacia su ficha. Un conflicto entre dos jugadores muestra las dos caras.
4. **Contexto breve** — 2-3 líneas con tono de vestuario ("El Gordo dice que pone
   la parrilla, no la carne").
5. **Opciones** — botones con hint de consecuencias **previsibles** ("+ $500",
   "el capitán se lo va a acordar") sin revelar los números internos exactos.
6. **Consecuencias inciertas** — parte del resultado se resuelve después y se
   comunica como reacción, no como tabla de deltas.
7. **Reacciones posteriores** — noticias (`.news-list`), cambios de ánimo visibles
   en las cards y entradas en el timeline de los involucrados.

### Ejemplo de tono

> **¿Quién compra la carne?**
> El asado está confirmado, pero todavía nadie se hizo cargo de las compras.
> El Gordo dice que pone la parrilla, no la carne.
>
> - Pagar parte con la caja del club — *"– $600 de la caja; el grupo lo valora"*
> - Pedir una colaboración extra — *"a los que deben la cuota no les va a gustar"*
> - Encargarle todo al capitán — *"es un favor: los favores se devuelven"*
> - Cancelar el asado — *"plata que se ahorra, ambiente que se enfría"*

## Inventario de eventos a cubrir

Asado · cerveza después del partido · cumpleaños · salida del equipo · discusión en
el grupo · colecta para camisetas · rifa · sponsor aportado por un jugador · jugador
que no paga · jugador que lleva amigos · conflicto por minutos · jugador que se queda
con la camiseta · partido al que varios llegan tarde · figura que falta porque juega
en otra liga · jugador que viene desde el interior · lluvia y suspensión · problemas
para conseguir cancha.

## Reglas visuales

- Los eventos sociales comparten los tokens del juego (ver [DESIGN.md](DESIGN.md)):
  nada de una "piel" distinta que los haga sentir un minijuego aparte.
- Guiños de identidad permitidos: encabezado estilo mensaje de grupo para eventos
  de WhatsApp, textura de planilla para colectas/rifas — siempre sutiles.
- La gorra solo aparece en contextos sociales, nunca en la ficha deportiva.
- Humor por situación y texto, no por caricatura: las caras son las mismas de
  siempre (ver [AVATAR_SYSTEM.md](AVATAR_SYSTEM.md)), lo gracioso es lo que pasa.
