const bcrypt = require('bcryptjs');

function obtenerCredencialesBasicas(req) {
    const authorizationHeader =
        req.headers.authorization;

    if (
        !authorizationHeader?.startsWith(
            'Basic '
        )
    ) {
        return null;
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
        return null;
    }

    return {
        email: decodedCredentials
            .slice(0, separatorIndex)
            .trim()
            .toLowerCase(),

        password: decodedCredentials.slice(
            separatorIndex + 1
        )
    };
}

function limpiarHash(value) {
    return value
        ?.trim()
        .replace(/\\\$/g, '$');
}

async function credencialesCoinciden({
    receivedEmail,
    receivedPassword,
    expectedEmail,
    expectedPasswordHash
}) {
    if (
        !expectedEmail ||
        !expectedPasswordHash
    ) {
        return false;
    }

    const validEmail =
        receivedEmail ===
        expectedEmail
            .trim()
            .toLowerCase();

    if (!validEmail) {
        return false;
    }

    return bcrypt.compare(
        receivedPassword,
        limpiarHash(expectedPasswordHash)
    );
}

async function adminORepartidorAuth(
    req,
    res,
    next
) {
    try {
        const credentials =
            obtenerCredencialesBasicas(req);

        if (!credentials) {
            res.setHeader(
                'WWW-Authenticate',
                'Basic realm="Floristería Magno Panel", charset="UTF-8"'
            );

            return res.status(401).json({
                ok: false,
                message:
                    'Autenticación requerida'
            });
        }

        const validAdmin =
            await credencialesCoinciden({
                receivedEmail:
                    credentials.email,

                receivedPassword:
                    credentials.password,

                expectedEmail:
                    process.env.ADMIN_EMAIL,

                expectedPasswordHash:
                    process.env
                        .ADMIN_PASSWORD_HASH
            });

        if (validAdmin) {
            req.auth = {
                role: 'admin',
                email: credentials.email
            };

            return next();
        }

        const validRepartidor =
            await credencialesCoinciden({
                receivedEmail:
                    credentials.email,

                receivedPassword:
                    credentials.password,

                expectedEmail:
                    process.env.REPARTIDOR_EMAIL,

                expectedPasswordHash:
                    process.env
                        .REPARTIDOR_PASSWORD_HASH
            });

        if (validRepartidor) {
            req.auth = {
                role: 'repartidor',
                email: credentials.email
            };

            return next();
        }

        res.setHeader(
            'WWW-Authenticate',
            'Basic realm="Floristería Magno Panel", charset="UTF-8"'
        );

        return res.status(401).json({
            ok: false,
            message:
                'Usuario o contraseña incorrectos'
        });
    } catch (error) {
        console.error(
            'Error verificando acceso a entregas:',
            error.message
        );

        return res.status(401).json({
            ok: false,
            message:
                'No fue posible validar las credenciales'
        });
    }
}

module.exports = adminORepartidorAuth;