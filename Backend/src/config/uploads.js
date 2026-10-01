const path = require('path');

const isProduction =
    process.env.NODE_ENV === 'production';

const legacyUploadsRoot =
    path.resolve(
        process.cwd(),
        'uploads'
    );

function resolvePersistentBase() {
    if (process.env.IMAGE_STORAGE_ROOT) {
        return path.resolve(
            process.env.IMAGE_STORAGE_ROOT
        );
    }

    /*
     * En producción evitamos guardar imágenes dentro del
     * directorio desplegado por Node/Hostinger. Los deploys
     * pueden reemplazar esa carpeta y dejar URLs de MySQL
     * apuntando a archivos que ya no existen.
     *
     * HOME normalmente apunta al directorio persistente del
     * usuario de hosting y no forma parte del código desplegado.
     */
    if (
        isProduction &&
        process.env.HOME
    ) {
        return path.join(
            path.resolve(process.env.HOME),
            'floristeria-magno-data'
        );
    }

    return path.resolve(
        process.cwd(),
        '.persistent-data'
    );
}

const persistentBase =
    resolvePersistentBase();

const uploadsRoot =
    process.env.UPLOADS_DIR
        ? path.resolve(
            process.env.UPLOADS_DIR
        )
        : isProduction
            ? path.join(
                persistentBase,
                'uploads'
            )
            : legacyUploadsRoot;

const uploadsBackupRoot =
    process.env.UPLOADS_BACKUP_DIR
        ? path.resolve(
            process.env.UPLOADS_BACKUP_DIR
        )
        : path.join(
            persistentBase,
            'uploads-backup'
        );

module.exports = {
    isProduction,
    legacyUploadsRoot,
    persistentBase,
    uploadsRoot,
    uploadsBackupRoot
};
