const { Op } = require('sequelize');

const sequelize = require('../config/database');

const {
    Producto,
    ProductoImagen
} = require('../models');


const attributes = [
    'id',
    'nombre',
    'descripcion',
    'categoria',
    'etiqueta',
    'precio',
    'stock',
    'imagenUrl',
    'destacado',
    'orden',
    'activo',
    'creadoEn',
    'actualizadoEn'
];


const imageAttributes = [
    'id',
    'productoId',
    'imagenUrl',
    'orden',
    'creadoEn'
];


function normalizeBoolean(
    value,
    defaultValue = false
) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (value === 1 || value === '1') {
        return true;
    }

    if (value === 0 || value === '0') {
        return false;
    }

    if (typeof value === 'string') {
        const normalized = value
            .trim()
            .toLowerCase();

        if (
            ['true', 'si', 'sí'].includes(
                normalized
            )
        ) {
            return true;
        }

        if (
            ['false', 'no'].includes(
                normalized
            )
        ) {
            return false;
        }
    }

    return defaultValue;
}


function normalizeImageUrls(body) {
    let urls = [];

    /*
     * Nuevo formato:
     *
     * imagenes: [
     *   "url1",
     *   "url2",
     *   "url3"
     * ]
     */
    if (Array.isArray(body.imagenes)) {
        urls = body.imagenes;
    }

    /*
     * Compatibilidad con el sistema viejo.
     */
    if (
        !urls.length &&
        body.imagenUrl
    ) {
        urls = [
            body.imagenUrl
        ];
    }

    /*
     * Limpieza, eliminación de vacíos
     * y duplicados.
     */
    urls = urls
        .map(url => String(url || '').trim())
        .filter(Boolean);

    urls = [...new Set(urls)];

    /*
     * Máximo 10 fotografías por arreglo.
     */
    return urls.slice(0, 10);
}


function validateBody(body) {
    const nombre =
        String(body.nombre || '').trim();

    const precio =
        Number(body.precio);

    const stock =
        Number(body.stock ?? 0);

    const orden =
        Number(body.orden ?? 1);

    if (!nombre) {
        return 'El nombre es obligatorio';
    }

    if (
        !Number.isFinite(precio) ||
        precio < 0
    ) {
        return 'El precio no es válido';
    }

    if (
        !Number.isInteger(stock) ||
        stock < 0
    ) {
        return 'El stock no es válido';
    }

    if (
        !Number.isInteger(orden) ||
        orden < 0
    ) {
        return 'El orden no es válido';
    }

    return null;
}


function buildPayload(
    body,
    imageUrls
) {
    return {
        nombre:
            String(body.nombre || '').trim(),

        descripcion:
            body.descripcion
                ? String(
                    body.descripcion
                ).trim()
                : null,

        categoria:
            body.categoria
                ? String(
                    body.categoria
                ).trim()
                : null,

        etiqueta:
            body.etiqueta
                ? String(
                    body.etiqueta
                ).trim()
                : null,

        precio:
            Number(body.precio),

        stock:
            Number(body.stock ?? 0),

        /*
         * La primera imagen siempre será
         * la portada del producto.
         */
        imagenUrl:
            imageUrls[0] || null,

        destacado:
            normalizeBoolean(
                body.destacado
            ),

        orden:
            Number(body.orden ?? 1),

        activo:
            normalizeBoolean(
                body.activo,
                true
            ),

        actualizadoEn:
            new Date()
    };
}


async function saveProductImages(
    productoId,
    imageUrls,
    transaction
) {
    await ProductoImagen.destroy({
        where: {
            productoId
        },
        transaction
    });

    if (!imageUrls.length) {
        return;
    }

    const rows = imageUrls.map(
        (imagenUrl, index) => ({
            productoId,
            imagenUrl,
            orden: index + 1
        })
    );

    await ProductoImagen.bulkCreate(
        rows,
        {
            transaction
        }
    );
}


function buildImageInclude() {
    return [
        {
            model: ProductoImagen,
            as: 'imagenes',
            attributes: imageAttributes,
            separate: true,
            order: [
                ['orden', 'ASC'],
                ['id', 'ASC']
            ]
        }
    ];
}


