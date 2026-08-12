const express = require('express');


const {
    crearLeadWhatsapp
} = require(
    '../controllers/whatsapp-leads.controller'
);


const {
    verificarWebhook,
    recibirWebhook
} = require(
    '../controllers/whatsapp-webhook.controller'
);


const router =
    express.Router();


/*
 * ==========================================================
 * META / WHATSAPP WEBHOOK
 * ==========================================================
 */

router.get(
    '/webhook',
    verificarWebhook
);


router.post(
    '/webhook',
    recibirWebhook
);


/*
 * ==========================================================
 * LEADS GENERADOS DESDE LA WEB
 * ==========================================================
 */

router.post(
    '/leads',
    crearLeadWhatsapp
);


module.exports =
    router;