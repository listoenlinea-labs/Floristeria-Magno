const crypto = require('crypto');

const {
    Op
} = require('sequelize');

const {
    WhatsappLead,
    WhatsappLeadEvento
} = require('../models');


const WEB_REFERENCE_PATTERN =
    /\bWEB-[A-F0-9]{10}\b/i;


function normalizePhone(value) {
    return String(
        value || ''
    ).replace(/\D/g, '');
}


function normalizeText(
    value,
    maxLength = 4000
) {
    return String(
        value ?? ''
    )
        .trim()
        .slice(
            0,
            maxLength
        );
}


function getAttributionDays() {
    const value =
        Number(
            process.env
                .WHATSAPP_ATTRIBUTION_DAYS ||
            30
        );

    if (
        !Number.isFinite(value) ||
        value < 1 ||
        value > 365
    ) {
        return 30;
    }

    return Math.floor(value);
}


/*
 * ==========================================================
 * VERIFICACIÓN INICIAL DEL WEBHOOK
 * ==========================================================
 *
 * Meta hará una llamada GET para comprobar
 * que nosotros controlamos este endpoint.
 */
function verificarWebhook(
    req,
    res
) {
    const mode =
        String(
            req.query['hub.mode'] ||
            ''
        );

    const token =
        String(
            req.query[
            'hub.verify_token'
            ] ||
            ''
        );

    const challenge =
        req.query[
        'hub.challenge'
        ];


    const expectedToken =
        String(
            process.env
                .WHATSAPP_VERIFY_TOKEN ||
            ''
        );


    if (
        !expectedToken
    ) {
        console.error(
            'Falta WHATSAPP_VERIFY_TOKEN'
        );

        return res.sendStatus(
            500
        );
    }


    if (
        mode === 'subscribe' &&
        token === expectedToken
    ) {
        console.log(
            '✅ Webhook WhatsApp verificado por Meta'
        );

        return res
            .status(200)
            .send(
                String(
                    challenge || ''
                )
            );
    }


    console.warn(
        '❌ Intento de verificación de webhook rechazado'
    );


    return res.sendStatus(
        403
    );
}


/*
 * ==========================================================
 * VALIDACIÓN DE FIRMA DE META
 * ==========================================================
 */
function validarFirmaMeta(req) {
    const appSecret =
        String(
            process.env
                .WHATSAPP_APP_SECRET ||
            ''
        ).trim();


    if (!appSecret) {
        throw new Error(
            'Falta WHATSAPP_APP_SECRET'
        );
    }


    const signature =
        String(
            req.headers[
            'x-hub-signature-256'
            ] ||
            ''
        );


    if (
        !signature.startsWith(
            'sha256='
        )
    ) {
        return false;
    }


    if (
        !Buffer.isBuffer(
            req.rawBody
        )
    ) {
        return false;
    }


    const expected =
        'sha256=' +
        crypto
            .createHmac(
                'sha256',
                appSecret
            )
            .update(
                req.rawBody
            )
            .digest(
                'hex'
            );


    const receivedBuffer =
        Buffer.from(
            signature,
            'utf8'
        );

    const expectedBuffer =
        Buffer.from(
            expected,
            'utf8'
        );


    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {
        return false;
    }


    return crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
    );
}


function getMessageText(message) {
    const type =
        String(
            message?.type ||
            ''
        );


    if (
        type === 'text'
    ) {
        return normalizeText(
            message?.text?.body
        );
    }


    if (
        type === 'button'
    ) {
        return normalizeText(
            message?.button?.text
        );
    }


    if (
        type === 'interactive'
    ) {
        return normalizeText(
            message
                ?.interactive
                ?.button_reply
                ?.title ||

            message
                ?.interactive
                ?.list_reply
                ?.title
        );
    }


    return '';
}


function getMediaId(message) {
    const type =
        String(
            message?.type ||
            ''
        );


    const supportedMediaTypes =
        [
            'image',
            'document',
            'video',
            'audio',
            'sticker'
        ];


    if (
        !supportedMediaTypes
            .includes(type)
    ) {
        return null;
    }


    return (
        message?.[type]?.id ||
        null
    );
}


function getWhatsappTimestamp(
    timestamp
) {
    const seconds =
        Number(timestamp);


    if (
        !Number.isFinite(
            seconds
        ) ||
        seconds <= 0
    ) {
        return null;
    }


    return new Date(
        seconds * 1000
    );
}


/*
 * ==========================================================
 * BUSCAR LEAD
 * ==========================================================
 *
 * Orden:
 *
 * 1. Buscar código WEB-XXXXXXXXXX en el mensaje.
 * 2. Si ya conocemos el teléfono,
 *    buscar lead reciente asociado.
 */
