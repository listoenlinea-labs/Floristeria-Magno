const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
    legacyUploadsRoot,
    uploadsRoot,
    uploadsBackupRoot
} = require('../config/uploads');

const IMAGE_FOLDERS = [
    'productos',
    'galeria'
];

const MANIFEST_FILE =
    path.join(
        uploadsBackupRoot,
        'image-manifest.jsonl'
    );

function isAllowedFolder(folderName) {
    return IMAGE_FOLDERS.includes(
        String(folderName || '')
    );
}

function sanitizeFilename(filename) {
    const value =
        String(filename || '').trim();

    if (
        !value ||
        value !== path.basename(value) ||
        value.includes('..')
    ) {
        return null;
    }

    return value;
}

async function exists(filePath) {
    try {
        await fs.promises.access(
            filePath,
            fs.constants.F_OK
        );

        return true;
    } catch {
        return false;
    }
}

async function ensureWritableDirectory(
    directory
) {
    await fs.promises.mkdir(
        directory,
        {
            recursive: true
        }
    );

    const probePath =
        path.join(
            directory,
            `.storage-probe-${process.pid}-${Date.now()}`
        );

    await fs.promises.writeFile(
        probePath,
        'ok',
        {
            flag: 'wx'
        }
    );

    await fs.promises.unlink(
        probePath
    );
}

async function ensureStorageTree() {
    await Promise.all(
        [
            uploadsRoot,
            uploadsBackupRoot
        ].flatMap(root =>
            IMAGE_FOLDERS.map(
                folderName =>
                    ensureWritableDirectory(
                        path.join(
                            root,
                            folderName
                        )
                    )
            )
        )
    );

    await fs.promises.mkdir(
        path.dirname(MANIFEST_FILE),
        {
            recursive: true
        }
    );
}

async function copyFileIfMissing(
    sourcePath,
    destinationPath
) {
    if (
        !(await exists(sourcePath)) ||
        await exists(destinationPath)
    ) {
        return false;
    }

    await fs.promises.mkdir(
        path.dirname(destinationPath),
        {
            recursive: true
        }
    );

    await fs.promises.copyFile(
        sourcePath,
        destinationPath,
        fs.constants.COPYFILE_EXCL
    );

    return true;
}

async function syncFolder(
    sourceRoot,
    destinationRoot,
    folderName
) {
    const sourceFolder =
        path.join(
            sourceRoot,
            folderName
        );

    if (!(await exists(sourceFolder))) {
        return 0;
    }

    const entries =
        await fs.promises.readdir(
            sourceFolder,
            {
                withFileTypes: true
            }
        );

    let copied = 0;

    for (const entry of entries) {
        if (
            !entry.isFile() ||
            entry.name === '.gitkeep'
        ) {
            continue;
        }

        const sourcePath =
            path.join(
                sourceFolder,
                entry.name
            );

        const destinationPath =
            path.join(
                destinationRoot,
                folderName,
                entry.name
            );

        if (
            await copyFileIfMissing(
                sourcePath,
                destinationPath
            )
        ) {
            copied += 1;
        }
    }

    return copied;
}

async function calculateSha256(filePath) {
    const hash =
        crypto.createHash('sha256');

    const stream =
        fs.createReadStream(
            filePath
        );

    for await (const chunk of stream) {
        hash.update(chunk);
    }

    return hash.digest('hex');
}

async function appendManifestEntry(entry) {
    await fs.promises.appendFile(
        MANIFEST_FILE,
        `${JSON.stringify(entry)}\n`,
        {
            encoding: 'utf8'
        }
    );
}

