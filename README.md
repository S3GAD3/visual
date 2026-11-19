# RASTRO VISUAL — News Display

Editor local de presentaciones de prensa para televisiones y monitores. Permite preparar noticias en una mesa de montaje, emitir una copia independiente y descargar una vuelta completa de la presentación en vídeo.

## Empezar en un minuto

1. Extrae **toda la carpeta** del ZIP. Abre **index.html** con Chrome o Edge de escritorio. Los archivos JS y CSS deben permanecer junto al HTML.
2. Arrastra las noticias a **Importar imágenes**. Selecciona **Prensa** y pulsa **Montaje automático**. El orden inicial sigue la lista que entrega el selector de archivos.
3. Pulsa ▶ y revisa los titulares. Arrastra las miniaturas en la línea de tiempo para ordenar la edición. Las flechas permiten mover el clip seleccionado con precisión.
4. Usa **Guardar proyecto** para descargar una copia editable con sus imágenes, logotipo, música y ajustes. El archivo se abre desde **Abrir proyecto**. Cierra el editor después de guardar.

## Editar el montaje

| Control | Resultado |
|---|---|
| Prensa | Prioriza imagen completa y lectura vertical de páginas largas. |
| Cinematográfico | Añade movimiento Ken Burns a las tomas ordinarias. |
| Institucional | Usa fondo azul, tiempos más largos y transiciones discretas. |
| Dinámico | Acorta las tomas y alterna desplazamientos, zoom y desenfoque. |
| Duración general | Cambia todos los clips existentes y la duración inicial de nuevas imágenes. |
| Montaje automático | Aplica encuadre, duración y transiciones a todos los clips. Conserva el orden y los títulos. Amplía el tiempo cuando una captura requiere recorrido vertical. |
| Ajuste reutilizable | Guarda estilo, duración base y orientación en este navegador. El archivo de proyecto es la copia portátil. |
| Clip seleccionado | Permite duplicar, eliminar, cambiar duración, encuadre, título o transición de salida. Restablecer devuelve el clip a imagen completa y fundido. |

**Capturas largas.** El modo *Lectura vertical* muestra el ancho de la página, hace una pausa en la cabecera y desciende hasta el final. Revisa la velocidad desde la distancia real del espectador y aumenta la duración si hay mucho texto. *Completa · proteger texto* mantiene los cuatro bordes en pantalla. El título opcional dispone de una franja propia. El logotipo se superpone en la esquina superior derecha. Comprueba que no tape texto. En *Manual*, zoom y posición permiten dirigir la atención a una zona concreta.

En **Presentación y sonido** puedes añadir apertura y cierre de tres segundos, logotipo, música local y orientación vertical. La música se repite si es más corta que el montaje. El control de silencio afecta a la reproducción y a la exportación. Espacio reproduce o pausa y las flechas de teclado seleccionan el clip anterior o siguiente cuando el foco está fuera de los controles de edición.

## Televisor o segundo monitor

Configura el escritorio en modo extendido. Pulsa **Modo televisión**, mueve la ventana al monitor de destino y pulsa **Iniciar a pantalla completa** dentro de esa ventana. Tras iniciar, la salida oculta controles y cursor y repite el montaje, incluida la transición final al primer clip. Escape sale de pantalla completa. El botón ⛶ del editor también permite una reproducción directa.

La ventana de televisión conserva una copia de la secuencia. Puedes continuar editando en la ventana principal. **Aplicar a TV** pide confirmación y sustituye el programa en curso desde el primer clip. El proyecto descargado solo cambia cuando vuelves a guardarlo. Mantén abierto el editor. Para una emisión prolongada, configura el equipo para que mantenga activa la pantalla y comprueba un ciclo completo en el monitor de destino.

## Exportar un vídeo

Pulsa **Exportar vídeo**, elige Full HD o 4K, 24/30/60 FPS y uno de los formatos que ofrece ese navegador. En vertical se invierten las dimensiones. La descarga contiene una vuelta. Activa la repetición en el reproductor del televisor para una emisión continua.

| Formato | Cuándo usarlo |
|---|---|
| MP4 · H.264 | Primera elección para USB y televisor cuando el navegador anuncia H.264. Con música también debe admitir AAC. |
| WebM · VP8 o VP9 | Grabación alternativa en tiempo real, con Opus si hay música. Comprueba la compatibilidad del reproductor de destino. |
| WebM · por fotogramas | Salida silenciosa con todos los fotogramas y duración explícita. Disponible con música silenciada o sin pista. Puede tardar bastante más que la duración del montaje. |

