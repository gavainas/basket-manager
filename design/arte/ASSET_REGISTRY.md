# Asset registry — Basket Manager

> Registro de assets pedido en `GAME_UI_SYSTEM.md` §17, con fichas en el formato de §16.
> Lo mantiene Claude (lo que está en el repo y cómo se integra) y lo usa ChatGPT (qué falta,
> briefs, aprobación). Última revisión: 2026-09-25.
>
> Estados (§17): `exploration` · `candidate` · `approved` · `integrated` · `deprecated`.
> Para lo que falta se usa además `needed` (hay que producirlo).

## Reglas técnicas (para todo asset nuevo)

- **Formato:** WebP. Fondos 1920×1080 (16:9), calidad ~85, **≤ 250 KB**. Retratos 512×512.
- **Entrada al repo:** siempre por git local (Claude). Los conectores web truncaron dos veces
  `vestuario-bg.webp` (§16). Claude verifica tamaño = encabezado RIFF + 8 y que Chromium lo
  decodifique antes de commitear.
- **Dónde:** fondos de pantalla en `public/arte/` (`bg-*.webp`); el arte que importa un
  componente puede ir en `src/assets/`.
- **Resoluciones de verificación:** 1440×900 y 1366×768 (§19). La UI tapa zonas fijas: la barra
  superior (≈55 px), el HUD inferior (≈68 px) y los paneles; cada ficha dice qué zona queda libre.
- **Paleta y tono:** Art Bible §4–§5 — mundo cálido (luz de tubos, cantina, reflectores) detrás de
  UI fría (azul noche + paneles gris perla). Nada de UI dibujada en la imagen.

---

## 1. Lo que ya está en el repo

| Archivo | Tamaño | Dónde se usa | Estado | Notas |
|---|---|---|---|---|
| `src/assets/vestuario-bg.webp` | 1279×720 | Plantel → Vestuario (SCENE-A, Variante C) | **integrated** · approved | Franja libre arriba (~28 %). Referencia del patrón. |
| `public/arte/fondo-cancha.webp` | 1920×1072 | Fondo global de la app, con velo azul noche | integrated | Pre-Art Bible. Queda tapado casi entero por paneles; sirve de atmósfera. |
| `public/arte/fondo-gimnasio.webp` | 1920×1072 | Escena 3 de la intro de Carrera | integrated | Candidato a base de `bg-partido` si ChatGPT lo aprueba. |
| `public/arte/cab-vestuario.webp` | 1600×893 | Tablero (escena dentro de la card del próximo partido); Pretemporada | integrated | Estilo previo a la Art Bible (personajes caricaturescos). Revisar contra §9. |
| `public/arte/cab-comision.webp` | 1280×714 | Pretemporada (cabecera "Inscripción") | integrated | Pre-Art Bible. |
| `public/arte/cab-bar.webp` | 1600×893 | Pretemporada (mercado); intro Carrera | integrated | Pre-Art Bible. |
| `public/arte/cab-derrota.webp` | 1280×714 | Intro de Carrera (escena 1) | integrated | Pre-Art Bible. |
| `public/arte/cab-partido.webp` | 1280×714 | — | candidate | **En el repo, sin uso.** |
| `public/arte/cab-arbitros.webp` | 1280×714 | — | candidate | **En el repo, sin uso.** |
| `public/arte/p-*.webp` (8) | 512×512 | Retratos de jugador por arquetipo (`Avatar.tsx`) | integrated | Sólo 8 caras para todo el plantel y el mundo: se repiten. Ver `design/AVATAR_SYSTEM.md`. |
| `public/portada.webp` | 2048×2048 | Portada / menú principal | integrated | Asado del club. |
| `public/arte/portada-menu-central/*` | — | Accesos de la portada (continuar, nueva, gestionar) | integrated | Hay PNG y WebP de cada uno; el juego usa los WebP. |
| `design/arte/referencias/ui-final-partido-centro.png` | 1536×1024 | Referencia maestra de UI (lámina 05) | approved (referencia) | No es asset del juego. |
| `design/arte/referencias/2026-09-09-partido.png` | — | Referencia anterior del partido | deprecated (referencia) | Paneles crema; reemplazada por la lámina 05. |

**Escudos** e **íconos** no son assets: los escudos son procedurales (`Crest.tsx`) y los íconos
son SVG lineales (`Icon.tsx`), como pide la Art Bible §11 y §14.

---

## 2. Lo que falta — por prioridad

Prioridad según `GAME_UI_SYSTEM.md` §18 fase 3 (Tablero → Plantel → Vestuario → Previa →
Quinteto → Partido → Postpartido) y el peso de cada pantalla en la sensación de "juego".

### P1 — las que más cambian la sensación

```yaml
id: bg-tablero-v01
screen: Tablero
pattern: SCENE-C            # escena completa detrás de módulos
status: needed
escena: sede del club / oficina de la comisión con ventana a la cancha; cartelera con el
        fixture, termo, planillas, camisetas colgadas. Tarde, luz cálida de tubo + ventana.
safe_zone: centro y derecha libres de detalle fino (van 3 módulos: próximo partido,
           "¿Cómo llegamos?", último partido) y franja inferior (tira del plantel)
focal_point: izquierda / arriba-izquierda (queda visible sobre el título de pantalla)
ui_overlay: high            # la mayoría de la imagen queda detrás de paneles
crop: 16:9, se recorta por los costados en 1366; nada importante a <8 % de los bordes
desktop_target: 1440x900
notas: reemplaza la escena del vestuario encerrada en una card (hoy el Tablero repite la
       ilustración del Vestuario).
```

