# Art Bible — Basket Manager

Documento de **reglas**, no de exploración. Acá entra solo lo que Gabi aprobó
explícitamente; lo que todavía se está decidiendo queda marcado como **abierto**.

Las exploraciones viven en [`art/`](art/) y [`references/`](references/); las reglas de
proceso y las puertas de aprobación, en [`ART_PIPELINE.md`](ART_PIPELINE.md).

> **Estado**: en construcción. La Puerta 1 (dirección artística) está cerrada.
> Faltan tipografía, sistema de íconos y el vertical slice.

---

## 0. Plataforma

**Juego web/PC**, en la tradición de PC Fútbol: pantalla ancha, densidad alta, mucha
información por vista. Se prueba también desde el celular y **no debe romperse** ahí,
pero el diseño se piensa para desktop primero.

Consecuencias de diseño:

- El layout **16:9 es el objetivo principal**, no una versión a adaptar.
- Los íconos viven a **64-80 px**, no a 40: las mini-escenas ilustradas son viables.
- La tipografía puede ser **más chica y más densa** que en un diseño mobile-first.
- El responsive es **robustez**, no dirección: que entre en el celular, no que nazca ahí.

## 1. Identidad

> Manager de básquet amateur adulto, humano, divertido y nostálgico.
> **Profesional en usabilidad, amateur en personalidad.**
> No infantil, no corporativo, no una copia literal de Football Manager.

La frase del medio no es decorativa: es la regla que resolvió las tres correcciones de
la Puerta 1. Cada vez que una decisión visual dude, se resuelve preguntando de qué lado
cae — la **interfaz** es la parte profesional, el **mundo del club** es la parte amateur.

---

## 2. Dirección aprobada (2026-08, Puerta 1)

Aprobada sobre el menú principal generado en la iteración v5
([`art/prompts/menu-principal.md`](art/prompts/menu-principal.md)).

**Qué se aprobó:**

- **Estructura de hub**: bloque central de identidad del club, opciones agrupadas en
  cuatro familias temáticas, rail vertical de utilidades, tira de plantel al pie.
  Herencia declarada: PC Fútbol / ProManager — un **tablero físico**, no un árbol de
  software. Es lo contrario del menú lateral de Football Manager.
- **Paleta**: madera de gimnasio cálida como fondo del mundo, interfaz en azul pizarra
  profundo y paneles claros fríos, naranja quemado como acción.
- **Contraste UI / mundo**: interfaz limpia y contemporánea; el mundo del club, gastado.

**Qué quedó abierto para corregir:** tipografía (§4) y sistema de íconos (§5).

---

## 3. Paleta

> **Nota**: los valores están estimados a ojo desde la imagen aprobada. Cuando el PNG
> original esté en `references/`, se muestrean exactos y se corrige esta tabla.

| Rol | Valor aprox. | Uso |
| --- | --- | --- |
| `shell` | `#17263A` | Marco, rail izquierdo, fondo de la carcasa |
| `panel-dark` | `#1C2E44` | Bloques oscuros (caja, franja del partido) |
| `card` | `#F7F7F5` | Superficie de las cards — blanco frío, **nunca crema** |
| `ink` | `#23272E` | Texto sobre claro |
| `bone` | `#F0EDE8` | Texto sobre oscuro |
| `accent` | `#E8641C` | Acción principal (Avanzar semana), números destacados |
| `petrol` | `#1E5F7A` | Familia de headers fríos (La Semana, La Liga) |
| `brick` | `#A94A18` | Familia de headers cálidos (El Plantel, La Caja) |
| `wood` | `#C88A3E` | Piso del gimnasio: el único gran cálido |
| `wood-dark` | `#8E5C22` | Sombra y vetas del piso |

**Continuidad**: el naranja aprobado está muy cerca del `--accent: #f08c2e` que el juego
ya usa hoy. La dirección elegida **no obliga a tirar los tokens actuales**, los corrige.

### Reglas de color

- **Un ancla oscura siempre.** La composición necesita un valor genuinamente oscuro que
  la sostenga. Sin eso, cualquier paleta clara se lee como juguete.
- **Nada de codificar categorías con cuatro hues saturados.** Los headers comparten
  familia; se distinguen por ícono y etiqueta, no por cuatro primarios.
- **Los paneles claros son fríos**, nunca crema, beige, tostado ni pergamino.
- **Un solo cálido grande**: la madera. Todo lo demás cálido es acento.

---

## 4. Tipografía — **ABIERTO**

