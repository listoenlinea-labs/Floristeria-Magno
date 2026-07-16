const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        return res.status(401).json({
            ok: false,
            message: 'Token de acceso requerido'
        });
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            ok: false,
            message: 'El token debe enviarse como Bearer'
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256'],
                issuer: 'listoenlinea-api',
                audience: 'listoenlinea-admin'
            }
        );

        req.user = payload;

        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            message:
                error.name === 'TokenExpiredError'
                    ? 'El token ha expirado'
                    : 'Token inválido'
        });
    }
}

module.exports = {
    authenticateToken
};