# Floristería Magno · primera fase para lanzamiento de diciembre de 2026

## Cambios incluidos
- El administrador muestra hasta **5 productos por página**, con navegación y arrastre para modificar el **orden global**; el orden se guarda en MySQL y se utiliza en el catálogo público.
- También se puede mover un arreglo usando **Subir**, **Bajar** u **Otra página** desde el celular, sin depender del gesto de arrastre.
- Historial de pedidos en tarjetas colapsables, inicialmente cerradas: comprador, estado, cantidad de arreglos y total; los demás datos aparecen al abrirlas.
- La sección informativa bajo el catálogo está **oculta de forma predeterminada**. El modal permite mostrarla y editar título, párrafos y video de YouTube.
- Modal **Tema de la página**: fondo, botones, pétalos flotantes y pétalos de bienvenida por separado, todos en paletas pastel. **Regresar a configuración base** guarda las opciones originales `base`, sin tocar la paleta actual de CSS.
- Política de cancelación editable en el panel (porcentaje reembolsable al cliente: **entero entre 1 y 99**). Se muestra junto al pago, con explicación de reemplazo de arreglos defectuosos, y se incluye en el correo de pedido confirmado.
- Subidas nuevas de fotos JPEG/PNG/WebP: reducción opcional mediante canvas a **máximo 1600 px**, calidad WebP 81 % (solo si reduce el peso), con fallback al original. Hasta **3 subidas simultáneas** de un producto. El catálogo carga imágenes por demanda y prioriza las primeras.

## Despliegue

1. Publicar **backend Hostinger** y frontend GitHub Pages del **mismo commit/PR**, preferentemente backend primero.
2. Revisar permisos de la cuenta MySQL de Hostinger. Al iniciar, el backend ejecuta `ConfiguracionTienda.sync()` y crea **solo** la tabla adicional `configuracion_tienda` si falta; **no altera** tablas actuales. Si no hay permisos de `CREATE TABLE`, realizar el alta desde el administrador de MySQL:
   ```sql
   CREATE TABLE IF NOT EXISTS configuracion_tienda (
     id INT PRIMARY KEY,
     opciones_json LONGTEXT NOT NULL
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
   ```
3. Ingresar a **Admin → Configuración → Cancelaciones y cambios** y definir el porcentaje real acordado con el cliente **antes de aceptar compras**. No se eligió un porcentaje arbitrario: mientras falte, el texto informa que está pendiente de definición.
4. En **Admin → Tema de la página**, elegir valores pastel o conservar `Original`. La restauración guarda los valores originales inmediatamente.
5. Probar un producto movido de la **página 2 a la página 1**, después actualizar la tienda pública y verificar que el orden coincida. Probar filtros activos, botones de mover en móvil y un cambio de estado de pedido.
6. Realizar **una compra de prueba autorizada** en el entorno correspondiente para verificar: porcentaje en el carrito, confirmación del pago, correo al cliente con cancelación/reemplazo y estado del pedido. No usar un pago real de producción sin autorización del cliente.

## Rendimiento de imágenes: alcance y limitaciones
- La nueva compresión beneficia **solo las imágenes que se suban a partir de este cambio**. Los archivos antiguos siguen teniendo el tamaño que tenían; para reducirlos, volver a cargarlos desde el administrador conservando el orden de cada producto.
- Caching `Cache-Control` e imágenes persistentes existentes se conservan. El primer acceso depende del tamaño original, la red y la latencia de Hostinger. No es posible garantizar cero retrasos bajo todas las conexiones.
- Formato GIF se conserva para no destruir posibles animaciones; los archivos que no se puedan optimizar se suben sin cambios.
- No se toca el esquema de pagos de Mercado Pago, sus webhooks, el inventario ni el proceso de restauración/backup de fotografías.

## Comprobaciones realizadas
Revisión de sintaxis de los archivos JavaScript modificados (backend, admin, carrito y catálogo). Prueba aislada del módulo de opciones: valores base, persistencia de una configuración de ejemplo y rechazo de porcentajes inválidos. **Pendiente:** validación manual en navegador móvil real, Hostinger y flujo de pagos/correo con credenciales reales.