Nada decidido. La tipografía de las imágenes generadas **no existe como fuente**: son
formas de letra dibujadas por el modelo. Hay que elegir archivos reales.

**Requisitos**, que salen de cómo es el juego y no del gusto:

- **Cifras tabulares de verdad**: la mitad del juego son columnas de números.
- **Condensada y pesada para títulos**: permite densidad alta, que es lo que buscamos.
- **Licencia libre y auto-alojable**: se sirve desde el repo (GitHub Pages, sin CDN).
- **Buena en cuerpos chicos de desktop** (13-14 px), que es donde vive la densidad; y
  que aguante el celular sin romperse.
- **Una tercera voz manuscrita**, opcional, solo para lo humano (las excusas anotadas,
  las notas del vestuario). Nunca para datos.

Prohibido: letras redondeadas tipo burbuja, contornos de dibujito, sombras blandas.

---

## 5. Íconos — **ABIERTO**

El set actual (mini-escenas casi fotográficas generadas por IA) **no se aprueba**, por
dos razones:

1. **Registro inconsistente**: algunas parecen foto, otras ilustración. Este es el
   problema principal.
2. **Silueta poco definida**: aun a 64-80 px de desktop, varias se leen como una mancha
   marrón hasta que uno se acerca. Necesitan formas más simples y más contraste interno.

*(La objeción original era más dura — "a 40 px son ilegibles" — pero salía de suponer
mobile-first. En desktop las mini-escenas ilustradas son perfectamente viables; lo que
no es viable es que cada una esté en un registro distinto.)*

Lo que sí se conserva del set actual es **el repertorio de objetos**, que está bien
elegido y es genuinamente del mundo del club: la planilla con tildes y cruces, la
pizarra táctica, el tablero electrónico, los lockers, el apretón de manos, la tabla
impresa, el calendario, la camiseta rival, la caja de lata, el silbato con los recibos,
el talonario de rifa.

Regla del pipeline: **aprobar 3 íconos antes de producir 12.**

---

## 6. Reglas transversales aprendidas en la Puerta 1

Estas tres salieron de correcciones concretas de Gabi y valen para **todas** las
pantallas, no solo para el menú:

### El desgaste va adentro de los objetos, nunca sobre la interfaz

La planilla puede estar ajada; la card que la contiene, no. Cuando el desgaste se
derrama sobre el chrome, aparece el lavado sepia uniforme — una de las firmas de IA más
reconocibles — y se pierden las dos mitades de la identidad de golpe.

### Lo adulto no lo da la oscuridad: lo dan el ancla de valor y el desgaste

Una pantalla soleada y clarísima puede leerse perfectamente adulta si los colores están
contenidos, hay algo genuinamente oscuro sosteniendo la composición y las cosas parecen
usadas. Confundir *alegre* con *saturado* fue lo que hizo que una iteración se leyera
como juego de niños.

### Se caricaturizan los personajes; la interfaz no

El humor entra por las ilustraciones y los detalles chicos — las excusas en la planilla,
la media sola en el vestuario, el vale por dos cuotas en la caja de lata. Si todo grita,
no hay chiste y encima no se lee. Es lo que hace que la broma aguante hasta la fecha 40
en vez de cansar en la 3.

---

## 7. Prohibiciones

Heredadas del brief y confirmadas por lo que fue apareciendo en las iteraciones:

- Estética mobile genérica y minimalismo de app.
- Avatares tipo Bitmoji; personajes infantiles.
- Un plantel donde todos son atletas profesionales.
- Exceso de emojis; exceso de neón; estética SaaS corporativa.
- Clichés deportivos como decoración constante.
- **Identidad de clubes reales** (escudos, colores, nombres). Se coló dos veces desde
  las referencias de PC Fútbol: vigilar en cada generación.
- **Vocabulario futbolero** heredado de las referencias (Alineación, Ver rival, Estadio,
  Fichar, Empleados). Este juego tiene sus propias pantallas.
- Lavado sepia / pergamino / envejecido uniforme.

---

## 8. Pendiente

- [ ] Muestrear la paleta exacta desde el PNG aprobado.
- [ ] Elegir tipografías (§4) y probarlas renderizadas, no descritas.
- [ ] Aprobar 3 íconos de muestra antes de producir el set (§5).
- [ ] Hoja de 12 personajes (Puerta 3).
- [ ] Vertical slice de 5 pantallas (Puerta 4) e implementación de prueba (Puerta 5).
- [ ] Verificar que el layout 16:9 **no se rompa** en pantallas chicas (robustez, no
      rediseño: ver §0).
