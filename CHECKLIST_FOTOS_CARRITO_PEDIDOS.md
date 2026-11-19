# Floristería Magno — revisión de fotos, carrito y pedidos por navegador

## Funciones de esta entrega

- **Fotos de productos:** subidas con copia principal y respaldo persistentes, escritura atómica, comparación SHA-256 de ambas copias, detección de truncamientos/corrupción en el acceso público y recuperación si queda una copia verificada.
- **Diagnóstico administrativo:** Admin → Productos → **Revisar fotografías**. Identifica referencias internas de MySQL, ausencias, discrepancias y archivos con una sola copia. Permite intentar restauraciones seguras.
- **Catálogo público:** si no se encuentra una portada se prueban otras imágenes del mismo producto; como último recurso se muestra el logo local.
- **Carrito:** cada producto conserva la portada y alternativas. Al abrirlo se actualizan las URLs desde el catálogo de MySQL, sin borrar el pedido local si el producto se ocultó o no hay conexión. Se prueban imágenes alternativas antes de mostrar el logo.
- **Menú móvil:** burbuja con el número de **arreglos** agregados, incluso después de abrir otra página. No aparece si el carrito está vacío.
- **Persistencia:** carrito recordado en `localStorage` del navegador. Los códigos de pedidos creados en Checkout Pro, tarjeta u OXXO se guardan en `jhmagno_orders_v1`; Rastreo → **Mis pedidos en proceso** consulta su estado real desde el backend y oculta los entregados/cancelados.
- **Enlaces de rastreo:** acepta tanto `?codigo=JHM-000001` como `?pedido=JHM-000001`.

## Antes de desplegar

1. Publicar **backend antes que el frontend**, luego desplegar GitHub Pages y hacer recarga dura de la página. No es necesario modificar tablas de MySQL ni los webhooks de Mercado Pago.
2. Ingresar como Admin. Ejecutar **Revisar fotografías**. Corregir cualquier URL perdida que no tenga respaldo. Repetir después de un deploy de Hostinger.
3. Subir una fotografía nueva a un producto, verificar la respuesta del panel y que aparezca en el sitio público desde **otro navegador sin caché**. Hacer un redeploy de prueba y volver a abrir la misma URL.
4. En un celular: agregar un arreglo dos veces, comprobar burbuja **2** en el menú inferior; abrir carrito y verificar fotografía; recargar, cerrar y reabrir el mismo navegador; confirmar que se mantiene. Repetir con dos arreglos distintos y cambio de cantidad.
5. Repetir con foto principal sustituida: el carrito debe recuperar la portada vigente desde API. En un entorno de prueba, simular ausencia de archivo principal y confirmar restauración desde el respaldo.
6. Crear una compra de prueba autorizada en el entorno de pagos adecuado. Comprobar que el código se recuerda al iniciar el pago y que **Rastreo → Mis pedidos en proceso** lo muestra sin tener que teclearlo. Confirmar que al marcar `ENTREGADO` deja de aparecer. No dar por aprobado un pago hasta verificarlo con Mercado Pago.
7. Ejecutar `cd Backend && npm test` en el repositorio clonado. Se añadieron pruebas para el estado del navegador y la recuperación de imágenes.
8. Configurar **respaldo externo independiente de Hostinger** para protección ante pérdida total del servidor. Ver detalles en `Backend/IMAGE_STORAGE.md`.

## Limitaciones explícitas

La tienda recuerda los datos **por navegador y perfil de usuario**, no por número de teléfono. Si una persona usa Chrome y Safari, borra datos del sitio, cambia de teléfono o navega en privado, los datos locales pueden no estar disponibles. Los pedidos reales siguen en MySQL, y se pueden consultar proporcionando el código de rastreo.

No se guardan datos bancarios ni nombres/direcciones en el índice local de pedidos. La información definitiva del estado se obtiene de la API. Los artículos del carrito no representan una reserva de inventario y sus precios deben validarse nuevamente durante el checkout.

Los respaldos principal y secundario están en el **mismo servidor** hasta que se configure una copia externa: no ofrecen garantía absoluta de conservación. El indicador "verificado" del diagnóstico se refiere exclusivamente a los archivos locales examinados.

