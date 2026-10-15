# BASKET MANAGER — ART BIBLE V1.0
**Estado:** BASE ARTÍSTICA APROBADA POR GABI PARA DESARROLLO (15/10/2026). **Integración UI/HUD: NO AUTORIZADA AÚN.**
**Fuente visual:** imagen aportada por Gabi «Basket Manager: plantel, partido y vida» y lámina «Basket Manager Art Bible V1.0» preparada en la conversación del 15/10/2026. Pedir ambas imágenes al trabajar assets; este documento por sí solo no reemplaza las referencias visuales.

> Esta Art Bible es la fuente de verdad **para los nuevos assets y la futura capa visual**. No implica permiso para cambiar en este momento la UI/HUD existente. La navegación, el motor, la preview y main siguen intactos hasta que se apruebe una implementación incremental.

## 1. Identidad
Manager de **básquet amateur de barrio**, adulto, expresivo y con humor; una comunidad de personas reales e imperfectas. Mundo cálido y cinematográfico, interfaces sobrias de **azul noche**, pinceladas **naranja**, paneles **celestes** y acentos verde. No NBA de lujo, no juego infantil, no dashboard SaaS y no realismo fotográfico.

**Referencias de escenas aprobadas:** (1) «Nuestro plantel» en un vestuario, cinco cartas de personajes y ficha lateral; (2) «Noche de partido», cancha de gimnasio popular, pizarra táctica y rival; (3) «Asado del viernes», interacción social alrededor de parrilla, decisiones de club a la derecha.

## 2. Paleta base propuesta
Colores extraídos **visualmente/aproximados** de la referencia y la lámina de trabajo; sirven como tokens propuestos para futuros assets, **no son medición colorimétrica de una fuente original**. Ajustar contraste, estados y desviaciones pequeñas en el vertical slice. Registrar cambios.

| Token nuevo | HEX | Función |
|---|---|---|
| `--art-navy-950` | `#061C30` | Fondo/estructura HUD |
| `--art-navy-800` | `#0B3A5B` | Paneles oscuros, navegación secundaria |
| `--art-blue-600` | `#14719C` | Contornos luminosos, acentos fríos |
| `--art-sky-100` | `#C4DEF2` | Tarjetas de jugador, áreas informativas |
| `--art-orange-600` | `#FF571C` | CTA prioritario |
| `--art-orange-400` | `#FF8A18` | Selección, iluminaciones |
| `--art-green-500` | `#22D08A` | Estados positivos/energía |
| `--art-yellow-400` | `#FFC857` | Luz escénica/alerta secundaria |
| `--art-cream-100` | `#F4F1E7` | Texto claro y luz de ambiente |
| `--art-slate-300` | `#8FA1B3` | Secundarios y bordes discretos |

### Reglas cromáticas
- El azul noche ordena; el celeste organiza información; el naranja guía la acción. Evitar fondos naranja extensos.
- Las escenas artísticas usan **luz cálida ámbar/naranja** y **sombras azul petróleo**; no deben hacer ilegibles botones ni cifras.
- El verde significa salud/energía/éxito y no debe representar toda la navegación.
- Colores seleccionados por el jugador para su club aparecen en escudo, camiseta, cancha/elementos de identidad y detalles pertinentes; la capa de navegación conserva su jerarquía propia.
- Ningún texto esencial debe depender solamente del color (icono + etiqueta/valor). Comprobar contraste WCAG AA en componentes reales.

## 3. Tipografía
- **Barlow Condensed** de base (ya incluida en el proyecto): ExtraBold/Bold para títulos grandes, SemiBold para títulos de tarjeta y navegación; Medium/Regular para información.
- Alternar tamaño/peso y espaciado, no inventar otras familias. Usar números tabulares en tablas, finanzas y estadísticas.
- Jerarquía: titular corto y contundente, subtítulo explicativo, datos deportivos comparables y CTA inequívoco.
- Texto real como HTML/CSS, no incrustado en ilustraciones. Los carteles diegéticos sí pueden incluir texto ilustrado, revisando legibilidad.

