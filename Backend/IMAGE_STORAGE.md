# Protección de imágenes en producción

## Problema que corrige

Las imágenes subidas desde Admin se guardaban por defecto en `uploads/`
dentro del directorio de la aplicación Node. Esa carpeta está ignorada por
Git y puede desaparecer cuando el hosting reconstruye o reemplaza el deploy.

El síntoma típico es:

- un dispositivo antiguo todavía ve la fotografía por caché;
- un dispositivo nuevo solicita la URL real;
- el servidor responde que el archivo ya no existe.

## Nueva estrategia

La aplicación usa dos copias:

1. **Almacenamiento principal persistente** fuera del código desplegado.
2. **Respaldo persistente** separado.

En producción, si no defines ninguna variable, se utiliza:

```text
$HOME/floristeria-magno-data/uploads
$HOME/floristeria-magno-data/uploads-backup
```

Puedes definir rutas explícitas con:

```env
IMAGE_STORAGE_ROOT=/home/USUARIO/floristeria-magno-data
# o:
UPLOADS_DIR=/ruta/persistente/uploads
UPLOADS_BACKUP_DIR=/ruta/persistente/uploads-backup
PUBLIC_API_URL=https://api.listoenlinea.host
```

## Qué ocurre al subir una imagen

La API:

1. guarda la imagen en el almacenamiento principal;
2. crea una copia en el respaldo;
3. calcula SHA-256;
4. registra el archivo en un manifiesto append-only;
5. solo entonces devuelve al Admin la URL como subida exitosa.

## Recuperación automática

Cuando alguien abre una URL como:

```text
/uploads/productos/archivo.webp
```

si falta la copia principal, el servidor intenta restaurarla desde el
respaldo antes de responder.

Al arrancar el backend también:

- migra archivos de la antigua carpeta `uploads/`, si todavía existen;
- copia archivos nuevos al respaldo;
- restaura desde el respaldo cualquier archivo que falte en la carpeta
  principal.

## Comprobación

Con credenciales de Admin:

```text
GET /api/floristeria-magno/uploads/health
```

devuelve el número de archivos en principal y respaldo.

## Importante sobre imágenes que ya desaparecieron

Este cambio evita que futuros deploys borren las nuevas imágenes y protege
las que todavía sigan físicamente en el servidor al momento de desplegarlo.

Un archivo que ya no exista ni en el servidor, ni en un respaldo, ni en el
repositorio no puede reconstruirse desde su URL. Si un teléfono todavía lo
muestra por caché, conviene descargar esa fotografía y volverla a subir desde
Admin una vez aplicada esta protección.

Para protección ante pérdida total de la cuenta/disco del hosting, agrega
además un respaldo externo (S3/R2/Cloudinary u otro proveedor independiente).

## Revisión después de cada despliegue de Hostinger

1. Mantener `IMAGE_STORAGE_ROOT` en una ruta absoluta y persistente **fuera del proyecto/deploy**.
2. No configurar `UPLOADS_DIR` ni `UPLOADS_BACKUP_DIR` en la ruta que Hostinger reemplaza al publicar.
3. Comprobar con credenciales de administrador `GET /api/floristeria-magno/uploads/health`.
4. Mantener un respaldo **fuera del mismo servidor** (otro disco o proveedor) para protegerse ante una pérdida total de la cuenta.
5. Realizar una prueba: subir una imagen, anotar su URL, publicar de nuevo, comprobar esa URL desde otro navegador y volver a consultar health.

**Limitación:** dos carpetas del mismo hosting no garantizan recuperación ante borrado
de la cuenta, pérdida total del disco o reconfiguración que elimine ambas carpetas.

## URLs con dominio anterior

El backend normaliza en las respuestas de productos y galería las URLs que
terminan en `/uploads/productos/archivo` o `/uploads/galeria/archivo`
para apuntar a `PUBLIC_API_URL`. No altera los registros de MySQL ni URLs
externas sin la ruta identificable. Se mantienen los nombres de archivo.
**Si ya no existe el archivo físico**, normalizar una URL no puede recuperarlo.

## Refuerzo de integridad (noviembre de 2026)

Se añadió una verificación adicional:
- Los respaldos nuevos se copian a un archivo temporal y se renombran de forma atómica: una interrupción no deja una copia parcial publicada.
- Una subida solo se confirma cuando la imagen principal y su respaldo tienen el **mismo SHA-256 y tamaño no nulo**.
- Los archivos incluidos en el manifiesto se verifican por SHA-256 cuando se solicitan; se reutiliza el resultado mientras no cambie tamaño/fecha de modificación. Si falta o se corrompe la principal, se recupera desde una copia cuyo hash coincide.
- El diagnóstico administrativo comprueba **referencias reales de productos y galería en MySQL**, distinguiendo imágenes internas y referencias externas. No basta con contar archivos.
- Desde **Admin → Productos → Revisar fotografías** se abre el diagnóstico. Se puede usar **Reparar desde respaldo** para restaurar una copia cuyo origen está verificado.

### Nuevas rutas de diagnóstico (Basic Auth)

```text
GET  /api/floristeria-magno/uploads/integridad
POST /api/floristeria-magno/uploads/integridad/reparar
```

La segunda ruta solo restaura archivos desde copias disponibles y confiables. Si una foto se perdió de todas las copias, hay que **volverla a subir** desde el administrador o recuperarla de un respaldo externo. Las imágenes con URL de un proveedor externo no pueden respaldarse automáticamente con esta estrategia local.

### Garantía y requisitos del proveedor

**No es técnicamente posible garantizar que una imagen nunca se pierda con dos carpetas en el mismo hosting.** Ante un disco borrado, suspensión de cuenta, ransomware o pérdida total de Hostinger, ambas copias pueden desaparecer.

Para continuidad ante pérdida total del hosting, contratar y configurar **almacenamiento de objetos redundante** fuera de Hostinger (por ejemplo Cloudflare R2/S3), con respaldo automático, permisos acotados, versiones y restauración probada. Esta integración **no se habilita sola**: hace falta elegir el proveedor y aportar sus credenciales/configuración de manera segura.

Los hashes detectan corrupción, pero no convierten el propio servidor en un respaldo independiente.