## Ajustes adicionales en el mismo PR (19 de noviembre de 2026)

### Panel de administración
- **Productos:** acciones como en la referencia: columna izquierda **Editar / Ocultar**, columna derecha **Subir / Bajar** separados pero juntos, con **Otra página** debajo. En móvil también se mantiene un diseño de dos columnas.
- **Tema:** sin menú desplegable, cada bloque muestra **19 colores pastel + Original** como botones de muestra visual con paleta doble, selección visible y etiqueta accesible. Cada parte (fondo, botones, pétalos flotantes y pétalo de inicio) se configura por separado. Las opciones se aceptan y persisten en MySQL con los mismos identificadores, y **Regresar a configuración base** restaura los colores originales.
- **Historial:** la consulta del día trae también **todos los pedidos sin concluir de cualquier fecha**. Los abiertos se ordenan primero, por fecha de entrega ascendente. Los cancelados y entregados sólo aparecen al consultar su propia fecha.
- **Alertas y detalles:** si un pedido activo se creó antes del día de hoy en horario de Ciudad de México, aparece burbuja amarilla **Pedido hace X días** a la izquierda del estado. Se ve **fecha de entrega + franja horaria** en el resumen, sin desplegar el detalle.
- El KPI superior se denomina **Pedidos visibles** para no presentar el acumulado pendiente como si fueran sólo pedidos del día.

### Carrito público
- Cabecera reducida, título con tipografía responsiva; se elimina la segunda columna alta del aviso superior.
- Columna izquierda: **arreglos, resumen/pago y aviso compacto**. Columna derecha: **¿Quién recibe? y horarios**. Se elimina el margen superior redundante de la tarjeta de entrega.
- Tarjetas de producto más compactas; incluso con uno o dos arreglos la página aprovecha mejor el espacio sin ocultar otros arreglos agregados.
- La fecha de entrega sigue siendo obligatoria, y el flujo de pago Mercado Pago y la validación de totales no se alteran.

### Temporada México y navegación
- Se ocultan, **sin eliminar**, los controles públicos de Primavera/Verano/Otoño/Invierno.
- La temporada se detecta automáticamente con `America/Mexico_City` usando límites de calendario aproximados: **20 mar–20 jun**, **21 jun–22 sep**, **23 sep–20 dic**, **21 dic–19 mar**.
- Se mantienen los efectos estacionales; donde se haya configurado un color pastel desde Admin, **el color personalizado tiene prioridad**. La temporada activa se sincroniza con los botones ocultos.
- Se corrige la construcción del enlace de rastreo desde el administrador en **GitHub Pages** (respetando el subdirectorio `Floristeria-Magno`) y el enlace de ubicación desde Ideas.

### Comprobaciones antes de fusionar
1. Cambiar tema desde Admin, guardar, abrir catálogo, Nosotros, Carrito y Rastreo; comprobar que la opción personalizada se respeta. Restaurar **Original** y verificar que aparece la identidad visual histórica.
2. Probar selección de tonos en celular: el color se elige tocando una muestra y puede guardarse; la selección debe permanecer después de actualizar.
3. Elegir cualquier fecha de historial y verificar que aparecen **primero los pedidos pendientes antiguos**, sin duplicados; cada pedido muestra fecha de entrega y la etiqueta amarilla cuando corresponde.
4. Probar pedidos de hoy y pedidos de otros días en estados **PENDIENTE, RECIBIDO, EN_DISENO, EN_CAMINO, LISTO_ENTREGA, CANCELADO, ENTREGADO**.
5. Revisar el carrito con **0, 1, 2 y más de 3 arreglos**, en computadora y celular. El bloque ¿Quién recibe? debe comenzar alineado con la sección de arreglos.
6. Abrir navegación de Catálogo → Carrito → Rastreo → Nosotros → Catálogo. Probar un enlace de rastreo copiado desde Admin y el enlace de Ubicación en Ideas.
7. Simular fechas de marzo, junio, septiembre y diciembre para confirmar cambios automáticos de temporada, sin botones visibles.

**Estado:** verificaciones de sintaxis JavaScript y comprobaciones aisladas de consulta de pedidos realizadas. Sigue pendiente el repaso visual en dispositivos reales y validación de Hostinger con datos del cliente.
