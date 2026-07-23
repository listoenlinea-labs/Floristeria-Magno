const bcrypt = require('bcryptjs');

async function repartidorAuth(req, res, next) {
    const authorizationHeader =
        req.headers.authorization;

    if (
        !authorizationHeader?.startsWith(
            'Basic '
        )
    ) {
        res.setHeader(
            'WWW-Authenticate',
            'Basic realm="Floristería Magno Repartidor", charset="UTF-8"'
        );

        return res.status(401).json({
            ok: false,
            message:
                'Autenticación de repartidor requerida'
        });
    }

    try {
        const repartidorEmail =
            process.env.REPARTIDOR_EMAIL
                ?.trim()
                .toLowerCase();

        const repartidorPasswordHash =
            process.env.REPARTIDOR_PASSWORD_HASH
                ?.trim()
                .replace(/\\\$/g, '$');

        if (!repartidorEmail) {
            throw new Error(
                'Falta REPARTIDOR_EMAIL'
            );
        }

        if (!repartidorPasswordHash) {
            throw new Error(
                'Falta REPARTIDOR_PASSWORD_HASH'
            );
        }

        const encodedCredentials =
            authorizationHeader.slice(6);

        const decodedCredentials =
            Buffer
                .from(
                    encodedCredentials,
                    'base64'
                )
                .toString('utf8');

        const separatorIndex =
            decodedCredentials.indexOf(':');

        if (separatorIndex === -1) {
            throw new Error(
                'Formato de credenciales inválido'
            );
        }

        const receivedEmail =
            decodedCredentials
                .slice(0, separatorIndex)
                .trim()
                .toLowerCase();

        const receivedPassword =
            decodedCredentials.slice(
                separatorIndex + 1
            );

        const validEmail =
            receivedEmail === repartidorEmail;

        const validPassword =
            await bcrypt.compare(
                receivedPassword,
                repartidorPasswordHash
            );

        if (!validEmail || !validPassword) {
            res.setHeader(
                'WWW-Authenticate',
                'Basic realm="Floristería Magno Repartidor", charset="UTF-8"'
            );

            return res.status(401).json({
                ok: false,
                message:
                    'Usuario o contraseña de repartidor incorrectos'
            });
        }

        /*
         * Información disponible para los
         * controladores posteriores.
         */
        req.auth = {
            role: 'repartidor',
            email: repartidorEmail
        };

        return next();
    } catch (error) {
        console.error(
            'Error en autenticación de repartidor:',
            error.message
        );

        res.setHeader(
            'WWW-Authenticate',
            'Basic realm="Floristería Magno Repartidor", charset="UTF-8"'
        );

        return res.status(401).json({
            ok: false,
            message:
                'Credenciales de repartidor inválidas'
        });
    }
}

module.exports = repartidorAuth;