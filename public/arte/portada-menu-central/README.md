# Portada: menú central

Referencia visual aprobada por Gabi y tres assets PNG con transparencia real (RGBA). Los assets fueron recreados individualmente, por lo que no son recortes idénticos del boceto.

- `referencia.png`: guía de composición; no usar como fondo ni como interfaz completa.
- `continuar.png`: carpeta y disquete, acceso principal.
- `nueva-partida.png`: pizarra, pelota y silbato, acceso principal.
- `gestionar.png`: archivador, acceso secundario.

## Instrucciones para implementar

Leer primero CLAUDE.md y revisar la portada actual y sus acciones. Implementar la composición de referencia en React/CSS, con prioridad escritorio (1280 px o más), siguiendo las convenciones existentes.

1. Mantener intacta la ilustración original `public/portada.webp` como fondo a pantalla completa. El fondo del boceto fue regenerado y NO debe reemplazar al original. Usar una capa CSS oscura independiente y ajustable para contraste.
2. Eliminar el panel lateral. Centrar el título arriba y los dos accesos grandes en el medio, con Gestionar partida más pequeño debajo. Sin contenedores opacos alrededor de los íconos.
3. Usar los tres PNG de esta carpeta, mantener proporciones y ajustar su tamaño visual pese a sus diferentes dimensiones. Las etiquetas Continuar partida, Nueva partida y Gestionar partida deben ser texto HTML separado. Implementar botones accesibles con foco visible y estados hover; sombras y subrayado naranja mediante CSS.
4. El título BÁSQUET MANAGER AMATEUR aún no tiene asset de logo. Recrearlo como texto con tipografía deportiva de estilo collegiate, crema/naranja, respetando licencias de fuentes. Si no existe una fuente adecuada disponible, indicar la aproximación. No recortar letras del boceto.
5. Preservar la lógica y las partidas guardadas. Continuar debe respetar la existencia de un guardado. Nueva partida debe ofrecer las dos modalidades actuales (pretemporada y plantel armado) y la configuración existente de faltas/lesiones en el paso siguiente. Gestionar partida debe alojar la acción existente de borrar, con confirmación, sin inventar un sistema de múltiples guardados.
6. Evitar scroll en la portada en resoluciones habituales de escritorio; comprobar al menos 1280x720 y 1920x1080. No alterar balance, simulación ni formato del guardado.
7. Verificar visualmente la implementación, ejecutar las comprobaciones requeridas por CLAUDE.md y documentar la feature en CHANGELOG.md. No publicar en main automáticamente: dejar la implementación en una rama para revisión.

Esta entrega solo agrega recursos y documentación; no implementa cambios de interfaz.
