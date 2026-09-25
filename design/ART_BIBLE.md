# Art Bible — Basket Manager

> **Estado: v0.1 — dirección visual aprobada, pendiente de validación en vertical slice.**
>
> Esta Art Bible reúne la dirección elegida por Gabi en la revisión de arte de septiembre de 2026.
> Desde esta versión, ante una contradicción de dirección artística con documentación anterior,
> **manda este documento**. `SISTEMA_VISUAL.md` sigue siendo útil para reglas técnicas y componentes
> ya implementados, pero su paleta clara/crema no define por sí sola la dirección artística futura.

## 1. Visión visual

**Basket Manager es un manager de básquet amateur donde el partido importa porque detrás hay un club,
un grupo de personas y un barrio.**

Debe sentirse:

- humano, adulto y cercano;
- competitivo pero imperfecto;
- claramente videojuego, no dashboard SaaS;
- amateur en personalidad y profesional en legibilidad;
- montevideano/rioplatense en espíritu, sin depender de copiar lugares reales;
- con humor y calidez, sin caer en caricatura infantil.

La fantasía visual central es: **gestionar personas y un club para llegar bien al partido**.

## 2. Referencias maestras aprobadas

Las seis láminas de la charla **“Revisión de arte”** son las referencias visuales de nivel 1
y definen el producto completo:

1. **Inicio y Club** — pertenencia, primera impresión y modos de partida.
2. **La Semana** — preparación, problemas, decisiones y próximo partido.
3. **Las Personas** — plantel, ficha, vestuario y cuerpo técnico.
4. **Armar la Temporada** — mercado, pretemporada, liga y calendario.
5. **El Partido es el Centro** — previa, quinteto, partido en vivo y postpartido.
6. **Competir y Sostener el Club** — liga, rankings, finanzas e historia.

Estas referencias mandan sobre la relación entre UI, ilustración, composición y tono.

### Referencias secundarias aprobadas

Dos ilustraciones adicionales aprobadas por Gabi se usan como guía de **mundo, tono social,
variedad corporal e iluminación cálida**:

- **Vestuario amateur**: lockers gastados, bolsos, botellas, ropa, cuerpos imperfectos,
  edades distintas, discusión y convivencia.
- **Asado del club**: parrilla, comida, mesas, botellas, camisetas históricas, fotos viejas,
  cancha visible, camaradería y club social.

No reemplazan las seis láminas maestras: las complementan.

## 3. ADN visual

Aunque se quite el logo, Basket Manager debería seguir siendo reconocible por esta combinación:

- azul noche / grafito como base de interfaz;
- naranja concentrado como color de acción;
- luz cálida en el mundo ilustrado;
- tipografía condensada deportiva;
- personajes 2D adultos y expresivos;
- instalaciones de club vividas y algo gastadas;
- densidad informativa de manager;
- cartelería, notas y escritura manual dentro del mundo;
- contraste entre **UI ordenada/fría** y **mundo humano/cálido**.

## 4. Color

### Paleta A — Nocturna (dirección principal)

| Rol | Color base | Uso |
| --- | --- | --- |
| Fondo profundo | `#081D2D` | Fondo general / chrome |
| Azul interfaz | `#102C40` | Paneles principales |
| Panel elevado | `#17384B` | Cards / superficies secundarias |
| Línea / borde | `#456477` | Filetes y separación |
| Texto principal | `#F3F0E8` | Títulos y lectura |
| Texto secundario | `#AEBCC4` | Metadatos |
| Naranja acción | `#F47C27` | CTA, foco, tab activo |
| Verde positivo | `#54D29A` | Estados positivos |
| Amarillo alerta | `#E4B94B` | Riesgo / advertencia |
| Rojo problema | `#E35B4F` | Error / conflicto |

Regla: el naranja no es decoración. Se reserva para **acción, selección o dato clave**.

### Paleta B — Club cálido (alternativa a validar)

Inspirada en las referencias de vestuario y asado.

| Rol | Color base |
| --- | --- |
| Marrón profundo | `#44271C` |
| Terracota | `#9A4F2E` |
| Naranja quemado | `#D56E2A` |
| Ámbar luz | `#F0A341` |
| Crema pared | `#E6BB77` |
| Verde botella | `#31563B` |
| Azul camiseta | `#294D69` |
| Bordó | `#71353A` |
| Carbón | `#252524` |

