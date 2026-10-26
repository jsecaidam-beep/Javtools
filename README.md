# Javtools

Suite visual de comunicación con identidad ACH: convocatorias, invitaciones, portadas, gráficas, tablas y créditos.

## Desarrollo y publicación

`npm ci` y `npm run dev`. Para compilar: `npm run build`. GitHub Pages publica `dist/` mediante el flujo existente, sin servidor ni claves API.

## Convocatorias

Ruta `#convocatorias`. Dos composiciones, Guatemala/Honduras, título, descripción, lugar, fecha opcional, fotografía con encuadre vertical y hasta 12 logos PNG/JPG/WebP. Las imágenes se procesan en el navegador y no se envían a servidores. Las proporciones de los logos se conservan y se distribuyen automáticamente en una o dos filas. PNG de 1080 × 1350 px.

QR estático en azul ACH, fondo blanco, margen de cuatro módulos y corrección H. Descarga SVG y código incluido en el PNG. No usa redirecciones ni suscripciones: no caduca por sí mismo, pero el enlace de destino debe seguir existiendo.

## IA abierta opcional

Qwen2.5-1.5B-Instruct mediante WebLLM, ejecutado en un Web Worker en el navegador. No usa OpenAI, Gemini, suscripciones ni claves. Compatible con alojamiento estático público. Requiere HTTPS (o localhost), WebGPU, memoria suficiente y descargar aproximadamente 1 GB la primera vez; los pesos se almacenan en la caché del navegador. La descarga procede de los repositorios de modelos MLC en Hugging Face y de sus bibliotecas WASM. El texto de la convocatoria no se transmite a un proveedor de inferencia.

La activación es manual. Sin WebGPU o sin conexión para descargar el modelo, el editor y sus exportaciones siguen funcionando. La propuesta se revisa y aplica expresamente: no sustituye automáticamente el texto. No se usa para evaluar ni seleccionar candidaturas.

Referencias: https://github.com/mlc-ai/web-llm y https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC

## Validación

`npm run lint`, `npm run build`. Pruebas de navegador: selección de país, título largo, carga de fotografía, doce logos y exportación PNG. El QR del PNG se decodifica y se compara con el enlace original.

## Historias para redes

Ruta `#historias`, 1080 × 1920 px (9:16). Cuatro marcos: Órbitas, Cintas, Editorial y Ventana. Fondo fotográfico o video local, encuadre vertical, textos y colores personalizables. ACH siempre presente y hasta 12 logos adicionales que conservan proporciones y se reparten en una o dos filas sobre blanco.

Formas vectoriales dibujadas en Canvas 2D con flotación continua leve. Los textos y logos no se animan. Exportación PNG; grabación de 6/8/12/15 segundos en MP4 H.264 cuando el navegador lo permite, o WebM como alternativa. El video se graba en tiempo real, sin audio, y necesita mantener visible la pestaña. El editor no sube fotos ni videos a servidores. SVG transparente con animación continua y logos/textos integrados para superponer en un editor externo; no incluye el medio de fondo y depende del soporte SVG/SMIL del programa receptor.

Validado en navegador: importación de video, varios logos, selección de marco, PNG 1080 × 1920, SVG con imágenes embebidas y exportación MP4 H.264 a 30 fps.

Convocatorias actualizadas: fondos degradados (azul/verde ACH, aurora y verde), lemas superior/inferior y llamada a la acción editables, fotografías con cinco formas (orgánica, arco, cápsula, ventana y pétalo), encuadre horizontal/vertical y zoom. Cuatro formatos exportables: post 1080 × 1350, historia 1080 × 1920, horizontal 1920 × 1080 y cuadrado 1080 × 1080. Comprobadas descargas y lectura del QR en los cuatro formatos.

## Revisión previa y duración

Historias: PNG, SVG y video se muestran en un diálogo de revisión; el archivo solo se descarga al pulsar Descargar. Dos barras ajustan velocidad (0.3–3×) e intensidad (0–100%) de la flotación. Fotos: 30, 45 o 60 segundos, con opciones cortas de 6/15 segundos. Videos: duración original del archivo, sin repetirlo en la exportación. La grabación se realiza en tiempo real y sigue sin audio. Titular con interlineado más compacto. Convocatorias: PNG con revisión previa, máscara orgánica más ancha y fotografías adaptadas al espacio horizontal.

Logo Javtools vectorizado en `public/assets/brand/javtools.svg`, siete trazados sin imagen raster incrustada; integrado en la cabecera y favicon. Validación: PNG con descarga tras revisión y MP4 de 3.01 segundos para un original de 3 segundos, 1080 × 1920. Previsualización horizontal de convocatorias comprobada.

## Portadas y visualización de datos renovadas

Cuatro portadas nuevas: Aurora, Órbita, Editorial y Horizonte, además de los dos estilos anteriores. ACH siempre visible; FHG viene incluido por defecto y se pueden añadir logos de socios. Los logos nuevos conservan sus colores y proporciones en una banda blanca adaptable. Carta/Oficio, fotos, campos de metadatos y autoría siguen disponibles. Comprobada la exportación de los cuatro estilos a PNG de 2550 × 3300.

Gráficas: nueve tipos (barras verticales/horizontales/apiladas, circular, dona, líneas, área, radar y área polar); cuatro paletas (institucional, Océano, Pastel editorial y Bosque). Probados los cuatro tipos nuevos con datos de referencia y descarga PNG sin errores de navegador.

Tablas: nuevos estilos Editorial limpio, Océano, Bosque y Franjas azules. Aplican cabeceras y filas alternas sin cambiar valores ni fusiones. Confirmados los colores de cabecera y filas en el HTML exportado y la acción de copiado para Word.
