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
