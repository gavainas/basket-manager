# Basket Manager V1.0 — Plan de producción artística

**Fecha:** 2026-10-15  
**Estado:** APROBADO COMO PLAN DE TRABAJO por Gabi. Las piezas individuales y su integración requieren validación.  
**Rama documental:** `art/art-bible-v1-2026-10`  
**Referencia normativa:** [ART_BIBLE_V1_2026-10.md](ART_BIBLE_V1_2026-10.md)  
**Objetivo:** completar una primera versión jugable con arte consistente y escalable, sin bloquear el cierre funcional ni reescribir la UI/HUD existente.

## 1. Acuerdo de trabajo y responsabilidades

| Responsable | Función |
|---|---|
| **Gabi** | Produce retratos/personajes con **Layer.ai**; utiliza **Higgsfield** posteriormente para escenarios e ilustraciones; aprueba resultados y prioridades. |
| **ChatGPT** | Dirección de arte, especificaciones por pantalla, diseño del sistema de escudos/camisetas e identidad de clubes, preparación de briefs, definición de entregables y control de consistencia. |
| **Claude** | Desarrollo del juego y cierre funcional, integración de assets aprobados, sistemas procedurales, responsive, optimización, pruebas y control de regresiones. |

**Regla central:** trabajos paralelos. Claude puede terminar gameplay mientras se desarrolla el arte. La UI/HUD y el motor actuales se conservan por ahora. La Art Bible aprobada es la referencia de **nuevos assets y futura evolución visual**, no autorización para sustituir ya todos los estilos.

## 2. Estado de partida: distinguir lo que existe de lo que falta

Lo siguiente es un backlog de producción, no una certificación de que todos los elementos estén ausentes. Antes de crear duplicados, contrastar con `design/UI_V2_PENDIENTES.md`, `design/arte/ASSET_REGISTRY.md`, `public/arte/` y componentes reales. Algunos escenarios existen como reutilizaciones provisionales; ciertos iconos, animaciones y elementos de club ya están programados.

| Área | Punto de partida | Prioridad | Tratamiento |
|---|---|---|---|
| Art Bible y paleta | Dirección V1.0 documentada | Base | Usar referencia y revisar resultados en juego |
| UI/HUD | Funcional, con dirección visual anterior | P1, posterior | No rehacer ahora; evolucionar por pantallas aprobadas |
| Retratos | Existen pocos retratos reutilizados | P0 | Gabi/Layer.ai; validar muestra y pipeline |
| Escudos y camisetas | Ya hay editor preliminar; revisar capacidades | P0 | Diseño y modelo procedural escalable |
| Fondos de pantallas | Hay fondos/escenas provisionales reutilizados | P0 | Inventario, reemplazo selectivo |
| Arte del partido | Ya hay UI de partido y cancha; acabado por revisar | P0 | Jerarquía visual, escena, marcador y recursos |
| Portada | Existe y tiene identidad | P1 | Conservar; evaluar ajuste solo si hace falta |
| Trofeos, vitrina e hitos | Arte propio pendiente por verificar | P1 | Crear según flujo de progresión |
| Íconos y microelementos | Base existente | P2 | Completar faltantes sin reemplazo masivo |
| Animaciones | Algunas ya implementadas | P2 | Pulido selectivo |

## 3. Paquetes de producción

### A — Personajes y retratos (P0, a cargo de Gabi en Layer.ai)

**Meta:** personajes diferentes y consistentes, reconocibles a escala de UI.

- Retratos **frontales mirando a cámara**, cabeza y hombros, encuadre y anclajes uniformes.
- Personas adultas de distintas edades, tonos de piel, rasgos, físico y expresiones; no estereotipos idénticos.
- Mismo lenguaje de ilustración 2D, color y luz que la imagen original «Basket Manager: plantel, partido y vida».
- **Primera entrega:** una muestra de hasta 12 retratos *individuales*, sin títulos ni fichas incrustadas, no un póster como asset final.
- Validar a 48, 96 y 192 px; contrastar con las cartas y el entorno actual.
- Determinar antes de producir en masa si se usarán retratos individuales, variantes/capas o un sistema híbrido. No asumir que las capas generadas con IA encajan automáticamente.
- Registrar origen/modelo, tamaño, recorte, variantes, transparencia y licencia/condiciones de uso relevantes.
- **Salida:** muestra aprobada + brief de exportación e integración para Claude.

### B — Identidad de clubes: escudos y camisetas (P0, ChatGPT especifica; Claude implementa)

**Meta:** el usuario siente que el club creado le pertenece durante toda la partida.

- Auditar el editor existente (nombre, nombre corto, iniciales, barrio, ciudad, cancha, colores y presets).
- Definir familias de escudos y variaciones controladas: geometrías, divisiones, iniciales/símbolos, contorno.
- Definir camisetas local/visitante: colores primario/secundario, cuello, franjas y número; mantener contraste.
- Identidad reproducible desde el estado de guardado: mismo club => mismo escudo y uniforme, sin almacenar cientos de imágenes.
- Preferir SVG/CSS para componentes configurables; no rasterizar cada combinación.
- Mostrar identidad consistentemente en editor, cabecera, plantel, partido, tablas, ficha y enfrentamientos.
- Evitar logos de clubes reales o símbolos de terceros.
- **Primera entrega:** especificación de sistema + 3–4 ejemplos de escudo/camiseta + matriz de reglas/estados para integración.
- **Criterio:** elegir dos combinaciones diferentes y verificar que ambas se mantienen en pantallas principales, incluidas partidas guardadas.

