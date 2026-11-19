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
