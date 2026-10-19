# Integración piloto — 72 retratos de jugadores

Rama de prueba: `art/72-player-portraits-preview`. No modificar mecánicas ni `main` hasta validación.

## Qué quedó implementado

- `src/ui/Avatar.tsx`: cuando el jugador tiene `personality`, su retrato ahora se determina por hash estable del `seed`/ID entre los 72 PNG (`player_001.png` a `player_072.png`). Esto evita que cambie de cara por fichajes, transferencias, sesiones o pantallas.
- Si el PNG todavía no existe, la imagen usa automáticamente el retrato de arquetipo anterior (`p-*.webp`). No se cambió el SVG de respaldo.
- Las camisetas de estos PNG están pintadas en la imagen. Cambiar de club no recolorea el uniforme; resolver después de validar el piloto.

## Instalación de los PNG (pendiente)

Los 72 PNG normalizados a 256×256 deben estar exactamente en:

```
public/arte/retratos/player_001.png
...
public/arte/retratos/player_072.png
```

Los binarios se prepararon en el paquete `basket_manager_72_para_github.zip`. La conexión GitHub disponible permite editar código de texto pero **no transferir binarios PNG desde este entorno**. Se deben copiar los archivos de la carpeta `public/arte/retratos/` del ZIP a la misma ruta del checkout local de esta rama y hacer commit/push, o subirlos desde la interfaz de GitHub a esa ruta.

## Verificación

1. Cambiar a esta rama y copiar los 72 PNG.
2. Ejecutar `npm install` y `npm run build`.
3. Iniciar `npm run dev`, abrir una partida y revisar Plantel, ficha de jugador, mercado, perfiles rivales y partido.
4. Comprobar identidad consistente del jugador, recortes, legibilidad a 24/42/96 px y carga de imágenes sin 404.
5. Validar el resultado antes de integrar a `main`.

**Art Bible obligatoria:** `design/ART_BIBLE_PORTADA_ASADO.md`. No regenerar imágenes fuera de Layer.ai sin autorización del usuario.
