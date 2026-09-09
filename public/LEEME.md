# Assets estáticos

Vite copia todo lo que está acá a la raíz del build sin procesarlo. Se referencian
con `import.meta.env.BASE_URL + 'archivo'` — el proyecto usa `base: './'`, así que
un path absoluto (`/archivo`) apuntaría a la raíz del dominio y no a
`/basket-manager/`.

## `portada.webp` — la portada del menú principal

La ilustración del asado en la cantina del club. Desde sep 2026 es el fondo a
pantalla completa del menú central (`src/ui/Portada.tsx`, con un velo oscuro aparte
para el contraste); la fundación del club (Carrera) la sigue usando partida en dos
con `.menu-portada`.

- **Formato**: WebP. Un PNG de 2048² pesa varios MB y este juego entero pesa 600 KB.
- **Proporción**: es 1:1 y el monitor es ancho: a sangre se recorta arriba y abajo
  (`background-position: center 42%` deja las caras y la mesa). La composición del
  menú central lo pidió así; el archivo no se tocó ni se regeneró.
- **Si el archivo no está**, el fondo queda en grafito y el menú sigue usable. No
  rompe nada.

Los tres accesos del menú (carpeta con disquete, pizarra con pelota, archivador)
viven en `arte/portada-menu-central/` con su README y su referencia aprobada.
