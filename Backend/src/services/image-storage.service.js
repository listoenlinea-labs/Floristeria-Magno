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

// Registro de hashes sólo de las fotos protegidas por esta versión.
// Los archivos heredados se auditan comparando las dos copias disponibles.
const knownImageHashes = new Map();

async function loadImageManifest() {
    knownImageHashes.clear();
    const contents = await fs.promises.readFile(MANIFEST_FILE, 'utf8').catch(error => {
        if (error.code === 'ENOENT') return '';
        throw error;
    });
    for (const line of contents.split('\n')) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            if (isAllowedFolder(entry.folder) && sanitizeFilename(entry.filename) &&
                Number.isSafeInteger(entry.size) && entry.size > 0 &&
                /^[a-f0-9]{64}$/.test(entry.sha256)) {
                knownImageHashes.set(entry.folder + '/' + entry.filename, {
                    size: entry.size, sha256: entry.sha256
                });
            }
        } catch (_) { /* Ignorar solo una línea de manifiesto incompleta. */ }
    }
}

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

    // Escribir en un temporal y renombrar: un corte a mitad de copia
    // no deja una fotografía incompleta con su nombre definitivo.
    const temporary = destinationPath + '.part-' + crypto.randomUUID();
    try {
        await fs.promises.copyFile(sourcePath, temporary, fs.constants.COPYFILE_EXCL);
        if (await exists(destinationPath)) return false;
        await fs.promises.rename(temporary, destinationPath);
        return true;
    } finally {
        await fs.promises.rm(temporary, { force: true }).catch(() => {});
    }
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

    await copyFileIfMissing(primaryPath, backupPath);

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

    if (stats.size < 1) {
        throw new Error('La fotografía subida está vacía.');
    }
    const sha256 = await calculateSha256(primaryPath);
    // No declaramos éxito por la mera existencia del respaldo: los bytes
    // deben coincidir antes de entregar la URL al administrador.
    const backupStats = await fs.promises.stat(backupPath);
    const backupSha256 = await calculateSha256(backupPath);
    if (backupStats.size !== stats.size || backupSha256 !== sha256) {
        throw new Error('La fotografía y el respaldo no coinciden. No se registró la subida.');
    }

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
    knownImageHashes.set(folderName + '/' + filename, { size: stats.size, sha256 });

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

    // Evitar devolver un archivo vacío. Si existe un registro en el manifiesto,
    // detectar también truncamientos sin calcular SHA de cada vista pública.
    const expected = knownImageHashes.get(folderName + '/' + safeFilename);
    const primaryStats = await fs.promises.stat(primaryPath).catch(() => null);
    if (primaryStats && primaryStats.isFile() && primaryStats.size > 0 &&
        (!expected || primaryStats.size === expected.size)) return true;
    if (primaryStats) {
        console.warn('Imagen primaria dañada o incompleta:', folderName, safeFilename);
        await fs.promises.rm(primaryPath, { force: true });
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
        const sourceStats = await fs.promises.stat(sourcePath).catch(() => null);
        if (!sourceStats?.isFile() || sourceStats.size < 1 ||
            (expected && sourceStats.size !== expected.size)) continue;
        // La recuperación excepcional sí verifica SHA, para no propagar
        // accidentalmente copias dañadas a la ruta pública.
        if (expected && await calculateSha256(sourcePath) !== expected.sha256) continue;
        try {
            await copyFileIfMissing(sourcePath, primaryPath);
        } catch (error) {
            if (!(await exists(primaryPath))) throw error;
        }
        const restored = await fs.promises.stat(primaryPath).catch(() => null);
        if (restored?.size === sourceStats.size) {
            console.warn('♻️ Imagen restaurada:', folderName, safeFilename);
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

    const problems = [];
    for (const [folder, totals] of Object.entries(folders)) {
        if (totals.primary !== totals.backup) {
            problems.push(`${folder}: primary=${totals.primary}, backup=${totals.backup}`);
        }
    }
    return {
        protected: problems.length === 0,
        strategy: 'persistent-primary-plus-local-backup',
        warning: problems.length
            ? 'Se detectaron diferencias entre almacenamiento principal y respaldo'
            : null,
        discrepancies: problems,
        folders
    };
}

async function initializeImageStorage() {
    await ensureStorageTree();
    await loadImageManifest();

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
