const bcrypt = require('bcryptjs');

async function basicAuth(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Basic ')) {
        res.setHeader(
            'WWW-Authenticate',
            'Basic realm="ListoEnLinea API", charset="UTF-8"'
        );

        return res.status(401).json({
            ok: false,
            message: 'Autenticación requerida'
        });
    }

    try {
        const adminEmail = process.env.ADMIN_EMAIL
            ?.trim()
            .toLowerCase();

        /*
         * Hostinger está agregando diagonales antes de los signos $:
         *
         * \$2b\$12\$...
         *
         * Esta sustitución recupera el hash bcrypt original:
         *
         * $2b$12$...
         */
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
            ?.trim()
            .replace(/\\\$/g, '$');

        if (!adminEmail) {
            throw new Error(
                'Falta la variable de entorno ADMIN_EMAIL'
            );
        }

        if (!adminPasswordHash) {
            throw new Error(
                'Falta la variable de entorno ADMIN_PASSWORD_HASH'
            );
        }

        const encodedCredentials = authorizationHeader.slice(6);

        const decodedCredentials = Buffer
            .from(encodedCredentials, 'base64')
            .toString('utf8');

        const separatorIndex = decodedCredentials.indexOf(':');

        if (separatorIndex === -1) {
            throw new Error('Formato de credenciales inválido');
        }

        const receivedEmail = decodedCredentials
            .slice(0, separatorIndex)
            .trim()
            .toLowerCase();

        const receivedPassword = decodedCredentials.slice(
            separatorIndex + 1
        );

        const validEmail = receivedEmail === adminEmail;

        const validPassword = await bcrypt.compare(
            receivedPassword,
            adminPasswordHash
        );

        if (!validEmail || !validPassword) {
            res.setHeader(
                'WWW-Authenticate',
                'Basic realm="ListoEnLinea API", charset="UTF-8"'
            );

            return res.status(401).json({
                ok: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        req.auth = {
            role: 'admin',
            email: adminEmail
        };

        return next();
    } catch (error) {
        console.error(
            'Error en Basic Auth:',
            error.message
        );

        res.setHeader(
            'WWW-Authenticate',
            'Basic realm="ListoEnLinea API", charset="UTF-8"'
        );

        return res.status(401).json({
            ok: false,
            message: 'Credenciales inválidas'
        });
    }
}

module.exports = basicAuth;