La grabación en tiempo real usa el reloj de reproducción. Los FPS son un objetivo y el equipo puede perder fotogramas bajo carga. Mantén el editor visible durante la exportación. Cambiar de pestaña puede cancelar la grabación. Puedes cancelar manualmente sin alterar los clips. Si el codificador falla, prueba WebM, menos FPS o Full HD. Para vídeo silencioso, la opción por fotogramas evita depender del ritmo de captura de pantalla.

La salida a monitor y la exportación son independientes. El archivo resultante se descarga al finalizar. El límite preventivo del vídeo es 512 MiB por exportación. El navegador también necesita memoria para imágenes decodificadas y música. Varias decenas de capturas de página excepcionalmente altas pueden agotar la memoria incluso con archivos de origen pequeños. Divide proyectos grandes o reduce las dimensiones de los originales.

## Arquitectura y decisiones

- **index.html / style.css** definen el editor adaptable y los controles.
- **app.js** gestiona importación, selección, orden, reloj de reproducción y proyectos JSON con recursos incrustados. Valida y decodifica el proyecto antes de sustituir el montaje activo. Los duplicados comparten imagen. Al borrar el último uso se retira la referencia del editor.
- **engine.js** compone en Canvas 2D. El mismo cálculo de tiempo y encuadre gobierna vista previa, TV y vídeo. Los fondos desenfocados se calculan a baja resolución y se reutilizan. Las superficies de transición se reutilizan en cada salida.
- **output.js** crea la salida independiente y graba Canvas con MediaRecorder. Web Audio entrega la pista musical al grabador. Se liberan pistas y contexto al terminar o cancelar.
- **webm.js** empaqueta localmente fotogramas VP8 extraídos de imágenes WebP en clústeres WebM. Este modo prioriza cadencia exacta. Usa compresión intrafotograma y puede generar archivos mayores.

**MediaRecorder** permite usar los codificadores del navegador, incluir sonido y funcionar desde un archivo local. La detección de MIME permite ofrecer formatos candidatos, aunque la disponibilidad de recursos puede hacer fallar una configuración concreta. **WebCodecs** daría más control sobre las marcas de tiempo y el codificador, pero requiere resolver también la multiplexación de audio y vídeo. **FFmpeg.wasm** permitiría transcodificar a costa de mayor descarga, memoria y tiempo de proceso. Se han elegido APIs nativas y un empaquetador silencioso pequeño para distribuir la aplicación sin compilador, dependencias externas, CDN, cuentas ni servidor.

Referencias técnicas: [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API), [FFmpeg.wasm](https://ffmpegwasm.netlify.app/docs/faq/).

## GitHub Pages

Crea el repositorio, por ejemplo rastro-visual, y coloca **el contenido de la carpeta** en la raíz de la rama main. En **Settings → Pages**, selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)** y guarda. Conserva los nombres y sus mayúsculas. Cuando GitHub termine el despliegue, abre la dirección que muestra Pages. Las imágenes de trabajo se cargan desde el dispositivo del operador. Publicar el editor solo requiere los archivos incluidos en el ZIP.

## Verificación de esta entrega

Se comprobó la sintaxis de los cuatro scripts. En una prueba de Canvas fuera del navegador se decodificaron 30 imágenes PNG, JPEG y WebP, se dibujaron las cinco transiciones y se generó un WebM VP8 de 48 fotogramas en Full HD a 24 FPS. FFprobe reconoció una duración de dos segundos y FFmpeg decodificó el vídeo completo.

En una prueba automatizada de la lógica del editor con controles simulados se importaron 30 archivos, se aplicó montaje automático, se reordenó, duplicó y eliminó un clip y se recuperaron los 30 recursos y el orden desde un proyecto serializado.

El entorno impidió iniciar Chromium para la prueba de extremo a extremo. Quedan pendientes de verificación en Chrome/Edge de escritorio la interacción con archivos y arrastre, la restauración mediante el diálogo, la descarga desde el navegador, la pantalla completa, el segundo monitor, el audio y la codificación MediaRecorder en MP4/WebM. También quedan pendientes 4K y una sesión de varias horas en hardware real.

## Licencia

MIT. Creado por S3GAD3.