**Estado:** alternativa, no tema aprobado. Debe probarse en **Tablero + Vestuario** contra la
Paleta A antes de decidir si pasa a UI o queda sólo como lenguaje ambiental.

## 5. Iluminación

Regla principal: **UI fría + mundo cálido**.

Fuentes de luz válidas:

- tubos y lámparas de vestuario;
- luz de cantina;
- parrilla;
- puesta de sol;
- reflectores de cancha;
- ventanas del gimnasio.

El naranja puede vivir naturalmente en la ilustración como luz; en la UI sigue siendo acento.

## 6. Tipografía y lenguaje gráfico

Tres voces:

1. **Display** — condensada, pesada, deportiva: títulos, marcador, nombres de pantalla.
2. **UI** — sans clara y eficiente: tablas, navegación, datos.
3. **Mundo** — manuscrita: carteles, notas, pizarras y frases del club.

La voz manuscrita rompe la sensación de software. Debe usarse con moderación.

## 7. UI y composición

La UI debe sentirse integrada al mundo, no apoyada sobre un fondo decorativo.

La especificación operativa de este apartado vive en [`GAME_UI_SYSTEM.md`](GAME_UI_SYSTEM.md),
que traduce estas reglas a patrones reutilizables de navegación, títulos, chips, paneles, stats,
tablas, botones y HUD.

Reglas:

- paneles oscuros, legibles, con borde fino y profundidad contenida;
- alta densidad de datos con jerarquía clara;
- un CTA principal por pantalla;
- tablas y listas pueden dominar cuando la tarea lo exige;
- la ilustración debe conservar suficiente superficie visible para construir mundo;
- evitar llenar toda la pantalla con cards idénticas.

### Patrones de composición

- **Split**: datos a un lado / personaje o escena al otro.
- **Fondo ambiental**: escenario completo detrás de paneles.
- **Hero**: escena protagonista + información secundaria.
- **Management puro**: tabla dominante + ambientación lateral o de fondo.

## 8. Mundo y escenarios

### Cancha
Club o gimnasio municipal, parquet usado, tribuna chica, cercanía con el público.

### Vestuario
Lockers usados, bolsos, botellas, camisetas, toallas, ropa, vendas y desorden creíble.
La escena debe mostrar convivencia, tensión y humor.

### Cantina / asado
Parrilla, comida, mesas, botellas, fotos viejas, camisetas históricas y conversación.
Es una parte central del mundo social del juego.

### Oficina / comisión
Improvisada, funcional y barrial. Nunca oficina corporativa premium.

### Barrio
Montevideo sugerido por arquitectura, cartelería y clima urbano, sin depender de monumentos.

### Tribuna
Familiares, amigos, socios y conocidos. No estadio profesional.

## 9. Personajes

Regla: **no diseñar jugadores NBA y después ponerles una camiseta amateur**.

Debe existir variedad real de:

- edad;
- altura y contextura;
- flacos, robustos, musculosos y jugadores con panza;
- pelo, barba, canas, entradas y calvicie;
- prolijos y desprolijos;
- personalidad y postura corporal.

El estilo es **ilustración 2D adulta**, expresiva y cálida. No fotográfico, no infantil,
no Bitmoji, no stock corporativo.

### Lenguaje corporal y emociones

Estados que deben poder leerse:

- entusiasmo;
- agotamiento;
- bronca;
- frustración;
- confianza;
- nervios;
- festejo;
- camaradería;
- discusión;
- indiferencia.

### Tres escalas de representación

- **S — lista**: cara reconocible.
- **M — card**: cabeza/torso + expresión.
- **L — ficha/narrativa**: medio cuerpo o cuerpo entero.

## 10. Indumentaria

En partido: equipación del club.

Fuera del partido: musculosa, remera, buzo, jogging, campera, ropa de entrenamiento.
La ropa también comunica personalidad y situación.

## 11. Clubes, camisetas y escudos

- clubes ficticios pero creíbles;
- escudos simples y legibles;
- colores de club aplicados a camiseta y escudo, no al chrome global;
- elementos que escalan con muchos clubes deben seguir siendo procedurales cuando convenga;
- evitar branding de franquicia profesional.

## 12. Props y storytelling ambiental

Objetos con valor narrativo:

