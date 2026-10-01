const {
    protectUploadedFile,
    getImageStorageStatus
} = require('../services/image-storage.service');

function buildPublicImageUrl(
    req,
    folderName,
    filename
) {
    const configuredBase =
        String(
            process.env.PUBLIC_API_URL || ''
        )
            .trim()
            .replace(/\/$/, '');

    const origin =
        configuredBase ||
        `${req.protocol}://${req.get('host')}`;

    return (
        origin +
        `/uploads/${folderName}/` +
        encodeURIComponent(filename)
    );
}

async function subirImagenProducto(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                message: 'Debes seleccionar una imagen'
            });
        }

        await protectUploadedFile(
            req.file,
            'productos'
        );

        res.status(201).json({
            ok: true,
            message: 'Imagen subida y respaldada correctamente',
            data: {
                imagenUrl: buildPublicImageUrl(
                    req,
                    'productos',
                    req.file.filename
                ),
                nombreArchivo: req.file.filename,
                tamaño: req.file.size,
                tipo: req.file.mimetype
            }
        });
    } catch (error) {
        next(error);
    }
}

async function subirImagenGaleria(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                ok: false,
                message: 'Debes seleccionar una imagen'
            });
        }

        await protectUploadedFile(
            req.file,
            'galeria'
        );

        res.status(201).json({
            ok: true,
            message: 'Imagen subida y respaldada correctamente',
            data: {
                imagenUrl: buildPublicImageUrl(
                    req,
                    'galeria',
                    req.file.filename
                ),
                nombreArchivo: req.file.filename,
                tamaño: req.file.size,
                tipo: req.file.mimetype
            }
        });
    } catch (error) {
        next(error);
    }
}

async function auditarAlmacenamientoImagenes(
    req,
    res,
    next
) {
    try {
        const status =
            await getImageStorageStatus();

        res.status(200).json({
            ok: true,
            message:
                'Almacenamiento de imágenes operativo',
            data:
                status
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    subirImagenProducto,
    subirImagenGaleria,
    auditarAlmacenamientoImagenes
};