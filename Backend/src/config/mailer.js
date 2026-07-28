const nodemailer = require('nodemailer');

function getBooleanEnvironmentValue(
    value,
    defaultValue = false
) {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    return String(value)
        .trim()
        .toLowerCase() === 'true';
}

function getRequiredEnvironmentVariable(name) {
    const value = String(
        process.env[name] || ''
    ).trim();

    if (!value) {
        throw new Error(
            `Falta configurar la variable de entorno ${name}`
        );
    }

    return value;
}

function createMailerTransporter() {
    const host = getRequiredEnvironmentVariable(
        'SMTP_HOST'
    );

    const port = Number(
        getRequiredEnvironmentVariable('SMTP_PORT')
    );

    const secure = getBooleanEnvironmentValue(
        process.env.SMTP_SECURE,
        port === 465
    );

    const user = getRequiredEnvironmentVariable(
        'SMTP_USER'
    );

    const password = getRequiredEnvironmentVariable(
        'SMTP_PASSWORD'
    );

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error(
            'SMTP_PORT debe ser un puerto válido'
        );
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,

        auth: {
            user,
            pass: password
        },

        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

module.exports = {
    createMailerTransporter,
    getRequiredEnvironmentVariable
};