## 4. Personajes
- **Ilustración 2D estilo cómic / película animada**, contorno expresivo oscuro, color plano con luces y sombras marcadas; ligera textura ilustrada, sin fotorrealismo ni 3D.
- Rostros reconocibles de cada individuo: edades 18–60+, diferentes estaturas, tonos de piel, complexiones (delgado, fuerte, robusto, con panza), narices, ojos, barba, pelo y expresiones. Los jugadores NO deben parecer deportistas profesionales idénticos.
- Carisma: un veterano con canas, un ala-pívot robusto, un juvenil despeinado, alguien muy alto, etc. Personalidad y apariencia no son equivalencias rígidas.
- Camisetas coherentes con `club.colors`, sin sponsor inventado ni logos de terceros.
- En fichas, la cara/numero se reconocen a 48 px. En escenografía, interacciones y lenguaje corporal se reconocen a escala mayor.
- Sistema escalable: antes de producir cientos, validar una lámina de 12 retratos; posteriormente comparar método de capas y personajes completos. **No generar masivamente sin validar consistencia y compatibilidad técnica.**

## 5. Ambientes y escenografía
- Gimnasio de barrio y cancha con gradas modestas, luces de techo, parquet cálido; vestuario con camisetas colgadas, banco de madera, termos, bolsos; vida social con parrilla, sillas plásticas, cancha al atardecer.
- Iluminación narrativa cálida contra estructura azul oscuro. Evitar lujo NBA, estadios gigantes y estética corporativa.
- Cada escena deja zonas de baja frecuencia visual para recibir datos y controles; definir composición según pantalla y no reutilizar cualquier ilustración como fondo genérico.
- Assets sin HUD, sin tarjetas y sin texto UI incrustado, para que se puedan adaptar a diferentes tamaños.

## 6. UI/HUD (guía FUTURA, no implementación inmediata)
- Barra horizontal superior navy con identidad Basket Manager, secciones, semana y caja.
- Paneles navy con filetes azul brillante; cards de jugador con base celeste; CTA naranja; estado seleccionado verde/ámbar.
- Pantalla de Plantel: retratos dominantes, tarjeta de detalles y energía/ánimo claros.
- Previa del Partido: cancha como escenario emocional central, esquema de quinteto legible, rival y CTA de juego.
- Vida del Club: escenario social, alternativas de decisión con costes/consecuencias visibles.
- Mantener densidad de manager, accesibilidad y navegación que ya funciona; la referencia ilustra **tono y composición**, no especifica comportamiento responsive o capacidad para 12–21 jugadores.
- **NO alterar actualmente estilos globales, variables actuales, componentes React ni el layout** por el hecho de registrar esta Art Bible.

## 7. Reglas de producción y entrega de assets
1. Primer lote: prueba chica de personajes, después ambientes y finalmente controles gráficos específicos.
2. Cada pedido documenta nombre, rol, pantalla, dimensiones de exportación, encuadre, fondo, recortes, formato, estado de aprobación, fuente y seed/ref si aplica.
3. Retratos: fuente maestra PNG transparente cuando sirva para componer, export WebP con alfa para web (dimensiones a determinar con el componente real).
4. Escenarios: arte sin texto UI, composición widescreen adaptable y WebP optimizado; registrar zonas seguras.
5. Identidad de clubes: escudo y camisetas preferentemente SVG/elementos programáticos para soportar los colores elegidos. Evitar rasterizar todas las combinaciones.
6. Probar assets dentro de preview en varios tamaños antes de sustituir lo existente en masa.
7. Evitar repetir caras, copiar equipos reales o introducir logotipos ajenos.
8. Mantener los retratos actuales y placeholders hasta aprobar los sustitutos.

## 8. Contrato de implementación
- **ChatGPT + Gabi:** dirección de arte, paleta, prompts, aprobación de ilustraciones, entregables.
- **Claude:** auditoría de requisitos técnicos, integración por piezas aprobadas, tests, performance y compatibilidad con saves.
- No tocar `main` y no publicar a producción por esta actualización documental.
- No migrar todo el HUD con base en el concepto sin una orden específica de Gabi.
- La anterior documentación `design/ART_PIPELINE.md`, `design/SISTEMA_VISUAL.md` y `design/UI_V2_PENDIENTES.md` describe decisiones históricas de UI existentes; **para nuevos assets, prevalece esta dirección artística V1.0**. Registrar explícitamente cualquier futura aprobación para cambiar la UI.

## 9. Hitos
- **A0 — Hecho:** registrar dirección y paleta.
- **A1 — Próximo:** generar y aprobar una muestra controlada de 12 jugadores según la referencia original; probar lectura a 48 px.
- **A2:** validar sistema escalable de retratos y producir un lote inicial integrado.
- **A3:** escenas propias de plantel, previa y vida del club, con zonas de interfaz limpias.
- **A4:** identidad visual personalizable de clubes, escudos y camisetas.
- **A5:** revisión, rendimiento y expansión de assets al resto de pantallas.