async function protectUploadedFile(
    file,
    folderName
) {
    if (
        !file ||
        !isAllowedFolder(folderName)
    ) {
        throw new Error(
            'No fue posible proteger la imagen subida.'
        );
    }

    const filename =
        sanitizeFilename(
            file.filename
        );

    if (!filename) {
        throw new Error(
            'El nombre de archivo de la imagen no es válido.'
        );
    }

    const primaryPath =
        path.join(
            uploadsRoot,
            folderName,
            filename
        );

    if (!(await exists(primaryPath))) {
        throw new Error(
            'La imagen no quedó guardada en el almacenamiento principal.'
        );
    }

    const backupPath =
        path.join(
            uploadsBackupRoot,
            folderName,
            filename
        );

    await copyFileIfMissing(
        primaryPath,
        backupPath
    );

    /*
     * El respaldo es obligatorio. Si por permisos o espacio
     * en disco no se puede crear, la subida se considera fallida
     * y el Admin no recibirá una URL "protegida".
     */
    if (!(await exists(backupPath))) {
        throw new Error(
            'No fue posible crear el respaldo de seguridad de la imagen.'
        );
    }

    const stats =
        await fs.promises.stat(
            primaryPath
        );

    const sha256 =
        await calculateSha256(
            primaryPath
        );

    await appendManifestEntry({
        timestamp:
            new Date().toISOString(),
        folder:
            folderName,
        filename,
        size:
            stats.size,
        sha256
    });

    return {
        filename,
        size:
            stats.size,
        sha256
    };
}

async function restoreImageIfNeeded(
    folderName,
    filename
) {
    if (!isAllowedFolder(folderName)) {
        return false;
    }

    const safeFilename =
        sanitizeFilename(filename);

    if (!safeFilename) {
        return false;
    }

    const primaryPath =
        path.join(
            uploadsRoot,
            folderName,
            safeFilename
        );

    if (await exists(primaryPath)) {
        return true;
    }

    const candidates = [
        path.join(
            uploadsBackupRoot,
            folderName,
            safeFilename
        ),
        path.join(
            legacyUploadsRoot,
            folderName,
            safeFilename
        )
    ];

    for (const sourcePath of candidates) {
        if (
            await copyFileIfMissing(
                sourcePath,
                primaryPath
            )
        ) {
            console.warn(
                `♻️ Imagen restaurada automáticamente: ${folderName}/${safeFilename}`
            );

            return true;
        }
    }

    return false;
}

async function recoverUploadMiddleware(
    req,
    res,
    next
) {
    try {
        if (
            !['GET', 'HEAD'].includes(
                req.method
            )
        ) {
            return next();
        }

        const parts =
            decodeURIComponent(
                req.path || ''
            )
                .split('/')
                .filter(Boolean);

        if (parts.length !== 2) {
            return next();
        }

        await restoreImageIfNeeded(
            parts[0],
            parts[1]
        );

        return next();
    } catch (error) {
        return next(error);
    }
}

async function countFiles(
    root,
    folderName
) {
    const folder =
        path.join(
            root,
            folderName
        );

    if (!(await exists(folder))) {
        return 0;
    }

    const entries =
        await fs.promises.readdir(
            folder,
            {
                withFileTypes: true
            }
        );

    return entries.filter(
        entry =>
            entry.isFile() &&
            entry.name !== '.gitkeep'
    ).length;
}

async function getImageStorageStatus() {
    const folders = {};

    for (const folderName of IMAGE_FOLDERS) {
        folders[folderName] = {
            primary:
                await countFiles(
                    uploadsRoot,
                    folderName
                ),
            backup:
                await countFiles(
                    uploadsBackupRoot,
                    folderName
                )
        };
    }

    return {
        protected:
            true,
        strategy:
            'persistent-primary-plus-local-backup',
        folders
    };
}

async function initializeImageStorage() {
    await ensureStorageTree();

    let migrated = 0;
    let backedUp = 0;
    let restored = 0;

    for (const folderName of IMAGE_FOLDERS) {
        if (
            path.resolve(
                legacyUploadsRoot
            ) !==
            path.resolve(
                uploadsRoot
            )
        ) {
            migrated +=
                await syncFolder(
                    legacyUploadsRoot,
                    uploadsRoot,
                    folderName
                );
        }

        backedUp +=
            await syncFolder(
                uploadsRoot,
                uploadsBackupRoot,
                folderName
            );

        restored +=
            await syncFolder(
                uploadsBackupRoot,
                uploadsRoot,
                folderName
            );
    }

    console.log(
        '✅ Almacenamiento protegido de imágenes listo.'
    );

    console.log(
        `   Migradas: ${migrated} | Respaldadas: ${backedUp} | Restauradas: ${restored}`
    );
}

module.exports = {
    initializeImageStorage,
    protectUploadedFile,
    recoverUploadMiddleware,
    restoreImageIfNeeded,
    getImageStorageStatus
};