- bolsos;
- botellas;
- vendas;
- pelotas;
- pizarras;
- termos;
- papeles;
- trofeos viejos;
- fotos de equipo;
- carteles hechos a mano;
- parrilla;
- camisetas colgadas.

No agregar utilería sólo para “ensuciar”: cada objeto debe reforzar club, básquet o vida social.

## 13. Texturas y materiales

Permitidos:

- ladrillo;
- cemento pintado;
- madera;
- parquet;
- metal;
- papel;
- cinta adhesiva;
- tela;
- pintura desgastada.

La textura debe aportar materia sin perjudicar la lectura.

## 14. Iconografía

- simple;
- lineal;
- consistente;
- secundaria frente a texto y personajes;
- sin emojis como lenguaje principal;
- sin iconografía 3D brillante o de mobile game.

## 15. Motion y feedback

La animación debe aportar vida y lectura, no transformar el juego en arcade.

Prioridades:

- hover y selección;
- cambio de estado;
- tensión de reloj;
- triple o jugada importante;
- sustituciones;
- resultado final;
- pequeñas reacciones humanas.

## 16. Escritura dentro del mundo

Frases y carteles pueden aportar identidad (“El barrio también juega”, “Acá también se sueña”),
pero deben ser pocos, contextuales y memorables. No llenar cada pared de slogans.

## 17. DO / DON'T

### DO

- club vivido;
- personas diferentes;
- iluminación cálida;
- escenarios con historia;
- UI oscura legible;
- humor sutil;
- básquet amateur;
- relación visible entre deporte y vida social.

### DON'T

- NBA genérica;
- estética SaaS;
- mobile game;
- neón gamer;
- Bitmoji;
- personajes perfectos;
- stock illustration;
- cartoon infantil;
- pantallas hechas sólo de cards;
- fondos decorativos sin función narrativa.

## 18. Jerarquía de referencias

### Tier 1 — Referencias maestras
Las seis láminas de “Revisión de arte”. Determinan producto, UI, composición y lenguaje general.

### Tier 2 — Mundo y tono humano
Vestuario + asado. Determinan vida social, variedad corporal, utilería e iluminación cálida.

### Tier 3 — Exploraciones
Todo resultado nuevo de Higgsfield, Layer u otra herramienta.
**No es canon hasta aprobación explícita.**

## 19. Pipeline de producción

### Higgsfield
Escenas, fondos, concept art, key art, personajes hero y exploraciones de ambiente.

### Layer
Retratos, expresiones, variaciones consistentes y producción sistemática de personajes.

### Código
UI, datos, composición, estados, integración, adaptación y optimización.

### Regla
**Exploración → Candidato → Aprobado → Producción.**

Nada se produce en masa antes de aprobarlo en pequeño.

## 20. Vertical slice para cerrar la Art Bible

Cinco experiencias:

1. Tablero.
2. Ficha de jugador.
3. Vestuario.
4. Previa / partido.
5. Postpartido.

Para validar la **Paleta B**, alcanza con probar primero **Tablero + Vestuario** contra la
Paleta A.

### Criterios de salida

- se siente videojuego, no app;
- las personas pertenecen claramente al mismo universo;
- UI y arte conviven sin competir;
- la identidad amateur se entiende sin explicación;
- funciona en el juego real, no sólo como mockup;
- Gabi aprueba explícitamente el conjunto.

Una vez validado ese vertical slice, esta v0.1 pasa a una versión congelada de producción.

## Registro

### 2026-09-25 — UI: shell nocturno + paneles gris perla

- La Paleta A entera en la UI quedó demasiado oscura; el crema cansaba. Gabi aprobó una
  híbrida: **shell y títulos en azul noche (Paleta A), paneles de datos gris perla claro
  y frío**. Detalle y valores en `GAME_UI_SYSTEM.md` §22.
- La regla "UI fría + mundo cálido" se mantiene: el gris perla es frío; lo cálido sigue en
  la ilustración.

### 2026-09-23 — Art Bible v0.1

- **Aprobado:** las seis láminas de “Revisión de arte” como referencias maestras.
- **Aprobado:** las ilustraciones de vestuario y asado como referencias secundarias.
- **Aprobado:** Paleta A como dirección principal.
- **Pendiente de prueba:** Paleta B “Club cálido”.
- **No autorizado todavía:** producción masiva de personajes, fondos o pantallas.
- **Próximo paso:** vertical slice y prueba A/B de color en Tablero + Vestuario.