async function listarProductos(
    req,
    res,
    next
) {
    try {
        const {
            buscar,
            disponibles
        } = req.query;

        const where = {};

        if (
            req.allowInactive !== true
        ) {
            where.activo = true;
        }

        if (
            buscar &&
            buscar.trim()
        ) {
            const text =
                buscar.trim();

            where[Op.or] = [
                {
                    nombre: {
                        [Op.like]:
                            `%${text}%`
                    }
                },
                {
                    descripcion: {
                        [Op.like]:
                            `%${text}%`
                    }
                },
                {
                    categoria: {
                        [Op.like]:
                            `%${text}%`
                    }
                },
                {
                    etiqueta: {
                        [Op.like]:
                            `%${text}%`
                    }
                }
            ];
        }

        if (
            disponibles === 'true'
        ) {
            where.stock = {
                [Op.gt]: 0
            };
        }

        const productos =
            await Producto.findAll({
                where,
                attributes,
                include:
                    buildImageInclude(),

                order: [
                    ['orden', 'ASC'],
                    ['id', 'ASC']
                ]
            });

        res.status(200).json({
            ok: true,
            total: productos.length,
            data: productos
        });
    } catch (error) {
        next(error);
    }
}


async function obtenerProducto(
    req,
    res,
    next
) {
    try {
        const id =
            Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        'El ID no es válido'
                });
        }

        const producto =
            await Producto.findByPk(
                id,
                {
                    attributes,
                    include:
                        buildImageInclude()
                }
            );

        if (!producto) {
            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Producto no encontrado'
                });
        }

        res.status(200).json({
            ok: true,
            data: producto
        });
    } catch (error) {
        next(error);
    }
}


async function crearProducto(
    req,
    res,
    next
) {
    const transaction =
        await sequelize.transaction();

    try {
        const validationError =
            validateBody(req.body);

        if (validationError) {
            await transaction.rollback();

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        validationError
                });
        }

        const imageUrls =
            normalizeImageUrls(
                req.body
            );

        if (!imageUrls.length) {
            await transaction.rollback();

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        'Debes agregar al menos una imagen al producto'
                });
        }

        const producto =
            await Producto.create(
                buildPayload(
                    req.body,
                    imageUrls
                ),
                {
                    transaction
                }
            );

        await saveProductImages(
            producto.id,
            imageUrls,
            transaction
        );

        await transaction.commit();

        const productoCreado =
            await Producto.findByPk(
                producto.id,
                {
                    attributes,
                    include:
                        buildImageInclude()
                }
            );

        res.status(201).json({
            ok: true,
            message:
                'Producto creado correctamente',
            data:
                productoCreado
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}


async function actualizarProducto(
    req,
    res,
    next
) {
    const transaction =
        await sequelize.transaction();

    try {
        const id =
            Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            await transaction.rollback();

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        'El ID no es válido'
                });
        }

        const validationError =
            validateBody(req.body);

        if (validationError) {
            await transaction.rollback();

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        validationError
                });
        }

        const producto =
            await Producto.findByPk(
                id,
                {
                    transaction
                }
            );

        if (!producto) {
            await transaction.rollback();

            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Producto no encontrado'
                });
        }

        const imageUrls =
            normalizeImageUrls(
                req.body
            );

        if (!imageUrls.length) {
            await transaction.rollback();

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        'El producto debe tener al menos una imagen'
                });
        }

        await producto.update(
            buildPayload(
                req.body,
                imageUrls
            ),
            {
                transaction
            }
        );

        await saveProductImages(
            producto.id,
            imageUrls,
            transaction
        );

        await transaction.commit();

        const productoActualizado =
            await Producto.findByPk(
                id,
                {
                    attributes,
                    include:
                        buildImageInclude()
                }
            );

        res.status(200).json({
            ok: true,
            message:
                'Producto actualizado',
            data:
                productoActualizado
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}


async function cambiarEstadoProducto(
    req,
    res,
    next
) {
    try {
        const id =
            Number(req.params.id);

        const producto =
            await Producto.findByPk(id);

        if (!producto) {
            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Producto no encontrado'
                });
        }

        producto.activo =
            normalizeBoolean(
                req.body.activo,
                producto.activo
            );

        producto.actualizadoEn =
            new Date();

        await producto.save();

        res.status(200).json({
            ok: true,

            message:
                producto.activo
                    ? 'Producto activado'
                    : 'Producto ocultado',

            data:
                producto
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto
};