```yaml
id: bg-previa-v01
screen: Partidos → La semana / Previa (y encabezado del partido)
pattern: SCENE-C
status: needed
escena: gimnasio de club antes del partido, tribuna chica llenándose, banderas del barrio
        ("El barrio también juega" como cartel hecho a mano, Art Bible §16), reflectores.
        Referencia: lámina 05, cuadro 17 "La previa".
safe_zone: franja central horizontal (panel "Próximo partido" con los dos escudos) y tercio
           inferior (plantel disponible, claves, CTA)
focal_point: tribuna y carteles a los costados; centro más calmo
ui_overlay: medium
crop: 16:9
desktop_target: 1440x900
```

```yaml
id: bg-partido-v01
screen: Partido en vivo
pattern: SCENE-C
status: needed
escena: cancha desde arriba de la tribuna, partido en juego, público de barrio (familias,
        amigos), marcador de club. Lámina 05, cuadro 19. Puede partir de fondo-gimnasio.webp.
safe_zone: casi todo: marcador arriba al centro, listas de jugadores a izquierda y derecha,
           cancha táctica y relato al centro. La escena se ve en los márgenes y entre módulos.
focal_point: tribuna arriba (queda visible entre la barra superior y el marcador)
ui_overlay: high
crop: 16:9
desktop_target: 1440x900
```

```yaml
id: bg-postpartido-victoria-v01
screen: Partidos → Informe (resultado a favor)
pattern: SCENE-B / hero     # escena protagonista + información
status: needed
escena: festejo en la cancha o saliendo al vestuario: abrazos, toalla, DT con buzo, cuerpos
        diversos (Art Bible §9). Lámina 05, cuadro 20.
safe_zone: mitad derecha (resultado, figura del partido, estadísticas) y franja inferior
           (vestuario, momentos clave, CTA)
focal_point: izquierda
ui_overlay: medium
crop: 16:9
desktop_target: 1440x900
```

```yaml
id: bg-postpartido-derrota-v01
screen: Partidos → Informe (resultado en contra)
pattern: SCENE-B / hero
status: needed
escena: mismo encuadre que la victoria pero en derrota: banco callado, alguien sentado con la
        cabeza gacha, otro que consuela; sin dramatismo excesivo, humor sutil posible.
safe_zone: igual que la victoria (misma composición para reusar el layout)
focal_point: izquierda
ui_overlay: medium
crop: 16:9
desktop_target: 1440x900
notas: cab-derrota.webp puede servir de punto de partida para el tono.
```

### P2 — pantallas sociales y de club (SCENE-A, franja libre como el Vestuario)

Misma receta que `vestuario-bg.webp`: 16:9, la franja visible es el **20–30 % superior**
(≈ 470 px de alto de ilustración que se funde abajo). El foco tiene que caer en esa franja;
el resto queda detrás del panel.

| id | Pantalla | Escena | Foco en la franja |
|---|---|---|---|
| `bg-club-v01` | El club | Sede/cantina: barra, fotos viejas, camisetas históricas, trofeos chicos | Barra y pared de fotos |
| `bg-historia-v01` | Historia | Vitrina de trofeos y fotos de planteles de otras épocas, papel amarillento | La vitrina |
| `bg-cuerpo-tecnico-v01` | Plantel → Cuerpo técnico | Banco de suplentes / pizarra táctica con marcador, bolso de pelotas | Pizarra |
| `bg-quinteto-v01` | Quinteto y táctica | Vestuario con la pizarra antes de salir (puede ser un recorte de `vestuario-bg`) | Pizarra y lockers |

### P3 — management first (SCENE-D, arte lateral o de fondo)

| id | Pantalla | Escena | Notas |
|---|---|---|---|
| `bg-liga-v01` | Liga / Calendario / Rankings | Cartelera del club con el fixture y recortes de diario | Sólo se ve en los márgenes; densidad primero |
| `bg-finanzas-v01` | Finanzas | Mesa de la comisión: talonario de rifa, caja, cuaderno de cuotas | Idem; evitar look fintech (§15) |

### Personajes y marca

| id | Qué | Estado | Notas |
|---|---|---|---|
| `retratos-v02` | Más variedad de retratos (edad, contextura, pelo, barba) | needed | Hoy 8 caras para todos. Pipeline Layer (Art Bible §19) y `design/AVATAR_SYSTEM.md`. Escalas S/M/L (§9). |
| `logo-v01` | Logo de "Básquet Manager Amateur" | needed | La portada usa texto porque no hay logo (Portada.tsx). |
| `fuente-mundo` | Tercera voz tipográfica: manuscrita para pizarras y carteles (Art Bible §6) | needed (decisión) | Elegir una fuente OFL; Claude la empaqueta como Barlow. |

### Revisión de lo existente contra la Art Bible

`cab-vestuario`, `cab-comision`, `cab-bar`, `cab-derrota`, `cab-partido`, `cab-arbitros` y los
8 retratos son **anteriores a la Art Bible** (personajes más caricaturescos que el "2D adulto"
de §9). ChatGPT decide cuáles quedan `approved`, cuáles pasan a `deprecated` y cuáles se
regeneran.

---

## 3. Cómo entra un asset nuevo

1. ChatGPT deja la ficha en `candidate` con el archivo y lo pide en `AI_HANDOFF.md`.
2. Gabi pasa el archivo a Claude (por el chat, nunca por un conector web).
3. Claude lo sube por git local, verifica integridad, lo integra en su pantalla, saca capturas
   a 1440×900 y 1366×768 y actualiza esta tabla a `integrated`.