async function encontrarLead({
    telefono,
    texto
}) {
    const referenceMatch =
        texto.match(
            WEB_REFERENCE_PATTERN
        );


    if (referenceMatch) {
        const codigo =
            referenceMatch[0]
                .toUpperCase();


        const lead =
            await WhatsappLead.findOne({
                where: {
                    codigo
                }
            });


        if (!lead) {
            return null;
        }


        const telefonoActual =
            normalizePhone(
                lead.telefonoCliente
            );


        /*
         * Protección:
         *
         * Si una referencia ya está ligada
         * a otro teléfono, no la reasignamos.
         */
        if (
            telefonoActual &&
            telefonoActual !==
            telefono
        ) {
            console.warn(
                'Referencia WhatsApp intentó utilizarse desde otro teléfono:',
                codigo
            );

            return null;
        }


        return lead;
    }


    /*
     * No apareció código.
     *
     * Buscamos un lead WEB previamente
     * asociado al teléfono.
     */
    const attributionDays =
        getAttributionDays();


    const createdAfter =
        new Date(
            Date.now() -
            (
                attributionDays *
                24 *
                60 *
                60 *
                1000
            )
        );


    return WhatsappLead.findOne({
        where: {
            telefonoCliente:
                telefono,

            creadoEn: {
                [Op.gte]:
                    createdAfter
            }
        },

        order: [
            [
                'creadoEn',
                'DESC'
            ],
            [
                'id',
                'DESC'
            ]
        ]
    });
}


/*
 * ==========================================================
 * PROCESAR UN MENSAJE DE CLIENTE
 * ==========================================================
 */
async function procesarMensaje({
    message,
    value
}) {
    const externalId =
        normalizeText(
            message?.id,
            200
        );


    if (!externalId) {
        return;
    }


    /*
     * Meta puede reenviar webhooks.
     *
     * Evitamos duplicados.
     */
    const existing =
        await WhatsappLeadEvento.findOne({
            where: {
                externalId
            }
        });


    if (existing) {
        return;
    }


    const telefono =
        normalizePhone(
            message?.from
        );


    if (!telefono) {
        return;
    }


    const tipoMensaje =
        normalizeText(
            message?.type,
            40
        ) || 'unknown';


    const texto =
        getMessageText(
            message
        );


    const lead =
        await encontrarLead({
            telefono,
            texto
        });


    /*
     * MUY IMPORTANTE:
     *
     * Si el mensaje NO pertenece a un lead
     * generado por nuestra web,
     * NO lo almacenamos.
     *
     * Así no guardamos conversaciones
     * ajenas al sistema de atribución.
     */
    if (!lead) {
        return;
    }


    const now =
        new Date();


    const leadUpdate = {};


    if (
        !lead.telefonoCliente
    ) {
        leadUpdate.telefonoCliente =
            telefono;
    }


    if (
        !lead.contactadoEn
    ) {
        leadUpdate.contactadoEn =
            now;
    }


    if (
        lead.estado ===
        'CREADO'
    ) {
        leadUpdate.estado =
            'CONTACTADO';
    }


    if (
        Object.keys(
            leadUpdate
        ).length
    ) {
        await lead.update(
            leadUpdate
        );
    }


    const profileName =
        normalizeText(
            value
                ?.contacts?.[0]
                ?.profile?.name,
            150
        );


    const phoneNumberId =
        normalizeText(
            value
                ?.metadata
                ?.phone_number_id,
            100
        );


    const mediaId =
        getMediaId(
            message
        );


    const whatsappTimestamp =
        getWhatsappTimestamp(
            message?.timestamp
        );


    await WhatsappLeadEvento.create({
        leadId:
            lead.id,

        tipo:
            'WHATSAPP_MESSAGE_RECEIVED',

        externalId,

        telefonoCliente:
            telefono,

        direccion:
            'ENTRANTE',

        tipoMensaje,

        texto:
            texto || null,

        whatsappTimestamp,

        datosJson:
            JSON.stringify({
                profileName:
                    profileName ||
                    null,

                phoneNumberId:
                    phoneNumberId ||
                    null,

                mediaId,

                contextMessageId:
                    message
                        ?.context
                        ?.id ||
                    null
            })
    });


    console.log(
        '✅ Mensaje WhatsApp asociado:',
        {
            lead:
                lead.codigo,

            telefono,

            tipoMensaje,

            externalId
        }
    );
}


/*
 * ==========================================================
 * POST WEBHOOK
 * ==========================================================
 */
async function recibirWebhook(
    req,
    res,
    next
) {
    try {

        /*
         * Rechazamos webhooks que no puedan
         * validarse contra el App Secret.
         */
        if (
            !validarFirmaMeta(req)
        ) {
            console.warn(
                '❌ Firma inválida en webhook WhatsApp'
            );

            return res.sendStatus(
                401
            );
        }


        const body =
            req.body;


        if (
            body?.object !==
            'whatsapp_business_account'
        ) {
            return res.sendStatus(
                200
            );
        }


        const entries =
            Array.isArray(
                body.entry
            )
                ? body.entry
                : [];


        for (
            const entry
            of entries
        ) {
            const changes =
                Array.isArray(
                    entry?.changes
                )
                    ? entry.changes
                    : [];


            for (
                const change
                of changes
            ) {
                if (
                    change?.field !==
                    'messages'
                ) {
                    continue;
                }


                const value =
                    change?.value ||
                    {};


                const messages =
                    Array.isArray(
                        value.messages
                    )
                        ? value.messages
                        : [];


                for (
                    const message
                    of messages
                ) {
                    await procesarMensaje({
                        message,
                        value
                    });
                }
            }
        }


        return res.sendStatus(
            200
        );

    } catch (error) {

        console.error(
            '❌ Error procesando webhook WhatsApp:',
            error
        );


        return next(error);
    }
}


module.exports = {
    verificarWebhook,
    recibirWebhook
};