### C — Escenarios (P0, Gabi/Higgsfield; ChatGPT prepara briefs)

**Meta:** cada escena importante tiene composición propia y resulta funcional bajo los datos.

- Prioridad inicial: **Tablero/gimnasio**, **Previa/partido/cancha**, **Vida del club/asado**.
- Segunda tanda: vestuario/plantel, pretemporada/mercado, liga/calendario, finanzas/club, cierre e historia.
- Antes de producir, registrar qué ilustración ya existe, cuál es provisional y qué pantalla realmente la necesita.
- Brief por escena con encuadre, proporción, zonas limpias para UI, iluminación, personajes o ausencia de estos, variante responsive, nombre de archivo y formato WebP optimizado.
- **No incrustar botones, estadísticas ni HUD dentro de la ilustración**; esos elementos los renderiza el juego.
- **Salida:** backgrounds separados, editables/reemplazables, aprobados uno a uno en preview.

### D — Visualización del partido (P0, ChatGPT especifica; Claude implementa)

**Meta:** que el partido sea el clímax semanal.

- Conservar la lógica de partido y opciones existentes.
- Revisar la escena y cancha, armado del quinteto/rotación, marcador en vivo, rival, estado de jugadores, eventos destacados, desenlace e informe.
- Asegurar identificación del propio club por escudo/camiseta y del rival, sin interferir en las decisiones.
- Priorizar legibilidad de información y controles; animaciones ligeras después.
- **Salida:** diseño aprobado de previa y de partido en vivo, assets necesarios e implementación controlada.

### E — Trofeos, progresión, iconografía y acabado (P1/P2)

- Trofeos, ascensos, récords, placas de historia y momentos memorables cuando esos datos existan.
- Completar iconos o estados realmente faltantes; aprovechar componentes actuales.
- Motion/pulido de selección, quinteto, cambios del partido y cierres después del flujo principal.
- **Salida:** paquete complementario consistente con la Art Bible.

## 4. Orden ejecutivo y dependencias

1. **Ahora, en paralelo:** Claude cierra jugabilidad; Gabi hace muestra frontal de personajes en Layer.ai; ChatGPT diseña el sistema de identidad de clubes.
2. **Primera validación en preview:** identidad de clubes + pocos retratos aprobados, sin tocar el resto de pantallas.
3. **Escenarios P0:** briefs y producción selectiva en Higgsfield (no antes de revisar existentes).
4. **Partido P0:** integración artística de previa, partido en vivo e informe; mantenerlo como núcleo de la experiencia.
5. **Expansión:** otros escenarios, historia/trofeos, acabados, motion, control de calidad.
6. **Release candidate:** revisión de visuales, carga, responsive, guardados y flujo completo antes de considerar merge.

El orden permite solapamientos: una dependencia artística no debe frenar la corrección de bugs funcionales.

## 5. Inventario y trazabilidad mínima por asset

Cada asset nuevo debe tener ficha en el registro o en un brief vinculado:

| Campo | Requerido |
|---|---|
| Identificador y pantalla | Sí |
| Responsable y herramienta | Sí |
| Referencia de estilo y prompt/receta | Sí |
| Dimensión/orientación y área segura | Sí |
| Formato y transparencia | Sí |
| Archivo exportado y ubicación esperada | Sí |
| Estado: pendiente / muestra / aprobado / integrado | Sí |
| Validación in-game (resoluciones y legibilidad) | Sí |

**Evitar producción masiva antes de aprobar una muestra pequeña.** No marcar algo «integrado» solo porque existe una ilustración.

## 6. Definición de terminado para V1.0 artística

- Los nuevos assets respetan la Art Bible acordada y no introducen estilos visuales contradictorios.
- Cada pantalla principal tiene identidad visual propia o un uso deliberado/documentado de arte compartido.
- Los retratos no se repiten de manera evidente en el plantel de ejemplo y son reconocibles en tarjetas pequeñas.
- El escudo, los colores y la camiseta elegidos persisten y aparecen donde corresponde.
- Previa, partido e informe son claros, emocionantes y coherentes visualmente.
- UI y textos conservan legibilidad, contraste y controles accesibles.
- Rendimiento y guardados no sufren regresiones por integrar imágenes.
- Test visual en preview, no solo aprobación aislada de láminas.

## 7. Normas de seguridad del proyecto

- No cambiar `main` ni publicar la preview desde este documento.
- No reescribir la UI/HUD existente por iniciativa propia.
- No duplicar funcionalidades ni assets existentes sin auditar.
- Claude integra arte **solo cuando el asset está aprobado**.
- Toda sustitución importante va en rama/PR y se prueba antes de mezclar.
- El calendario depende de resultados y validación; no prometer fechas sin estimaciones de esfuerzo.

## 8. Próxima acción inmediata

**ChatGPT:** proponer especificación concreta del editor de escudos y camisetas a partir del código actual y preparar los primeros ejemplos.  
**Gabi:** producir los primeros retratos frontales en Layer.ai.  
**Claude:** continuar con el plan de cierre funcional y reportar requerimientos técnicos para incorporar assets.

**Nota de coordinación:** la rama `art/art-bible-v1-2026-10` contiene la Art Bible y este plan. Claude debe consultarlos explícitamente; no se integran automáticamente a su rama de trabajo.
