# Assets estáticos

Vite copia todo lo que está acá a la raíz del build sin procesarlo. Se referencian
con `import.meta.env.BASE_URL + 'archivo'` — el proyecto usa `base: './'`, así que
un path absoluto (`/archivo`) apuntaría a la raíz del dominio y no a
`/basket-manager/`.

## `portada.webp` — la portada del menú principal

La ilustración del asado en la cantina del club. La usa `.menu-portada` en el menú
(ver `src/App.tsx`), como fondo `cover` de la mitad izquierda de la pantalla.

- **Formato**: WebP. Un PNG de 2048² pesa varios MB y este juego entero pesa 600 KB.
- **Proporción**: la actual es 1:1 y por eso el menú está partido en dos en vez de
  usarla a sangre completa — recortarla a 16:9 se come las camisetas colgadas
  arriba y la pelota con los bolsos abajo, que es lo mejor que tiene.
- **Si el archivo no está**, el panel queda en grafito y el menú sigue usable. No
  rompe nada.

**Estado: arte provisional, no aprobado** (ver `design/ART_PIPELINE.md`). Se
reemplaza pisando el archivo, sin tocar código.
