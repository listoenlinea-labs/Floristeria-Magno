const express = require('express');

const {
    crearLeadWhatsapp
} = require(
    '../controllers/whatsapp-leads.controller'
);

const router =
    express.Router();


router.post(
    '/leads',
    crearLeadWhatsapp
);


module.exports =
    router;