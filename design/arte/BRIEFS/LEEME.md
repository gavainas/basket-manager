# Briefs de arte

Cada pedido de arte deja rastro acá **antes** de gastar un crédito. Un brief es la receta
completa para generar (o volver a generar) un lote: modelo, referencia de estilo, prompts
textuales, tamaños, nombres de archivo y qué se valida al recibirlo. Si el archivo se pierde
o hay que rehacerlo, el brief alcanza para obtener lo mismo.

Regla, heredada de [`../../ART_PIPELINE.md`](../../ART_PIPELINE.md): **no se genera nada sin
el visto bueno explícito de Gabi sobre el brief**, y nada se genera en masa antes de aprobar
la muestra chica. El brief dice cuántos créditos cuesta cada paso, para que la decisión sea
con el número a la vista.

## Estados

| Estado | Qué significa |
| --- | --- |
| `PENDIENTE` | Escrito, sin aprobar. No se generó nada. |
| `APROBADO` | Gabi dijo que sí (fecha y palabra textual en el brief). Se puede generar lo que el brief dice, y sólo eso. |
| `GENERADO` | Los archivos existen en `public/arte/` con los nombres del brief. |
| `RECHAZADO` | Con el porqué, para no volver a proponer lo mismo. |

## Plantilla

```md
# <Nombre del lote> — <fecha>

**Estado:** PENDIENTE · **Costo estimado:** N créditos · **Puerta:** <n del pipeline>

## Para qué
## Qué se genera (lista cerrada, con nombre de archivo)
## Receta (modelo, referencia, tamaño, post-proceso)
## Prompts (uno por pieza, textuales)
## Qué se valida al recibirlo
## Qué NO entra en este lote
```

## Índice

| Brief | Estado |
| --- | --- |
| [`2026-09-08-puerta3-lamina-por-capas.md`](2026-09-08-puerta3-lamina-por-capas.md) | PENDIENTE |
